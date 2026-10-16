import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.DATA_DIR || path.join(here, '..', 'data');
mkdirSync(dataDir, { recursive: true });

export function migrate(database, dir) {
  database.exec('PRAGMA foreign_keys = ON');
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    )
  `);
  const applied = new Set(
    database.prepare('SELECT id FROM schema_migrations').all().map(function (row) { return row.id; })
  );
  const files = readdirSync(dir).filter(function (name) { return /^\d+.+\.sql$/.test(name); }).sort();
  const insert = database.prepare('INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)');
  files.forEach(function (name) {
    if (applied.has(name)) return;
    const sql = readFileSync(path.join(dir, name), 'utf8');
    database.exec('BEGIN');
    try {
      database.exec(sql);
      insert.run(name, new Date().toISOString());
      database.exec('COMMIT');
    } catch (error) {
      database.exec('ROLLBACK');
      throw error;
    }
  });
}

export const db = new DatabaseSync(path.join(dataDir, 'lab.sqlite'));
db.exec('PRAGMA journal_mode = WAL');
migrate(db, path.join(here, '..', 'migrations'));
