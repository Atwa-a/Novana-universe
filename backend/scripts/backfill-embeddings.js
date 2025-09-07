
require('dotenv').config();
const mysql = require('mysql2/promise');
const { ChromaClient } = require('chromadb');

const CHROMA_URL = process.env.CHROMA_URL || 'http://127.0.0.1:8000';

function chunkText(str, max = 750) {
  const s = (str || '').replace(/\s+/g, ' ').trim();
  if (!s) return [];
  const out = [];
  for (let i = 0; i < s.length; i += max) out.push(s.slice(i, i + max));
  return out;
}

(async () => {
  // 1) DB
  const db = await mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'novana',
    port: Number(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
  });


  const chroma = new ChromaClient({ path: CHROMA_URL });
  const coll = await chroma.getOrCreateCollection({ name: 'novana_memories' });


  const [rows] = await db.query(`
    SELECT m.id AS memory_id, m.person_id,
           CONCAT_WS(' — ', m.title, m.description) AS text
    FROM memories m
    ORDER BY m.id ASC
  `);

  let total = 0;
  for (const r of rows) {
    const raw = (r.text || '').trim();
    if (!raw) continue;

    const chunks = chunkText(raw);
    if (!chunks.length) continue;

    const ids = [];
    const docs = [];
    const metas = [];

    for (let i = 0; i < chunks.length; i++) {
      const id = `mem_${r.memory_id}_c${i}`;
      ids.push(id);
      docs.push(chunks[i]);
      metas.push({ person_id: r.person_id, memory_id: r.memory_id, chunk_index: i });

      
      await db.query(
        `INSERT IGNORE INTO memory_chunks (person_id, memory_id, text, chunk_index, embedding_key)
         VALUES (?,?,?,?,?)`,
        [r.person_id, r.memory_id, chunks[i], i, id]
      );
    }

    
    await coll.add({ ids, documents: docs, metadatas: metas });
    total += ids.length;
    console.log(`Indexed memory ${r.memory_id} with ${ids.length} chunks`);
  }

  await db.end();
  console.log(`✅ Backfill complete. Total chunks indexed: ${total}`);
})().catch((e) => {
  console.error('❌ Backfill failed:', e.message);
  process.exit(1);
});
