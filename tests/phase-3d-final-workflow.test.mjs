import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync('supabase/migrations/20260910110000_phase3d_final_workflow.sql','utf8');
const page = fs.readFileSync('app/admin/finale/page.js','utf8');

test('Phase 3D protects Final results', () => {
  assert.match(migration,/final_result_protected boolean NOT NULL DEFAULT false/);
  assert.match(migration,/final_result_protected_at timestamptz/);
  assert.match(migration,/Rezultat Finala je zaštićen/);
  assert.match(migration,/finalize_dgp_final_results/);
});

test('Phase 3D implements general and junior TOP 8 refresh', () => {
  assert.match(migration,/refresh_dgp_final_qualifiers/);
  assert.match(migration,/refresh_dgp_junior_final_qualifiers/);
  assert.match(migration,/FOR v_slot IN 1\.\.8/);
  assert.match(page,/TOP 8/);
});

test('Phase 3D implements confirmation, decline, replacement, no-show and played states', () => {
  for (const value of ['CONFIRMED','DECLINED','REPLACEMENT','NO_SHOW','PLAYED']) assert.match(migration,new RegExp(value));
  assert.match(migration,/DECLINED automatski|p_status = 'DECLINED'/);
  assert.match(migration,/replaced_player_id/);
  assert.match(page,/CONFIRMED/);
  assert.match(page,/DECLINED/);
  assert.match(page,/NO_SHOW/);
  assert.match(page,/PLAYED/);
});

test('Phase 3D final outcome states are protected', () => {
  assert.match(migration,/status IN \('CONFIRMED','PLAYED','NO_SHOW'\)/);
  assert.match(migration,/Rezultati Finala su već zaključani/);
  assert.match(page,/Završi Finale i zaštiti rezultat/);
});
