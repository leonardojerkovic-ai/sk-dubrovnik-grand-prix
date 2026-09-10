import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync('supabase/migrations/20260910100000_phase3c_results_workflow.sql', 'utf8');
const guardFix = fs.readFileSync('supabase/migrations/20260910100500_phase3c_results_guard_fix.sql', 'utf8');
const page = fs.readFileSync('app/admin/rezultati/page.js', 'utf8');

test('Phase 3C adds result locking fields', () => {
  assert.match(migration, /results_locked boolean NOT NULL DEFAULT false/);
  assert.match(migration, /results_locked_at timestamptz/);
  assert.match(migration, /results_locked_by uuid/);
});

test('Phase 3C validates rank, score and WDL consistency', () => {
  assert.match(migration, /INVALID_RANK/);
  assert.match(migration, /DUPLICATE_RANK/);
  assert.match(migration, /INVALID_WDL/);
  assert.match(migration, /INVALID_SCORE/);
  assert.match(migration, /INVALID_RATING/);
  assert.match(migration, /REGISTRATION_MISSING/);
});

test('Phase 3C supports server-side save/import and recalculation', () => {
  assert.match(migration, /save_tournament_results/);
  assert.match(migration, /jsonb_array_elements\(p_results\)/);
  assert.match(migration, /calculate_dgp_points/);
  assert.match(page, /save_tournament_results/);
  assert.match(page, /Uvezi CSV/);
});

test('Phase 3C finalization locks results and finishes tournament', () => {
  assert.match(migration, /finalize_tournament_results/);
  assert.match(migration, /results_locked = true/);
  assert.match(migration, /status = 'zavrsen'/);
  assert.match(migration, /results_locked_by = auth\.uid\(\)/);
  assert.match(page, /Završi turnir i zaključaj/);
});

test('Phase 3C prevents direct writes after lock and limits unlock to SUPER_ADMIN', () => {
  assert.match(migration, /tournament_results_write_guard/);
  assert.match(migration, /Rezultati turnira su zaključani/);
  assert.match(guardFix, /IF TG_OP = 'DELETE' THEN RETURN OLD/);
  assert.match(migration, /unlock_tournament_results/);
  assert.match(migration, /is_super_admin\(\)/);
  assert.match(migration, /Samo SUPER_ADMIN može otključati rezultate/);
});

test('Phase 3C admin UI exposes editing, finalization and locked state', () => {
  assert.match(page, /Odaberi turnir/);
  assert.match(page, /Spremi rezultate/);
  assert.match(page, /Rezultati su zaključani/);
  assert.match(page, /SUPER_ADMIN · Otključaj/);
});
