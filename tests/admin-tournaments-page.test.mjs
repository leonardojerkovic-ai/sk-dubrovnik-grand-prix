import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const page = fs.readFileSync(new URL('../app/admin/turniri/page.js', import.meta.url), 'utf8');

test('Phase 3A admin tournament page exposes required operations', () => {
  for (const marker of [
    "supabase.from('tournaments')",
    "supabase.from('seasons')",
    'validateForm',
    'startCreate',
    'startEdit',
    'saveTournament',
    'togglePublished',
    'deleteTournament',
    'Sve sezone',
    'Svi statusi',
    'Sve kategorije',
    'Sve faze',
  ]) assert.match(page, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('Phase 3A validates date, deadline and capacity fields', () => {
  assert.match(page, /Datum završetka ne može biti prije početka/);
  assert.match(page, /Rok prijave mora biti prije početka turnira/);
  assert.match(page, /Maksimalan broj igrača mora biti cijeli broj/);
  assert.match(page, /Broj kola mora biti cijeli broj/);
});
