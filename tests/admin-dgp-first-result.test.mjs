import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const page = await readFile(new URL('../app/admin/dgp/page.js', import.meta.url), 'utf8');

test('admin DGP exposes first-result workflow', () => {
  assert.match(page, /async function addResult\(\)/);
  assert.match(page, /rpc\('import_tournament_results'/);
  assert.match(page, /Dodaj rezultat/);
  assert.match(page, /Prvi rezultat može se dodati/);
});

test('first-result workflow does not depend on an existing result id', () => {
  const addResultStart = page.indexOf('async function addResult()');
  const updateResultStart = page.indexOf('async function updateResult(row)');
  assert.ok(addResultStart >= 0 && updateResultStart > addResultStart);
  const addResultBlock = page.slice(addResultStart, updateResultStart);
  assert.doesNotMatch(addResultBlock, /p_result_id/);
  assert.match(addResultBlock, /p_tournament_id/);
});
