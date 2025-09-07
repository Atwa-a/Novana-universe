const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// ---------------- Helpers ----------------

// Null-safe wrapper so mysql2 never receives `undefined`
function attachSafeExecute(conn) {
  const orig = conn.execute.bind(conn);
  conn.execute = (sql, params) => {
    const safe = Array.isArray(params) ? params.map(v => (v === undefined ? null : v)) : params;
    return orig(sql, safe);
  };
  return conn;
}

// Directory for storing uploaded profile pictures
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer configuration for profile pictures
const profilePicUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif/;
    const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimeOk = allowed.test(file.mimetype);
    if (extOk && mimeOk) return cb(null, true);
    return cb(new Error('Unsupported file type. Use JPEG, PNG, or GIF.'));
  },
});

// Utility to process and save a profile image
async function processAndSaveProfileImage(buffer, originalName) {
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
  const filename = `profile-${uniqueSuffix}.jpg`;
  const filepath = path.join(uploadsDir, filename);
  await sharp(buffer)
    .resize(400, 400, { fit: 'cover' })
    .jpeg({ quality: 80, progressive: true })
    .toFile(filepath);
  return `/uploads/${filename}`;
}

// ---------------- AUTH HELPERS ----------------
function issueToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

function authenticate(req, res, next) {
  try {
    const h = req.headers.authorization || req.headers.Authorization || '';
    let token = null;

    if (h && typeof h === 'string' && h.toLowerCase().startsWith('bearer ')) {
      token = h.slice(7).trim();
    } else if (req.headers['x-access-token']) {
      token = req.headers['x-access-token'];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else if (req.query && req.query.token) {
      token = req.query.token;
    }

    if (!token) return res.status(401).json({ error: 'Access token required' });

    const decoded = jwt.verify(token, JWT_SECRET);

    
    req.user = {
      ...decoded,
      id: decoded.id ?? decoded.userId ?? decoded.user_id ?? decoded.uid ?? decoded.sub ?? null,
      email: decoded.email || null,
    };

    if (!req.user.id) {
      return res.status(401).json({ error: 'Invalid token (no user id)' });
    }

    return next();
  } catch (err) {
    console.error('Auth error:', err.message);
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// ---------------- ROUTES ----------------

// Signup a new user
router.post('/signup', async (req, res, next) => {
  const username = (req.body.username || req.body.name || '').trim();
  const email = (req.body.email || '').trim();
  const password = req.body.password || '';

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const pool = req.pool;
    const conn = await pool.getConnection();
    attachSafeExecute(conn);

    const [existing] = await conn.execute(
      'SELECT id FROM users WHERE email = ? OR username = ?',
      [email, username]
    );
    if (existing.length > 0) {
      conn.release();
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const [result] = await conn.execute(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashed]
    );
    conn.release();

    const token = issueToken({ id: result.insertId, email });

    return res.status(201).json({
      message: 'User created successfully',
      token,
      user: { id: result.insertId, username, email, profile_picture: null },
    });
  } catch (err) {
    return next(err);
  }
});

// Login (accepts email OR username)
router.post('/login', async (req, res, next) => {
  const identifier = (req.body.email || req.body.username || '').trim();
  const password = req.body.password || '';

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Email/username and password are required' });
  }

  try {
    const pool = req.pool;
    const conn = await pool.getConnection();
    attachSafeExecute(conn);

    const [users] = await conn.execute(
      'SELECT * FROM users WHERE email = ? OR username = ? LIMIT 1',
      [identifier, identifier]
    );
    conn.release();

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = issueToken(user);

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        profile_picture: user.profile_picture || null,
      },
    });
  } catch (err) {
    return next(err);
  }
});

// Delete account
router.delete('/me', authenticate, async (req, res, next) => {
  try {
    const pool = req.pool;
    const conn = await pool.getConnection();
    attachSafeExecute(conn);

    await conn.execute('DELETE FROM users WHERE id = ?', [req.user.id]);
    conn.release();
    return res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    return next(err);
  }
});

// Get current user's profile
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const pool = req.pool;
    const conn = await pool.getConnection();
    attachSafeExecute(conn);

    const [rows] = await conn.execute(
      'SELECT id, username, email, profile_picture, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    conn.release();
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    return res.json(rows[0]);
  } catch (err) {
    return next(err);
  }
});

// Update profile
router.put('/me', authenticate, profilePicUpload.single('profile_picture'), async (req, res, next) => {
  const { username, email, password } = req.body;
  let newProfilePic;
  let existingProfilePic;

  try {
    const pool = req.pool;
    const conn = await pool.getConnection();
    attachSafeExecute(conn);

    const [users] = await conn.execute(
      'SELECT id, username, email, profile_picture FROM users WHERE id = ?',
      [req.user.id]
    );
    if (users.length === 0) {
      conn.release();
      return res.status(404).json({ error: 'User not found' });
    }

    existingProfilePic = users[0].profile_picture;
    newProfilePic = existingProfilePic;

    if (req.file) {
      newProfilePic = await processAndSaveProfileImage(req.file.buffer, req.file.originalname);
      if (existingProfilePic) {
        const oldPath = path.join(__dirname, '..', existingProfilePic);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
    }

    const fields = [];
    const params = [];
    if (username && username !== users[0].username) {
      const [others] = await conn.execute(
        'SELECT id FROM users WHERE username = ? AND id <> ?',
        [username, req.user.id]
      );
      if (others.length > 0) {
        conn.release();
        return res.status(400).json({ error: 'Username already in use' });
      }
      fields.push('username = ?');
      params.push(username);
    }
    if (email && email !== users[0].email) {
      const [others] = await conn.execute(
        'SELECT id FROM users WHERE email = ? AND id <> ?',
        [email, req.user.id]
      );
      if (others.length > 0) {
        conn.release();
        return res.status(400).json({ error: 'Email already in use' });
      }
      fields.push('email = ?');
      params.push(email);
    }
    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      fields.push('password = ?');
      params.push(hashed);
    }
    if (req.file) {
      fields.push('profile_picture = ?');
      params.push(newProfilePic);
    }

    if (fields.length > 0) {
      const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
      params.push(req.user.id);
      await conn.execute(sql, params);
    }

    conn.release();
    return res.json({ message: 'Profile updated successfully', profile_picture: newProfilePic });
  } catch (err) {
    if (req.file && newProfilePic && (!existingProfilePic || newProfilePic !== existingProfilePic)) {
      const fp = path.join(__dirname, '..', newProfilePic);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
    return next(err);
  }
});

module.exports = router;
module.exports.authenticate = authenticate;
