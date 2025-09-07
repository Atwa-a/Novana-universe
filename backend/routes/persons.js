
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { authenticate } = require('./auth');
const router = express.Router();

function attachSafeExecute(conn) {
  const orig = conn.execute.bind(conn);
  conn.execute = (sql, params) => {
    const safe = Array.isArray(params) ? params.map(v => (v === undefined ? null : v)) : params;
    return orig(sql, safe);
  };
  return conn;
}

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const n = (v) => (v === undefined ? null : v);
const toId = (v) => {
  const id = Number(v);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const personPhotoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif/;
    const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimeOk = allowed.test(file.mimetype);
    if (extOk && mimeOk) return cb(null, true);
    return cb(new Error('Unsupported file type. Please use JPEG, PNG, or GIF.'));
  },
});

const memoryFileUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const allowedExt = /jpeg|jpg|png|gif|mp3|wav|m4a|mp4|mov|avi/;
    const ext = path.extname(file.originalname).toLowerCase();
    const extOk = allowedExt.test(ext);
    let mimeOk = false;
    if (['.mp3', '.wav', '.m4a'].includes(ext)) {
      mimeOk =
        file.mimetype.startsWith('audio/') ||
        file.mimetype === 'application/octet-stream' ||
        ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/aac', 'audio/mp4'].includes(file.mimetype);
    } else if (['.mp4', '.mov', '.avi'].includes(ext)) {
      mimeOk = file.mimetype.startsWith('video/') || file.mimetype === 'application/octet-stream';
    } else {
      mimeOk = /jpeg|jpg|png|gif/.test(file.mimetype);
    }
    if (extOk && mimeOk) return cb(null, true);
    return cb(new Error(`Unsupported file type: ${file.originalname}. Use JPEG, PNG, GIF, MP3, WAV, M4A, MP4, MOV, or AVI.`));
  },
});

async function processAndSaveImage(buffer, originalName) {
  const filename = `photo-${Date.now()}-${Math.round(Math.random() * 1e9)}.jpg`;
  const filepath = path.join(uploadsDir, filename);
  await sharp(buffer).resize(800, 800, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 80, progressive: true }).toFile(filepath);
  return `/uploads/${filename}`;
}

async function processAndSaveMemoryFile(buffer, originalName, mime) {
  const ext = path.extname(originalName).toLowerCase();
  const filename = `memory-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext || '.bin'}`;
  const filepath = path.join(uploadsDir, filename);
  if (['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) {
    await sharp(buffer).resize(800, 800, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 80, progressive: true }).toFile(filepath);
  } else {
    fs.writeFileSync(filepath, buffer);
  }
  return `/uploads/${filename}`;
}

// ========================== ROUTES ===========================

