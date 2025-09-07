
const express = require('express');
const axios = require('axios');
const { ChromaClient } = require('chromadb');
const { authenticate } = require('./auth');

const router = express.Router();

// ---------------------- Config ----------------------
const OLLAMA = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
const CHAT_MODEL = (process.env.AI_CHAT_MODEL || 'llama3:8b').trim();
const FALLBACK_MODELS = (process.env.AI_FALLBACK_MODELS || 'llama3.2:3b,llama3.2:1b')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const CHUNK_TOP_K = 3;
const MAX_CONTEXT_CHARS = 900;
const HISTORY_TURNS = 12;

// Tunables (env)
const LLM_DEADLINE_MS = Number(process.env.AI_DEADLINE_MS || 30000);
const AI_MAX_TOKENS = Number(process.env.AI_MAX_TOKENS || 120);
const AI_KEEP_ALIVE = process.env.AI_KEEP_ALIVE || '15m';

// ---------------------- Helpers ----------------------
function deadline(promise, ms, onTimeoutMsg = 'timeout') {
  let id;
  const timeout = new Promise((_, rej) => (id = setTimeout(() => rej(new Error(onTimeoutMsg)), ms)));
  return Promise.race([promise.finally(() => clearTimeout(id)), timeout]);
}
function explainAxiosError(err) {
  if (err?.response) console.warn('Ollama error', err.response.status, err.response.data);
  else if (err?.request) console.warn('Ollama no-response', err.message);
  else if (err) console.warn('Ollama error', err.message);
}
function isRetryableLLMError(err) {
  if (!err) return true;
  if (String(err.message || '').includes('llm-deadline')) return true;
  if (err.code === 'ECONNABORTED' || err.code === 'ECONNRESET') return true;
  const st = err?.response?.status;
  // 5xx from Ollama, or 404 when model not found
  return st === 404 || (st >= 500 && st < 600);
}
function snippetify(text, maxWords = 24) {
  if (!text) return '';
  const a = String(text).replace(/\s+/g, ' ').trim().split(/\s+/);
  return a.length <= maxWords ? a.join(' ') : a.slice(0, maxWords).join(' ') + '…';
}
const BANNED_OPENERS = ['as an ai', 'thank you for sharing', 'i understand your concern', 'i might need a moment'];
function tidyReply(text, maxWordsCap = 120) {
  if (!text) return '';
  let t = String(text).replace(/\s+/g, ' ').replace(/^["'`]+|["'`]+$/g, '').trim();
  const sentences = t.split(/(?<=[.!?])\s+/).slice(0, 4);
  t = sentences.join(' ');
  const w = t.split(' ');
  if (w.length > maxWordsCap) t = w.slice(0, maxWordsCap).join(' ') + '…';
  const lower = t.toLowerCase();
  for (const ban of BANNED_OPENERS) {
    if (lower.startsWith(ban)) {
      const parts = t.split(/(?<=[.!?])\s+/);
      if (parts.length > 1) t = parts.slice(1).join(' ');
      break;
    }
  }
  return t.trim();
}
function sysPrompt(personName) {
  return `You are Novana, a warm, concise companion reflecting on memories of ${personName}.
- Answer in 2–4 short sentences.
- If the user is vague, ask ONE focused follow-up (not every time).
- Reference at most one short snippet if helpful.
- Never role-play the loved one; speak as a supportive assistant.
- Keep replies specific to the user's message.`;
}
function buildContextBlock(hits) {
  if (!hits?.length) return '';
  const list = hits.slice(0, 2).map((h) => `• ${snippetify(h.text, 20)}`);
  return `Relevant snippets:\n${list.join('\n')}`;
}
function yearsBetween(a, b) {
  let age = b.getFullYear() - a.getFullYear();
  const before = b.getMonth() < a.getMonth() || (b.getMonth() === a.getMonth() && b.getDate() < a.getDate());
  if (before) age--;
  return age;
}
function maybeAnswerAge(msg, personRow) {
  if (!/\bhow old|age\b|birthday|born/i.test(msg)) return null;
  if (!personRow) return `I don’t have their birthday recorded. You can add it on the profile.`;
  const birth = personRow.birth_date ? new Date(personRow.birth_date) : null;
  const death = personRow.death_date ? new Date(personRow.death_date) : null;
  if (!birth || isNaN(birth.getTime())) return `I don’t have ${personRow.name || 'them'}’s birth date yet.`;
  if (death && !isNaN(death.getTime())) {
    const ageAtPassing = yearsBetween(birth, death);
    return `They were ${ageAtPassing} years old (${birth.toISOString().slice(0, 10)} → ${death.toISOString().slice(0, 10)}).`;
  }
  const nowAge = yearsBetween(birth, new Date());
  return `They’d be about ${nowAge} years old (born ${birth.toISOString().slice(0, 10)}).`;
}

// ---------------------- Chroma ----------------------
let chromaClient = null;
function getChromaClient() {
  if (chromaClient) return chromaClient;
  chromaClient = new ChromaClient({ path: process.env.CHROMA_URL || 'http://127.0.0.1:8000' });
  return chromaClient;
}
async function queryChromaByText(chroma, person_id, query) {
  try {
    const coll = await chroma.getOrCreateCollection({ name: 'novana_memories' });
    const res = await coll.query({ queryTexts: [query], nResults: CHUNK_TOP_K, where: { person_id } });
    const out = [];
    const ids = res.ids?.[0] || [];
    const docs = res.documents?.[0] || [];
    const metas = res.metadatas?.[0] || [];
    for (let i = 0; i < ids.length; i++) out.push({ id: ids[i], text: docs[i], meta: metas[i] });
    return out;
  } catch (e) {
    console.warn('Chroma query failed (continuing without RAG):', e.message);
    return [];
  }
}

// ---------------------- Ollama helpers ----------------------
async function listOllamaModels() {
  try {
    const { data } = await axios.get(`${OLLAMA}/api/tags`, { timeout: 4000 });
    // data.models: [{ name: 'llama3.2:3b', ... }]
    const names = new Set((data?.models || []).map((m) => m?.name).filter(Boolean));
    return names;
  } catch (e) {
    explainAxiosError(e);
    return new Set();
  }
}

async function generateChat(model, messages, options = {}) {
  const req = axios.post(
    `${OLLAMA}/api/chat`,
    {
      model,
      messages,
      stream: false,
      options: {
        temperature: 0.6,
        top_p: 0.9,
        top_k: 40,
        repeat_penalty: 1.1,
        num_predict: AI_MAX_TOKENS,
        keep_alive: AI_KEEP_ALIVE,
        ...options,
      },
    },
    { timeout: Math.max(4000, LLM_DEADLINE_MS - 500) }
  );
  const { data } = await deadline(req, LLM_DEADLINE_MS, 'llm-deadline');
  const content = data?.message?.content || data?.response || '';
  return String(content || '').trim();
}

function messagesToPrompt(messages) {
  let sys = '';
  const lines = [];
  for (const m of messages) {
    if (m.role === 'system') {
      sys = m.content;
      continue;
    }
    const tag = m.role === 'assistant' ? 'Assistant' : 'User';
    lines.push(`${tag}: ${m.content}`);
  }
  return `${sys}\n\n${lines.join('\n')}\nAssistant:`;
}

async function generatePrompt(model, prompt, options = {}) {
  const req = axios.post(
    `${OLLAMA}/api/generate`,
    {
      model,
      prompt,
      stream: false,
      options: {
        temperature: 0.6,
        top_p: 0.9,
        top_k: 40,
        repeat_penalty: 1.1,
        num_predict: AI_MAX_TOKENS,
        keep_alive: AI_KEEP_ALIVE,
        ...options,
      },
    },
    { timeout: Math.max(4000, LLM_DEADLINE_MS - 500) }
  );
  const { data } = await deadline(req, LLM_DEADLINE_MS, 'llm-deadline');
  return (data.response || '').trim();
}

async function chatWithModels(messages) {
  const models = [CHAT_MODEL, ...FALLBACK_MODELS];
  const available = await listOllamaModels();
  const errors = [];

  for (const model of models) {
    if (!available.has(model)) {
      errors.push(`model-missing:${model}`);
      continue; // skip to next candidate
    }

    try {
      // try normal chat
      const raw = await generateChat(model, messages);
      const text = tidyReply(raw, 120);
      if (text) return { reply: text, model };
      throw new Error('empty-llm');
    } catch (e1) {
      explainAxiosError(e1);
      if (!isRetryableLLMError(e1)) { errors.push(`${model}:fatal`); continue; }

      try {
        // retry with fewer tokens
        const raw2 = await generateChat(model, messages, {
          num_predict: Math.max(48, Math.floor(AI_MAX_TOKENS / 2)),
          temperature: 0.5,
        });
        const text2 = tidyReply(raw2, 120);
        if (text2) return { reply: text2, model };
        throw new Error('empty-llm-2');
      } catch (e2) {
        explainAxiosError(e2);
        if (!isRetryableLLMError(e2)) { errors.push(`${model}:fatal2`); continue; }

        try {
          // downgrade to /generate prompt-style
          const prompt = messagesToPrompt(messages);
          const raw3 = await generatePrompt(model, prompt, {
            num_predict: Math.max(40, Math.floor(AI_MAX_TOKENS / 3)),
            temperature: 0.5,
          });
          const text3 = tidyReply(raw3, 120);
          if (text3) return { reply: text3, model };
          throw new Error('empty-llm-3');
        } catch (e3) {
          explainAxiosError(e3);
          errors.push(`${model}:${e3?.response?.status || e3?.code || e3?.message}`);
        }
      }
    }
  }

  throw new Error(`all-models-failed: ${errors.join(', ')}`);
}

// Warmup primary model (best-effort); fallback warming is optional
async function warmupOllama() {
  try {
    await axios.get(`${OLLAMA}/api/tags`, { timeout: 3000 });
    await axios.post(
      `${OLLAMA}/api/generate`,
      { model: CHAT_MODEL, prompt: 'hi', stream: false, options: { num_predict: 8, keep_alive: AI_KEEP_ALIVE } },
      { timeout: 15000 }
    );
    console.log(`🤖 Ollama model '${CHAT_MODEL}' warmed up.`);
  } catch (e) {
    explainAxiosError(e);
    console.warn('⚠️ Ollama warmup skipped.');
  }
}
router.warmupOllama = warmupOllama; // expose to index.js

// ---------------------- Routes ----------------------
// History
router.get('/history/:personId', authenticate, async (req, res) => {
  try {
    const person_id = Number(req.params.personId);
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const [rows] = await req.pool.query(
      `SELECT role, content, created_at FROM chat_messages WHERE person_id=? ORDER BY id ASC LIMIT ?`,
      [person_id, limit]
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'history-failed' });
  }
});

// Chat
router.post('/chat', authenticate, async (req, res) => {
  try {
    const pool = req.pool;
    const chroma = req.app.get('chroma') || getChromaClient();
    const { person_id: pidRaw, message } = req.body || {};
    const person_id = Number(pidRaw);
    const user_id = req.user.id;

    if (!person_id || !message || !user_id) {
      return res.status(400).json({ error: 'bad-request', detail: 'person_id, user_id, and message are required' });
    }

    console.log('💬 Chat request:', { user_id, person_id, message });

    const [[personRow]] = await pool.query('SELECT id, name, birth_date, death_date FROM persons WHERE id=?', [person_id]);
    const personName = (personRow && personRow.name) || 'this loved one';

    // Save user turn
    await pool.query(
      `INSERT INTO chat_messages (person_id, user_id, role, content) VALUES (?,?, 'user', ?)`,
      [person_id, user_id, message]
    );

    // Quick deterministic answer
    const quickAge = maybeAnswerAge(message, personRow);
    if (quickAge) {
      const reply = tidyReply(quickAge, 120);
      await pool.query(
        `INSERT INTO chat_messages (person_id, user_id, role, content) VALUES (?,?, 'assistant', ?)`,
        [person_id, user_id, reply]
      );
      return res.json({ reply, citations: [], model_used: 'rule' });
    }

    // RAG (best effort)
    const hits = await queryChromaByText(chroma, person_id, message);
    const contextBlock = buildContextBlock(hits).slice(0, MAX_CONTEXT_CHARS);

    // Recent history
    const [hist] = await pool.query(
      `SELECT role, content FROM chat_messages WHERE person_id=? ORDER BY id DESC LIMIT ?`,
      [person_id, HISTORY_TURNS]
    );
    const recent = [...hist].reverse();

    // Compose chat
    const system = sysPrompt(personName) + (contextBlock ? `\n\n${contextBlock}` : '');
    const messages = [{ role: 'system', content: system }, ...recent.map((r) => ({ role: r.role, content: r.content }))];

    // Generate with fallback across models
    let assistantText, modelUsed;
    try {
      const { reply, model } = await chatWithModels(messages);
      assistantText = reply;
      modelUsed = model;
    } catch (err) {
      explainAxiosError(err);
      assistantText = 'Sorry, I had trouble generating a reply. Could you rephrase that?';
      modelUsed = 'none';
    }

    // Save assistant turn
    await pool.query(
      `INSERT INTO chat_messages (person_id, user_id, role, content) VALUES (?,?, 'assistant', ?)`,
      [person_id, user_id, assistantText]
    );

    res.json({
      reply: assistantText,
      citations: hits.map((h) => ({ memory_id: h.meta?.memory_id, chunk_index: h.meta?.chunk_index })),
      model_used: modelUsed,
    });
  } catch (e) {
    console.error('AI chat error:', e);
    res.status(500).json({ error: 'chat-failed', detail: e.message });
  }
});

module.exports = router;
