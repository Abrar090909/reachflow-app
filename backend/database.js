import initSqlJs from 'sql.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'reachflow.db');

let db;

// Wrapper to make sql.js feel like better-sqlite3 API
class Database {
  constructor(sqlDb) {
    this._db = sqlDb;
  }

  prepare(sql) {
    const self = this;
    return {
      run(...params) {
        self._db.run(sql, params);
        self._save();
        const info = self._db.getRowsModified();
        // Get last insert rowid
        const lastId = self._db.exec('SELECT last_insert_rowid() as id');
        return { changes: info, lastInsertRowid: lastId[0]?.values[0]?.[0] || 0 };
      },
      get(...params) {
        const stmt = self._db.prepare(sql);
        stmt.bind(params);
        if (stmt.step()) {
          const cols = stmt.getColumnNames();
          const vals = stmt.get();
          stmt.free();
          const row = {};
          cols.forEach((c, i) => row[c] = vals[i]);
          return row;
        }
        stmt.free();
        return undefined;
      },
      all(...params) {
        const results = [];
        const stmt = self._db.prepare(sql);
        stmt.bind(params);
        while (stmt.step()) {
          const cols = stmt.getColumnNames();
          const vals = stmt.get();
          const row = {};
          cols.forEach((c, i) => row[c] = vals[i]);
          results.push(row);
        }
        stmt.free();
        return results;
      }
    };
  }

  exec(sql) {
    this._db.run(sql);
    this._save();
  }

  pragma(str) {
    try { this._db.run(`PRAGMA ${str}`); } catch (e) { /* ignore */ }
  }

  transaction(fn) {
    return (...args) => {
      this._db.run('BEGIN TRANSACTION');
      try {
        const result = fn(...args);
        this._db.run('COMMIT');
        this._save();
        return result;
      } catch (err) {
        this._db.run('ROLLBACK');
        throw err;
      }
    };
  }

  _save() {
    const data = this._db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

export async function initDatabase() {
  const SQL = await initSqlJs();
  
  let sqlDb;
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    sqlDb = new SQL.Database(fileBuffer);
  } else {
    sqlDb = new SQL.Database();
  }
  
  db = new Database(sqlDb);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Create all tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS email_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      provider TEXT NOT NULL,
      smtp_host TEXT,
      smtp_port INTEGER,
      smtp_user TEXT,
      smtp_pass TEXT,
      oauth_access_token TEXT,
      oauth_refresh_token TEXT,
      daily_send_limit INTEGER DEFAULT 40,
      sent_today INTEGER DEFAULT 0,
      warmup_enabled INTEGER DEFAULT 0,
      warmup_stage INTEGER DEFAULT 0,
      health_score INTEGER DEFAULT 100,
      last_warmup_at DATETIME,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      from_name TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      follow_up_1_subject TEXT,
      follow_up_1_body TEXT,
      follow_up_1_delay_days INTEGER DEFAULT 3,
      follow_up_2_subject TEXT,
      follow_up_2_body TEXT,
      follow_up_2_delay_days INTEGER DEFAULT 5,
      daily_limit INTEGER DEFAULT 50,
      sent_count INTEGER DEFAULT 0,
      reply_count INTEGER DEFAULT 0,
      open_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      started_at DATETIME,
      completed_at DATETIME
    );
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER,
      first_name TEXT,
      last_name TEXT,
      email TEXT NOT NULL,
      company TEXT,
      website TEXT,
      custom_1 TEXT,
      custom_2 TEXT,
      status TEXT DEFAULT 'pending',
      sent_at DATETIME,
      opened_at DATETIME,
      replied_at DATETIME,
      follow_up_1_sent_at DATETIME,
      follow_up_2_sent_at DATETIME,
      assigned_account_id INTEGER,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
      FOREIGN KEY (assigned_account_id) REFERENCES email_accounts(id)
    );
    CREATE TABLE IF NOT EXISTS sent_emails (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER,
      campaign_id INTEGER,
      account_id INTEGER,
      subject TEXT,
      body TEXT,
      email_type TEXT,
      message_id TEXT,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (lead_id) REFERENCES leads(id)
    );
    CREATE TABLE IF NOT EXISTS inbox (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER,
      campaign_id INTEGER,
      account_id INTEGER,
      from_email TEXT,
      from_name TEXT,
      subject TEXT,
      body TEXT,
      is_read INTEGER DEFAULT 0,
      received_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed admin user
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'changeme123';
  const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(adminUsername);
  if (!existingUser) {
    const hash = bcrypt.hashSync(adminPassword, 10);
    db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(adminUsername, hash);
    console.log(`[DB] Admin user "${adminUsername}" created.`);
  }

  return db;
}

export function getDb() {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.');
  return db;
}

export default { initDatabase, getDb };
