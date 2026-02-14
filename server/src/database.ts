import Database from 'better-sqlite3'
import path from 'path'

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/board.db')

const db = new Database(DB_PATH)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK(type IN ('bug', 'verzoek')),
    status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'opgelost', 'getest', 'gearchiveerd')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    author TEXT NOT NULL,
    screenshot TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    author TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
  CREATE INDEX IF NOT EXISTS idx_posts_updated_at ON posts(updated_at);
`)

// Migration: add 'gearchiveerd' status to existing databases
const createSql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='posts'").get() as { sql: string } | undefined
if (createSql && !createSql.sql.includes('gearchiveerd')) {
  db.exec(`
    PRAGMA foreign_keys = OFF;
    BEGIN;
    CREATE TABLE posts_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('bug', 'verzoek')),
      status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'opgelost', 'getest', 'gearchiveerd')),
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      author TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    INSERT INTO posts_new SELECT * FROM posts;
    DROP TABLE posts;
    ALTER TABLE posts_new RENAME TO posts;
    CREATE INDEX IF NOT EXISTS idx_posts_updated_at ON posts(updated_at);
    COMMIT;
    PRAGMA foreign_keys = ON;
  `)
}

// Migration: add screenshot column to existing databases
const columns = db.pragma('table_info(posts)') as { name: string }[]
if (!columns.some(col => col.name === 'screenshot')) {
  db.exec('ALTER TABLE posts ADD COLUMN screenshot TEXT')
}

export default db
