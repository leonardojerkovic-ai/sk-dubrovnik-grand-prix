import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('public results route exists and exposes published completed tournaments', () => {
  const source = read('app/rezultati/page.js');
  assert.match(source, /from\('tournaments'\)/);
  assert.match(source, /\.eq\('published', true\)/);
  assert.match(source, /\.eq\('status', 'zavrsen'\)/);
  assert.match(source, /tournament_results/);
});

test('public tournament pages have explicit unavailable-data handling', () => {
  const source = read('app/turniri/page.js');
  assert.match(source, /Trenutačno nema nadolazećih turnira/);
  assert.match(source, /Turniri trenutačno nisu dostupni/);
  const detail = read('app/turniri/[id]/page.js');
  assert.match(detail, /notFound\(\)/);
});

test('public rankings keep error and empty states', () => {
  const source = read('app/dgp/page.js');
  assert.match(source, /Poredak trenutačno nije dostupan/);
  assert.match(source, /Još nema evidentiranih rezultata/);
});

test('production test script covers all test files', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.scripts.test, 'node --test tests/*.test.mjs');
});