// Persons list
router.get('/', authenticate, async (req, res, next) => {
  try {
    const pool = req.pool;
    const conn = await pool.getConnection();
    attachSafeExecute(conn);

    const me = n(req.user?.id);
    if (!me) {
      conn.release();
      return res.status(401).json({ error: 'not-authenticated' });
    }

    const params = [me];
    let sql = `
      SELECT DISTINCT p.id, p.name, p.relationship, p.birth_date, p.death_date,
             p.photo, p.created_at, pc.role
      FROM persons p
      INNER JOIN person_collaborators pc ON p.id = pc.person_id
      WHERE pc.user_id = ?
    `;

    if (req.query.search) {
      const term = `%${req.query.search}%`;
      sql += ' AND (p.name LIKE ? OR p.relationship LIKE ?)';
      params.push(term, term);
    }

    sql += ' ORDER BY p.created_at DESC';
    const [rows] = await conn.execute(sql, params);
    conn.release();
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Create person
router.post('/', authenticate, personPhotoUpload.single('photo'), async (req, res, next) => {
  const name = n(req.body?.name);
  const relationship = n(req.body?.relationship || null);
  const birth_date = n(req.body?.birth_date || null);
  const death_date = n(req.body?.death_date || null);

  if (!name) return res.status(400).json({ error: 'Name is required' });

  let photoPath = null;
  try {
    if (req.file) photoPath = await processAndSaveImage(req.file.buffer, req.file.originalname);

    const pool = req.pool;
    const conn = await pool.getConnection();
    attachSafeExecute(conn);

    const me = n(req.user?.id);
    if (!me) {
      conn.release();
      return res.status(401).json({ error: 'not-authenticated' });
    }

    await conn.beginTransaction();

    const [insertRes] = await conn.execute(
      'INSERT INTO persons (user_id, name, relationship, birth_date, death_date, photo) VALUES (?,?,?,?,?,?)',
      [me, name, relationship, birth_date, death_date, photoPath]
    );
    const personId = insertRes.insertId;

    await conn.execute(
      'INSERT INTO person_collaborators (person_id, user_id, role) VALUES (?,?,?)',
      [personId, me, 'owner']
    );

    await conn.commit();
    conn.release();

    res.status(201).json({ id: personId, message: 'Person created successfully', photo: photoPath });
  } catch (err) {
    if (photoPath) {
      const fp = path.join(__dirname, '..', photoPath);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
    next(err);
  }
});

// Get one person + memories
router.get('/:id', authenticate, async (req, res, next) => {
  const personId = toId(req.params.id);
  if (!personId) return res.status(400).json({ error: 'Invalid person ID' });

  try {
    const pool = req.pool;
    const conn = await pool.getConnection();
    attachSafeExecute(conn);

    const me = n(req.user?.id);
    if (!me) {
      conn.release();
      return res.status(401).json({ error: 'not-authenticated' });
    }

    const [access] = await conn.execute(
      'SELECT role FROM person_collaborators WHERE person_id = ? AND user_id = ?',
      [personId, me]
    );
    if (!access.length) {
      conn.release();
      return res.status(403).json({ error: 'No access to this person' });
    }

    const [people] = await conn.execute(
      'SELECT id, name, relationship, birth_date, death_date, photo, created_at FROM persons WHERE id = ?',
      [personId]
    );
    if (!people.length) {
      conn.release();
      return res.status(404).json({ error: 'Person not found' });
    }

    const [memories] = await conn.execute(
      `SELECT id, title, description, type, file_path, date, is_private, created_at
       FROM memories
       WHERE person_id = ?
         AND (is_private = FALSE OR user_id = ?)
       ORDER BY created_at DESC`,
      [personId, me]
    );

    conn.release();
    res.json({ ...people[0], role: access[0].role, memories });
  } catch (err) {
    next(err);
  }
});
// Update person
router.put('/:id', authenticate, personPhotoUpload.single('photo'), async (req, res, next) => {
  const personId = toId(req.params.id);
  if (!personId) return res.status(400).json({ error: 'Invalid person ID' });

  const name = n(req.body?.name);
  const relationship = n(req.body?.relationship || null);
  const birth_date = n(req.body?.birth_date || null);
  const death_date = n(req.body?.death_date || null);

  if (!name) return res.status(400).json({ error: 'Name is required' });

  let newPhotoPath;
  let existingPhoto;

  try {
    const pool = req.pool;
    const conn = await pool.getConnection();
    attachSafeExecute(conn);

    const [rows] = await conn.execute(
      'SELECT id, photo FROM persons WHERE id = ? AND user_id = ?',
      [personId, req.user.id]
    );
    if (!rows.length) {
      conn.release();
      return res.status(404).json({ error: 'Person not found' });
    }

    existingPhoto = rows[0].photo;
    newPhotoPath = existingPhoto;

    if (req.file) {
      newPhotoPath = await processAndSaveImage(req.file.buffer, req.file.originalname);
      if (existingPhoto) {
        const old = path.join(__dirname, '..', existingPhoto);
        if (fs.existsSync(old)) fs.unlinkSync(old);
      }
    }

    await conn.execute(
      `UPDATE persons
       SET name=?, relationship=?, birth_date=?, death_date=?, photo=?
       WHERE id=? AND user_id=?`,
      [name, relationship, birth_date, death_date, newPhotoPath, personId, req.user.id]
    );
    conn.release();

    res.json({ message: 'Person updated successfully', photo: newPhotoPath });
  } catch (err) {
    if (req.file && newPhotoPath && (!existingPhoto || newPhotoPath !== existingPhoto)) {
      const fp = path.join(__dirname, '..', newPhotoPath);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
    next(err);
  }
});

// Delete person
router.delete('/:id', authenticate, async (req, res, next) => {
  const personId = toId(req.params.id);
  if (!personId) return res.status(400).json({ error: 'Invalid person ID' });

  try {
    const pool = req.pool;
    const conn = await pool.getConnection();
    attachSafeExecute(conn);

    const [rows] = await conn.execute(
      'SELECT photo FROM persons WHERE id = ? AND user_id = ?',
      [personId, req.user.id]
    );
    if (!rows.length) {
      conn.release();
      return res.status(404).json({ error: 'Person not found' });
    }

    const personPhoto = rows[0].photo;
    const [memFiles] = await conn.execute('SELECT file_path FROM memories WHERE person_id = ?', [personId]);

    await conn.beginTransaction();
    await conn.execute('DELETE FROM persons WHERE id = ? AND user_id = ?', [personId, req.user.id]);
    await conn.commit();
    conn.release();

    if (personPhoto) {
      const f = path.join(__dirname, '..', personPhoto);
      if (fs.existsSync(f)) fs.unlinkSync(f);
    }
    for (const m of memFiles) {
      if (m.file_path) {
        const f = path.join(__dirname, '..', m.file_path);
        if (fs.existsSync(f)) fs.unlinkSync(f);
      }
    }

    res.json({ message: 'Person deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// Create memory
router.post('/:id/memories', authenticate, memoryFileUpload.single('file'), async (req, res, next) => {
  const personId = toId(req.params.id);
  if (!personId) return res.status(400).json({ error: 'Invalid person ID' });

  const title = n(req.body?.title);
  const description = n(req.body?.description || null);
  const type = n(req.body?.type || null);
  const date = n(req.body?.date || null);
  const is_private = req.body?.is_private === 'true' ? 1 : 0;

  if (!title) return res.status(400).json({ error: 'Title is required' });

  let filePath = null;
  let memoryType = type || 'text';

  try {
    const pool = req.pool;
    const conn = await pool.getConnection();
    attachSafeExecute(conn);

    const [ok] = await conn.execute('SELECT 1 FROM persons WHERE id = ? AND user_id = ?', [personId, req.user.id]);
    if (!ok.length) {
      conn.release();
      return res.status(404).json({ error: 'Person not found or access denied' });
    }

    if (req.file) {
      filePath = await processAndSaveMemoryFile(req.file.buffer, req.file.originalname, req.file.mimetype);
      if (!type) {
        const ext = path.extname(req.file.originalname).toLowerCase();
        if (['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) memoryType = 'photo';
        else if (['.mp4', '.mov', '.avi'].includes(ext)) memoryType = 'video';
        else if (['.mp3', '.wav', '.m4a'].includes(ext)) memoryType = 'audio';
      }
    }

    const [ins] = await conn.execute(
      `INSERT INTO memories (person_id, user_id, title, description, type, file_path, date, is_private)
       VALUES (?,?,?,?,?,?,?,?)`,
      [personId, req.user.id, title, description, memoryType, filePath, date, is_private]
    );
    conn.release();

    res.status(201).json({
      id: ins.insertId,
      message: 'Memory created successfully',
      file_path: filePath,
      type: memoryType,
    });
  } catch (err) {
    if (filePath) {
      const fp = path.join(__dirname, '..', filePath);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
    next(err);
  }
});

// Update memory
router.put('/:id/memories/:memoryId', authenticate, memoryFileUpload.single('file'), async (req, res, next) => {
  const personId = toId(req.params.id);
  const memoryId = toId(req.params.memoryId);
  if (!personId || !memoryId) return res.status(400).json({ error: 'Invalid person or memory ID' });

  const title = n(req.body?.title);
  const description = n(req.body?.description || null);
  const date = n(req.body?.date || null);
  const is_private = req.body?.is_private === 'true' ? 1 : 0;
  let newType = n(req.body?.type || null);

  if (!title) return res.status(400).json({ error: 'Title is required' });

  let newFilePath;
  let existingFilePath;

  try {
    const pool = req.pool;
    const conn = await pool.getConnection();
    attachSafeExecute(conn);

    const [mem] = await conn.execute(
      'SELECT id, file_path, type FROM memories WHERE id = ? AND person_id = ? AND user_id = ?',
      [memoryId, personId, req.user.id]
    );
    if (!mem.length) {
      conn.release();
      return res.status(404).json({ error: 'Memory not found' });
    }

    const existing = mem[0];
    existingFilePath = existing.file_path;
    newFilePath = existing.file_path;

    if (req.file) {
      newFilePath = await processAndSaveMemoryFile(req.file.buffer, req.file.originalname, req.file.mimetype);
      if (!newType) {
        const ext = path.extname(req.file.originalname).toLowerCase();
        if (['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) newType = 'photo';
        else if (['.mp4', '.mov', '.avi'].includes(ext)) newType = 'video';
        else if (['.mp3', '.wav', '.m4a'].includes(ext)) newType = 'audio';
      }
      if (existing.file_path) {
        const old = path.join(__dirname, '..', existing.file_path);
        if (fs.existsSync(old)) fs.unlinkSync(old);
      }
    }
    if (!newType) newType = existing.type;

    await conn.execute(
      `UPDATE memories
       SET title=?, description=?, type=?, file_path=?, date=?, is_private=?
       WHERE id=? AND person_id=? AND user_id=?`,
      [title, description, newType, newFilePath, date, is_private, memoryId, personId, req.user.id]
    );
    conn.release();

    res.json({ message: 'Memory updated successfully', type: newType, file_path: newFilePath });
  } catch (err) {
    if (req.file && newFilePath && (!existingFilePath || newFilePath !== existingFilePath)) {
      const fp = path.join(__dirname, '..', newFilePath);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
    next(err);
  }
});
// Delete memory
router.delete('/:id/memories/:memoryId', authenticate, async (req, res, next) => {
  const personId = toId(req.params.id);
  const memoryId = toId(req.params.memoryId);
  if (!personId || !memoryId) return res.status(400).json({ error: 'Invalid person or memory ID' });

  try {
    const pool = req.pool;
    const conn = await pool.getConnection();
    attachSafeExecute(conn);

    const [mem] = await conn.execute(
      'SELECT file_path FROM memories WHERE id = ? AND person_id = ? AND user_id = ?',
      [memoryId, personId, req.user.id]
    );
    if (!mem.length) {
      conn.release();
      return res.status(404).json({ error: 'Memory not found' });
    }

    const filePath = mem[0].file_path;
    await conn.execute('DELETE FROM memories WHERE id = ? AND person_id = ? AND user_id = ?', [
      memoryId,
      personId,
      req.user.id,
    ]);
    conn.release();

    if (filePath) {
      const f = path.join(__dirname, '..', filePath);
      if (fs.existsSync(f)) fs.unlinkSync(f);
    }
    res.json({ message: 'Memory deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// Comments list
router.get('/:id/memories/:memoryId/comments', authenticate, async (req, res, next) => {
  const personId = toId(req.params.id);
  const memoryId = toId(req.params.memoryId);
  if (!personId || !memoryId) return res.status(400).json({ error: 'Invalid person or memory ID' });

  try {
    const pool = req.pool;
    const conn = await pool.getConnection();
    attachSafeExecute(conn);

    const [mem] = await conn.execute('SELECT id, is_private, user_id FROM memories WHERE id = ? AND person_id = ?', [
      memoryId,
      personId,
    ]);
    if (!mem.length) {
      conn.release();
      return res.status(404).json({ error: 'Memory not found' });
    }
    if (mem[0].is_private && mem[0].user_id !== req.user.id) {
      conn.release();
      return res.status(403).json({ error: 'Forbidden' });
    }

    const [rows] = await conn.execute(
      `SELECT c.id, c.comment_text AS comment, c.created_at, u.username
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.memory_id = ?
       ORDER BY c.created_at ASC`,
      [memoryId]
    );
    conn.release();
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Add comment
router.post('/:id/memories/:memoryId/comments', authenticate, async (req, res, next) => {
  const personId = toId(req.params.id);
  const memoryId = toId(req.params.memoryId);
  if (!personId || !memoryId) return res.status(400).json({ error: 'Invalid person or memory ID' });

  const comment_text = (req.body?.comment_text || '').trim();
  if (!comment_text) return res.status(400).json({ error: 'Comment text is required' });

  try {
    const pool = req.pool;
    const conn = await pool.getConnection();
    attachSafeExecute(conn);

    const [mem] = await conn.execute('SELECT id, is_private, user_id FROM memories WHERE id = ? AND person_id = ?', [
      memoryId,
      personId,
    ]);
    if (!mem.length) {
      conn.release();
      return res.status(404).json({ error: 'Memory not found' });
    }
    if (mem[0].is_private && mem[0].user_id !== req.user.id) {
      conn.release();
      return res.status(403).json({ error: 'Forbidden' });
    }

    const [ins] = await conn.execute('INSERT INTO comments (memory_id, user_id, comment_text) VALUES (?,?,?)', [
      memoryId,
      req.user.id,
      comment_text,
    ]);
    conn.release();
    res.status(201).json({ id: ins.insertId, message: 'Comment added successfully' });
  } catch (err) {
    next(err);
  }
});

// Toggle like
router.post('/:id/memories/:memoryId/like', authenticate, async (req, res, next) => {
  const personId = toId(req.params.id);
  const memoryId = toId(req.params.memoryId);
  if (!personId || !memoryId) return res.status(400).json({ error: 'Invalid person or memory ID' });

  try {
    const pool = req.pool;
    const conn = await pool.getConnection();
    attachSafeExecute(conn);

    const [mem] = await conn.execute('SELECT id, is_private, user_id FROM memories WHERE id = ? AND person_id = ?', [
      memoryId,
      personId,
    ]);
    if (!mem.length) {
      conn.release();
      return res.status(404).json({ error: 'Memory not found' });
    }
    if (mem[0].is_private && mem[0].user_id !== req.user.id) {
      conn.release();
      return res.status(403).json({ error: 'Forbidden' });
    }

    const [likes] = await conn.execute('SELECT id FROM memory_likes WHERE memory_id = ? AND user_id = ?', [
      memoryId,
      req.user.id,
    ]);

    let liked;
    if (!likes.length) {
      await conn.execute('INSERT INTO memory_likes (memory_id, user_id) VALUES (?,?)', [memoryId, req.user.id]);
      liked = true;
    } else {
      await conn.execute('DELETE FROM memory_likes WHERE memory_id = ? AND user_id = ?', [
        memoryId,
        req.user.id,
      ]);
      liked = false;
    }
    conn.release();
    res.json({ liked });
  } catch (err) {
    next(err);
  }
});

// Messages list
router.get('/:id/messages', authenticate, async (req, res, next) => {
  const personId = toId(req.params.id);
  if (!personId) return res.status(400).json({ error: 'Invalid person ID' });

  try {
    const pool = req.pool;
    const conn = await pool.getConnection();
    attachSafeExecute(conn);

    const [access] = await conn.execute('SELECT role FROM person_collaborators WHERE person_id = ? AND user_id = ?', [
      personId,
      req.user.id,
    ]);
    if (!access.length) {
      conn.release();
      return res.status(403).json({ error: 'Forbidden' });
    }

    const [rows] = await conn.execute(
      `SELECT m.id, m.content, m.created_at, u.username
       FROM messages m
       JOIN users u ON m.user_id = u.id
       WHERE m.person_id = ?
       ORDER BY m.created_at ASC`,
      [personId]
    );
    conn.release();
    res.json(rows);
  } catch (err) {
    next(err);
  }
});
// Add a message
router.post('/:id/messages', authenticate, async (req, res, next) => {
  const personId = toId(req.params.id);
  if (!personId) return res.status(400).json({ error: 'Invalid person ID' });

  const content = (req.body?.content || '').trim();
  if (!content) return res.status(400).json({ error: 'Message content is required' });

  try {
    const pool = req.pool;
    const conn = await pool.getConnection();
    attachSafeExecute(conn);

    const [access] = await conn.execute('SELECT role FROM person_collaborators WHERE person_id = ? AND user_id = ?', [
      personId,
      req.user.id,
    ]);
    if (!access.length) {
      conn.release();
      return res.status(403).json({ error: 'Forbidden' });
    }

    const [ins] = await conn.execute('INSERT INTO messages (person_id, user_id, content) VALUES (?,?,?)', [
      personId,
      req.user.id,
      content,
    ]);
    conn.release();
    res.status(201).json({ id: ins.insertId, message: 'Message posted successfully' });
  } catch (err) {
    next(err);
  }
});

// Invite collaborator
router.post('/:id/collaborators', authenticate, async (req, res, next) => {
  const personId = toId(req.params.id);
  if (!personId) return res.status(400).json({ error: 'Invalid person ID' });

  const email = (req.body?.email || '').trim();
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const pool = req.pool;
    const conn = await pool.getConnection();
    attachSafeExecute(conn);

    const [owner] = await conn.execute('SELECT role FROM person_collaborators WHERE person_id = ? AND user_id = ?', [
      personId,
      req.user.id,
    ]);
    if (!owner.length || owner[0].role !== 'owner') {
      conn.release();
      return res.status(403).json({ error: 'Only the owner can invite collaborators' });
    }

    const [users] = await conn.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (!users.length) {
      conn.release();
      return res.status(404).json({ error: 'User not found' });
    }

    const collaboratorId = users[0].id;
    if (collaboratorId === req.user.id) {
      conn.release();
      return res.status(400).json({ error: 'Cannot invite yourself' });
    }

    const [exists] = await conn.execute(
      'SELECT id FROM person_collaborators WHERE person_id = ? AND user_id = ?',
      [personId, collaboratorId]
    );
    if (exists.length) {
      conn.release();
      return res.status(400).json({ error: 'This user is already a collaborator' });
    }

    await conn.execute('INSERT INTO person_collaborators (person_id, user_id, role) VALUES (?,?,?)', [
      personId,
      collaboratorId,
      'collaborator',
    ]);
    conn.release();

    res.status(201).json({ message: 'Collaborator invited successfully' });
  } catch (err) {
    next(err);
  }
});

// List collaborators
router.get('/:id/collaborators', authenticate, async (req, res, next) => {
  const personId = toId(req.params.id);
  if (!personId) return res.status(400).json({ error: 'Invalid person ID' });

  try {
    const pool = req.pool;
    const conn = await pool.getConnection();
    attachSafeExecute(conn);

    const [access] = await conn.execute('SELECT role FROM person_collaborators WHERE person_id = ? AND user_id = ?', [
      personId,
      req.user.id,
    ]);
    if (!access.length) {
      conn.release();
      return res.status(403).json({ error: 'Forbidden' });
    }

    const [rows] = await conn.execute(
      `SELECT u.id, u.username, u.email, pc.role
       FROM person_collaborators pc
       JOIN users u ON pc.user_id = u.id
       WHERE pc.person_id = ?`,
      [personId]
    );
    conn.release();
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
