import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { acceptProgress, parseActivities, streakCount } from '../src/activities.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const source = readFileSync(path.join(root, 'js/learn.js'), 'utf8');
const catalog = parseActivities(source);

test('lesson catalog includes the first LED steps and quiz checks', function () {
  assert.equal(catalog.xp['Cpt-meet'], 5);
  assert.equal(catalog.xp.L1, 10);
  assert.equal(catalog.xp['Pred-meet'], 15);
  assert.equal(catalog.xp['Sim-meet'], 25);
  assert.equal(catalog.xp.Q1, 10);
  assert.equal(catalog.xp.P1, 50);
  assert.deepEqual(catalog.categories.meet, ['Cpt-meet', 'L1', 'Pred-meet', 'Sim-meet']);
  assert.ok(catalog.levels.foundations.includes('meet'));
  assert.ok(catalog.categories['q-power'].includes('Q1'));
});

test('client XP is ignored and unknown activities are dropped', function () {
  const result = acceptProgress(catalog, {
    items: [{ id: 'L1', xp: 99999 }, { id: 'not-real', xp: 50 }],
    xp: 500000
  }, [], '2026-10-16');
  assert.deepEqual(result.grants, [{ id: 'L1', xp: 10 }]);
});

test('category and level bonuses wait until the real steps are done', function () {
  const early = acceptProgress(catalog, { items: [{ id: 'cat:meet' }, { id: 'lvl:foundations' }] }, [], '2026-10-16');
  assert.deepEqual(early.grants, []);

  const done = acceptProgress(catalog, {
    items: [
      { id: 'Cpt-meet' },
      { id: 'L1' },
      { id: 'Pred-meet' },
      { id: 'Sim-meet' },
      { id: 'cat:meet' },
      { id: 'lvl:foundations' }
    ]
  }, [], '2026-10-16');
  assert.deepEqual(done.grants.map(function (row) { return row.id; }), [
    'Cpt-meet', 'L1', 'Pred-meet', 'Sim-meet', 'cat:meet'
  ]);
  assert.equal(done.grants[4].xp, 100);
});

test('a finished level can be claimed once its topics are already stored', function () {
  const owned = catalog.levels.foundations.flatMap(function (catId) {
    return catalog.categories[catId].concat(['cat:' + catId]);
  });
  const result = acceptProgress(catalog, { solved: ['lvl:foundations'] }, owned, '2026-10-16');
  assert.deepEqual(result.grants, [{ id: 'lvl:foundations', xp: 250 }]);
});

test('future days are not stored and a streak counts back from today', function () {
  const result = acceptProgress(catalog, { days: ['2026-10-16', '2026-10-17', 'nope'] }, [], '2026-10-16');
  assert.deepEqual(result.days, ['2026-10-16']);
  assert.equal(streakCount(['2026-10-14', '2026-10-15', '2026-10-16'], '2026-10-16'), 3);
  assert.equal(streakCount(['2026-10-14'], '2026-10-16'), 0);
  assert.equal(streakCount(['2026-10-15'], '2026-10-16'), 1);
});
