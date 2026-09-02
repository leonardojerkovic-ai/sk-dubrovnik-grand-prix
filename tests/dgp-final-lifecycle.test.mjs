import assert from 'node:assert/strict';
import test from 'node:test';
import { FINAL_SLOTS, FINAL_STATUSES, finalStatusIsLocked } from '../lib/dgpRules.js';

function buildSlots(points) {
  return points.slice(0, FINAL_SLOTS).map((qualification_points, i) => ({
    final_slot: i + 1,
    qualification_rank: i + 1,
    qualification_points,
    status: 'QUALIFIED',
  }));
}

function replaceDeclined(slots, declinedSlot, candidates) {
  const current = slots[declinedSlot - 1];
  assert.equal(current.status, 'DECLINED');
  const used = new Set(slots.filter(s => s.status !== 'DECLINED').map(s => s.player_id));
  const replacement = candidates.find(c => !used.has(c.player_id));
  assert.ok(replacement, 'replacement candidate must exist');
  slots[declinedSlot - 1] = {
    ...current,
    player_id: replacement.player_id,
    qualification_rank: replacement.qualification_rank,
    qualification_points: replacement.qualification_points,
    replaced_player_id: current.player_id,
    status: 'REPLACEMENT',
  };
  return slots[declinedSlot - 1];
}

test('Final lifecycle: TOP 8 popunjava točno 8 slotova', () => {
  const slots = buildSlots([460, 400, 389, 340, 285, 220, 162, 108, 58, 20]);
  assert.equal(slots.length, 8);
  assert.deepEqual(slots.map(s => s.qualification_rank), [1,2,3,4,5,6,7,8]);
});

test('Izjednačenje na 8. mjestu ne povećava broj Final slotova', () => {
  const points = [460, 400, 389, 340, 285, 220, 162, 108, 108, 20];
  const ranked = points.map((qualification_points, i) => ({ qualification_rank: i + 1, qualification_points }));
  const slots = ranked.slice(0, FINAL_SLOTS);
  assert.equal(slots.length, 8);
  assert.equal(slots[7].qualification_points, 108);
});

test('DECLINED prelazi u REPLACEMENT iz sljedećeg kvalificiranog kandidata', () => {
  const slots = buildSlots([460,400,389,340,285,220,162,108]).map((s, i) => ({ ...s, player_id: i + 1 }));
  slots[3].status = 'DECLINED';
  const replacement = replaceDeclined(slots, 4, [
    { player_id: 9, qualification_rank: 9, qualification_points: 58 },
    { player_id: 10, qualification_rank: 10, qualification_points: 20 },
  ]);
  assert.equal(replacement.player_id, 9);
  assert.equal(replacement.status, 'REPLACEMENT');
  assert.equal(replacement.replaced_player_id, 4);
});

test('NO_SHOW je zaključan i ne smije biti ponovno zamijenjen', () => {
  const slots = buildSlots([460,400,389,340,285,220,162,108]).map((s, i) => ({ ...s, player_id: i + 1 }));
  slots[0].status = 'NO_SHOW';
  assert.equal(finalStatusIsLocked(slots[0].status), true);
  assert.equal(slots[0].player_id, 1);
});

test('Zaštićeni Final rezultati: CONFIRMED, PLAYED i NO_SHOW', () => {
  for (const status of ['CONFIRMED', 'PLAYED', 'NO_SHOW']) {
    assert.ok(FINAL_STATUSES.includes(status));
    assert.equal(finalStatusIsLocked(status), true);
  }
});
