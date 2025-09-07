
const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');
const { ChromaClient } = require('chromadb');
const { performanceMiddleware } = require('./utils/performance');

// Load env
dotenv.config();

// ---- Config helpers -------------------------------------------------------
function parseNumber(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}


const PORT = parseNumber(process.env.PORT, 5000);
const DEFAULT_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
];
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
const ORIGIN_WHITELIST = new Set([...DEFAULT_ORIGINS, ...ALLOWED_ORIGINS]);

function corsOrigin(origin, cb) {
  // When `origin` is undefined (same-origin or curl), allow it
  if (!origin) return cb(null, true);
  if (ORIGIN_WHITELIST.has(origin)) return cb(null, true);
  // Block unknown origins in production, but log for visibility in dev
  console.warn(`CORS blocked origin: ${origin}`);
  return cb(new Error('Not allowed by CORS'));
}

async function createApp() {
  // MySQL pool
  const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'novana',
    port: parseNumber(process.env.DB_PORT, 3306),
    waitForConnections: true,
    connectionLimit: 20,
    queueLimit: 0,
    charset: 'utf8mb4',
    compress: true,
    multipleStatements: false,
  });

  // Test DB
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    console.log('✅ Connected to MySQL database');
    setInterval(() => {
      console.log(
        `📊 DB Pool Status: ${pool.pool.config.connectionLimit} total, ${pool.pool._allConnections.length} active, ${pool.pool._freeConnections.length} free`
      );
    }, 300000);
  } catch (err) {
    console.error('❌ Unable to connect to MySQL:', err.message);
    process.exit(1);
  }
  // Ensure critical columns exist to avoid runtime 500s
async function ensureSchema(pool) {
  // add memories.description if missing
  const [rows] = await pool.query(`
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'memories'
      AND COLUMN_NAME = 'description'
  `);
  if (rows.length === 0) {
    console.log('🛠️ Adding memories.description ...');
    await pool.query(`ALTER TABLE memories ADD COLUMN description TEXT NULL AFTER title`);
    console.log('✅ Added memories.description');
  }
}
await ensureSchema(pool);


  // Chroma client (vector DB)
  const chroma = new ChromaClient({
    path: process.env.CHROMA_URL || 'http://127.0.0.1:8000',
  });
  try {
    await chroma.getOrCreateCollection({ name: 'novana_memories' });
    console.log('✅ Chroma collection ready: novana_memories');
  } catch (e) {
    
    console.error('❌ Chroma init failed:', e.message);
  }

  const app = express();

  // Middleware
  app.use(
    cors({
      origin: corsOrigin, 
      credentials: true,
    })
  );
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(performanceMiddleware);

  // Static uploads
  app.use(
    '/uploads',
    express.static(path.join(__dirname, 'uploads'), {
      maxAge: '1d',
      etag: true,
    })
  );

  // Attach handles
  app.use((req, _res, next) => {
    req.pool = pool;
    next();
  });
  app.set('chroma', chroma);

  // Routes
  const authRoutes = require('./routes/auth');
  const personRoutes = require('./routes/persons');
  const aiRoutes = require('./routes/ai');

  app.use('/api/auth', authRoutes);
  app.use('/api/persons', personRoutes);
  app.use('/api/ai', aiRoutes);

  // ✅ Warm up Ollama so first chat doesn’t time out
    if (typeof aiRoutes.warmupOllama === 'function') {
      aiRoutes.warmupOllama().catch((e) =>
    console.warn('Ollama warmup failed:', e?.message || e)
  );
}

  // Health
  app.get('/health', (_req, res) => {
    res.json({
      status: 'OK',
      message: 'Novana API is running',
      timestamp: new Date().toISOString(),
      dbPool: {
        total: pool.pool.config.connectionLimit,
        active: pool.pool._allConnections.length,
        free: pool.pool._freeConnections.length,
      },
    });
  });

  // Error handler
  app.use((err, _req, res, _next) => {
    console.error('Error:', err);
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File too large. Maximum size is 5MB.' });
    }
    if (
      err.message === 'Unsupported file type. Use JPEG, PNG, or GIF.' ||
      err.message === 'Unsupported file type. Please use JPEG, PNG, or GIF.'
    ) {
      return res.status(400).json({ error: err.message });
    }
    if (err.message && /CORS/i.test(err.message)) {
      return res.status(403).json({ error: 'CORS blocked this origin' });
    }
    res.status(err.status || 500).json({
      error: err.message || 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  });

  return app;
}

// Boot server
createApp()
  .then(app => {
    app.listen(PORT, () => {
      console.log(`🚀 Novana API server running on http://localhost:${PORT}`);
      console.log(`📡 Health check http://localhost:${PORT}/health`);
    });
  })
  .catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
