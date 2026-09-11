import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (p) => fs.readFileSync(p, 'utf8');

test('Phase 5B ranking history route exists', () => {
  assert.ok(fs.existsSync('app/poredak/povijest/page.js'));
});

test('ranking history uses completed published tournaments and existing results', () => {
  const page = read('app/poredak/povijest/page.js');
  assert.match(page, /eq\('status', 'zavrsen'\)/);
  assert.match(page, /eq\('published', true\)/);
  assert.match(page, /from\('tournament_results'\)/);
  assert.match(page, /points_awarded/);
});

test('ranking history exposes cumulative general and category snapshots', () => {
  const page = read('app/poredak/povijest/page.js');
  assert.match(page, /generalBySeason/);
  assert.match(page, /specialBySeasonCategory/);
  assert.match(page, /Opći GP \+ posebni bodovi iste kategorije/);
  assert.match(page, /cumulative|kumulativ/i);
});

test('current rankings link to ranking history and player profiles', () => {
  const page = read('app/poredak/page.js');
  assert.match(page, /\/poredak\/povijest/);
  assert.match(page, /\/igraci\//);
});
