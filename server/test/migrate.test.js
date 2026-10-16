import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { migrate } from '../src/db.js';

test('a migration runs once and the next file can add a column', function () {
  const dir = mkdtempSync(path.join(tmpdir(), 'lab-migrate-'));
  writeFileSync(path.join(dir, '001_init.sql'), 'CREATE TABLE notes (id INTEGER PRIMARY KEY);');
  const database = new DatabaseSync(':memory:');
  migrate(database, dir);
  migrate(database, dir);
  assert.equal(database.prepare('SELECT COUNT(*) AS n FROM schema_migrations').get().n, 1);
  writeFileSync(path.join(dir, '002_title.sql'), 'ALTER TABLE notes ADD COLUMN title TEXT;');
  migrate(database, dir);
  const columns = database.prepare('PRAGMA table_info(notes)').all().map(function (row) { return row.name; });
  assert.deepEqual(columns, ['id', 'title']);
  assert.equal(database.prepare('SELECT COUNT(*) AS n FROM schema_migrations').get().n, 2);
  database.close();
});
