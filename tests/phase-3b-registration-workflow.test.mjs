import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync('supabase/migrations/20260910070000_phase3b_registration_workflow.sql', 'utf8');
const publicPage = fs.readFileSync('app/prijava/page.js', 'utf8');
const adminPage = fs.readFileSync('app/admin/prijave/page.js', 'utf8');

test('Phase 3B migration defines the public registration RPC', () => {
  assert.match(migration, /submit_tournament_registration/);
  assert.match(migration, /published IS DISTINCT FROM true/);
  assert.match(migration, /status IS DISTINCT FROM 'prijave_otvorene'/);
  assert.match(migration, /registration_deadline IS NOT NULL/);
});

test('Phase 3B enforces category eligibility server-side', () => {
  assert.match(migration, /check_tournament_registration_eligibility/);
  assert.match(migration, /AGE_MAX/);
  assert.match(migration, /AGE_MIN/);
  assert.match(migration, /RATING_MAX/);
  assert.match(migration, /CUSTOM/);
  assert.match(migration, /parameter_code = 'GENDER'/);
});

test('Phase 3B prevents duplicates and enforces capacity', () => {
  assert.match(migration, /CREATE UNIQUE INDEX IF NOT EXISTS tournament_registrations_tournament_player_active_idx/);
  assert.match(migration, /status IN \('REGISTERED', 'CONFIRMED'\)/);
  assert.match(migration, /Igrač je već prijavljen na ovaj turnir/);
  assert.match(migration, /Kapacitet turnira je popunjen/);
});

test('Phase 3B status workflow is REGISTERED, CONFIRMED, REJECTED', () => {
  assert.match(migration, /REGISTERED','CONFIRMED','REJECTED/);
  assert.match(migration, /p_status.*CONFIRMED.*REJECTED/s);
  assert.doesNotMatch(adminPage, /statusLabels = \{ REGISTERED: 'Zaprimljena', CONFIRMED: 'Potvrđena', DECLINED:/);
  assert.match(adminPage, /REJECTED: 'Odbijena'/);
});

test('public registration uses the secure RPC instead of direct table INSERT', () => {
  assert.match(publicPage, /supabase\.rpc\('submit_tournament_registration'/);
  assert.doesNotMatch(publicPage, /from\('tournament_registrations'\)\.insert/);
  assert.match(publicPage, /Odaberite igrača/);
});

test('admin registration page exposes confirm/reject/return actions', () => {
  assert.match(adminPage, /updateStatus\(item\.id, 'CONFIRMED'\)/);
  assert.match(adminPage, /updateStatus\(item\.id, 'REJECTED'\)/);
  assert.match(adminPage, /updateStatus\(item\.id, 'REGISTERED'\)/);
});
