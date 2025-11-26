// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { db, init } = require('./db');
const path = require('path');

init();

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';
const COOKIE_NAME = process.env.COOKIE_NAME || 'discolor_token';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const app = express();

app.use(bodyParser.json());
app.use(cookieParser());
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
}));

// Passport Google OAuth (optional)
// Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env to enable
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback'
  }, (accessToken, refreshToken, profile, cb) => {
    // profile contains id, emails, displayName
    // We'll upsert user by oauth provider + id
    const oauthId = profile.id;
    const email = (profile.emails && profile.emails[0] && profile.emails[0].value) || null;
    db.get(`SELECT * FROM users WHERE oauth_provider = ? AND oauth_id = ?`, ['google', oauthId], (err, row) => {
      if (err) return cb(err);
      if (row) return cb(null, row);
      const id = uuidv4();
      db.run(`INSERT INTO users (id, email, oauth_provider, oauth_id) VALUES (?, ?, ?, ?)`, [id, email, 'google', oauthId], function(insertErr) {
        if (insertErr) return cb(insertErr);
        db.get(`SELECT * FROM users WHERE id = ?`, [id], (e, newRow) => cb(e, newRow));
      });
    });
  }));

  app.use(passport.initialize());

  app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

  app.get('/auth/google/callback', passport.authenticate('google', { session: false }), (req, res) => {
    // create JWT and redirect back to frontend with cookie set
    const user = req.user;
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      // secure: true, // set in prod with HTTPS
      maxAge: 1000 * 60 * 60 * 24 * 7
    });
    // Redirect to frontend
    res.redirect(FRONTEND_URL);
  });
}

// helper: create jwt cookie
function setTokenCookie(res, payload) {
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    // secure: true in production (HTTPS)
    maxAge: 1000 * 60 * 60 * 24 * 7
  });
}

// middleware: authenticate from cookie
function authMiddleware(req, res, next) {
  const token = req.cookies[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: 'unauthenticated' });
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'invalid token' });
    req.user = decoded;
    next();
  });
}

// --- Auth routes ---
app.post('/auth/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email & password required' });
  const hash = await bcrypt.hash(password, 10);
  const id = uuidv4();
  db.run(`INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)`, [id, email, hash], function(err) {
    if (err) {
      console.error(err);
      return res.status(400).json({ error: 'email already registered' });
    }
    setTokenCookie(res, { id, email });
    res.json({ ok: true, id, email });
  });
});

app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email & password required' });
  db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, row) => {
    if (err) return res.status(500).json({ error: 'server' });
    if (!row || !row.password_hash) return res.status(401).json({ error: 'invalid credentials' });
    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) return res.status(401).json({ error: 'invalid credentials' });
    setTokenCookie(res, { id: row.id, email: row.email });
    res.json({ ok: true, id: row.id, email: row.email });
  });
});

app.post('/auth/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.json({ ok: true });
});

app.get('/auth/me', (req, res) => {
  const token = req.cookies[COOKIE_NAME];
  if (!token) return res.json({ user: null });
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.json({ user: null });
    res.json({ user: decoded });
  });
});

// --- Game API (protected) ---
/*
Endpoints:
GET  /api/levels              -> returns list of levels with completed for this user
GET  /api/levels/:n/state     -> returns board state for level n for this user
POST /api/levels/:n/state     -> save board state for user (body: { board: [[0/1]] })
POST /api/levels/:n/complete  -> mark completed (body: { completed: true })
*/
app.get('/api/levels', authMiddleware, (req, res) => {
  const userId = req.user.id;
  // Prepare basic list 1..100 and fetch completed statuses
  db.all(`SELECT level, completed FROM progress WHERE user_id = ?`, [userId], (err, rows) => {
    if (err) return res.status(500).json({ error: 'db error' });
    const completedMap = {};
    rows.forEach(r => { completedMap[r.level] = !!r.completed; });
    const levels = Array.from({ length: 100 }, (_, i) => ({ n: i + 1, completed: !!completedMap[i + 1] }));
    res.json({ levels });
  });
});

app.get('/api/levels/:n/state', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const n = parseInt(req.params.n, 10);
  if (!n || n < 1 || n > 100) return res.status(400).json({ error: 'invalid level' });
  db.get(`SELECT board_json, completed FROM progress WHERE user_id = ? AND level = ?`, [userId, n], (err, row) => {
    if (err) return res.status(500).json({ error: 'db error' });
    if (!row) {
      // no saved progress yet
      return res.json({ n, rows: n, cols: n, board: null, completed: false });
    }
    res.json({ n, rows: n, cols: n, board: JSON.parse(row.board_json || 'null'), completed: !!row.completed });
  });
});

app.post('/api/levels/:n/state', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const n = parseInt(req.params.n, 10);
  const board = req.body.board || null;
  if (!n || n < 1 || n > 100) return res.status(400).json({ error: 'invalid level' });
  const boardJson = board ? JSON.stringify(board) : null;
  // upsert
  db.run(`
    INSERT INTO progress (user_id, level, board_json, completed)
    VALUES (?, ?, ?, 0)
    ON CONFLICT(user_id, level) DO UPDATE SET board_json = excluded.board_json, updated_at = CURRENT_TIMESTAMP
  `, [userId, n, boardJson], function (err) {
    if (err) return res.status(500).json({ error: 'db error' });
    res.json({ ok: true });
  });
});

app.post('/api/levels/:n/complete', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const n = parseInt(req.params.n, 10);
  if (!n || n < 1 || n > 100) return res.status(400).json({ error: 'invalid level' });
  db.run(`
    INSERT INTO progress (user_id, level, board_json, completed)
    VALUES (?, ?, ?, 1)
    ON CONFLICT(user_id, level) DO UPDATE SET completed = 1, updated_at = CURRENT_TIMESTAMP
  `, [userId, n, JSON.stringify(null)], function (err) {
    if (err) return res.status(500).json({ error: 'db error' });
    res.json({ ok: true });
  });
});

// Serve frontend static (if you build into ../frontend/dist)
const staticPath = path.join(__dirname, '..', 'frontend', 'dist');
if (require('fs').existsSync(staticPath)) {
  app.use(express.static(staticPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server started on ${PORT}`);
});
