
import axios from 'axios';

// Base URL (frontend/.env -> VITE_API_BASE=http://127.0.0.1:4000/api)
export const API_BASE = (import.meta.env.VITE_API_BASE ?? 'http://127.0.0.1:4000/api');

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Bearer from localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) (config.headers as any).Authorization = `Bearer ${token}`;
  return config;
});

// Global handling
api.interceptors.response.use(
  (r) => r,
  (err) => {
    const s = err?.response?.status;
    if (s === 401 || s === 403) {
      
      localStorage.removeItem('token');
      const p = window.location.pathname;
      if (!p.startsWith('/login') && !p.startsWith('/signup')) window.location.replace('/login');
    }
    if ((err as any).code === 'ECONNABORTED') throw new Error('Request timed out. Please try again.');
    throw err;
  }
);

// ---- guards ----
function looksLikeJwt(v: unknown): boolean {
  return typeof v === 'string' && /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(v);
}
function asId(v: unknown, label: string): number {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0 || looksLikeJwt(v)) {
    throw new Error(`${label} is invalid (expected numeric id).`);
  }
  return n;
}

// ===== AI =====
export async function getAiHistory(personId: number) {
  const pid = asId(personId, 'personId');
  const res = await api.get(`/ai/history/${pid}`);
  return res.data;
}
export async function sendAiMessage(personId: number, message: string) {
  const pid = asId(personId, 'personId');
  const res = await api.post('/ai/chat', { person_id: pid, message });
  return res.data;
}

// ===== Files =====
export function getFileUrl(filePath: string | null | undefined): string | null {
  if (!filePath) return null;
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) return filePath;
  const base = API_BASE.replace('/api', '');
  return `${base}${filePath}`;
}

// ===== Auth =====
export async function login(identifier: string, password: string) {
  const body: any = { password };
  if (identifier.includes('@')) body.email = identifier; else body.username = identifier;
  const res = await api.post('/auth/login', body);
  const data = res.data;
  if (data?.token) localStorage.setItem('token', data.token);
  return data; // { token, user }
}
export async function signup(usernameOrName: string, email: string, password: string) {
  const res = await api.post('/auth/signup', { username: usernameOrName, email, password });
  const data = res.data;
  if (data?.token) localStorage.setItem('token', data.token);
  return data;
}
export async function getProfile() { const r = await api.get('/auth/me'); return r.data; }
export async function deleteAccount() { const r = await api.delete('/auth/me'); return r.data; }

// ===== Persons =====
export async function getPersons() { const r = await api.get('/persons'); return r.data; }
export async function createPerson(data: FormData) {
  const r = await api.post('/persons', data, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000 });
  return r.data;
}
export async function getPerson(id: number) {
  const pid = asId(id, 'personId');
  const r = await api.get(`/persons/${pid}`);
  return r.data;
}
export async function deletePerson(personId: number) {
  const pid = asId(personId, 'personId');
  const r = await api.delete(`/persons/${pid}`);
  return r.data;
}

// ===== Memories =====
export async function createMemory(personId: number, data: FormData) {
  const pid = asId(personId, 'personId');
  const r = await api.post(`/persons/${pid}/memories`, data, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000 });
  return r.data;
}
export async function deleteMemory(personId: number, memoryId: number) {
  const pid = asId(personId, 'personId');
  const mid = asId(memoryId, 'memoryId');
  const r = await api.delete(`/persons/${pid}/memories/${mid}`);
  return r.data;
}

// ===== Messages/Collab =====
export async function getMessages(personId: number) { const pid = asId(personId, 'personId'); const r = await api.get(`/persons/${pid}/messages`); return r.data; }
export async function postMessage(personId: number, content: string) { const pid = asId(personId, 'personId'); const r = await api.post(`/persons/${pid}/messages`, { content }); return r.data; }
export async function inviteCollaborator(personId: number, email: string) { const pid = asId(personId, 'personId'); const r = await api.post(`/persons/${pid}/collaborators`, { email }); return r.data; }
export async function getCollaborators(personId: number) { const pid = asId(personId, 'personId'); const r = await api.get(`/persons/${pid}/collaborators`); return r.data; }
