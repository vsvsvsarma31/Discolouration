// db.js - simple sqlite wrapper to create/open DB and prepare tables
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const DB_PATH = path.join(__dirname, 'discoloration.sqlite');

const db = new sqlite3.Database(DB_PATH);

function init() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      password_hash TEXT,
      oauth_provider TEXT,
      oauth_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      level INTEGER,
      board_json TEXT,
      completed INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, level),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);
  });
}

module.exports = { db, init };
