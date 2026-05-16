const Database = require('better-sqlite3');
const path = require('path');

// Connect to SQLite database
const db = new Database(path.join(__dirname, 'eventra.db'), { verbose: console.log });

// Create Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('user', 'host', 'admin')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    date TEXT NOT NULL,
    host_id INTEGER,
    FOREIGN KEY(host_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT NOT NULL,
    user_name TEXT,
    event_title TEXT NOT NULL,
    event_date TEXT NOT NULL,
    notified BOOLEAN DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS tickets (
    id TEXT PRIMARY KEY,
    user_email TEXT NOT NULL,
    user_name TEXT,
    event_id TEXT NOT NULL,
    event_title TEXT NOT NULL,
    event_date TEXT NOT NULL,
    event_location TEXT,
    scanned BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

module.exports = db;
