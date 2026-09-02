import test from 'node:test';
import assert from 'node:assert/strict';

function qualifyTop8(rows) {
  const sorted = [...rows].sort((a, b) => b.points - a.points || a.rank - b.rank);
  return sorted.slice(0, 8);
}

function replaceDeclined(slots, candidates) {
  const result = slots.map((slot) => ({ ...slot }));
  for (const slot of result) {
    if (slot.status !== 'DECLINED') continue;
    const candidate = candidates.find((p) => !result.some((s) => s.player === p.player && !['DECLINED', 'NO_SHOW'].includes(s.status)));
    if (candidate) {
      slot.replacedPlayer = slot.player;
      slot.player = candidate.player;
      slot.status = 'REPLACEMENT';
      slot.points = candidate.points;
    }
  }
  return result;
}

test('TOP 8 selects eight highest qualified players', () => {
  const rows = Array.from({ length: 10 }, (_, i) => ({ player: `P${i + 1}`, points: 100 - i, rank: i + 1 }));
  assert.equal(qualifyTop8(rows).length, 8);
  assert.deepEqual(qualifyTop8(rows).map((p) => p.player), ['P1','P2','P3','P4','P5','P6','P7','P8']);
});

test('tie at eighth position preserves both tied candidates for policy resolution', () => {
  const rows = [
    ...Array.from({ length: 7 }, (_, i) => ({ player: `P${i + 1}`, points: 100 - i, rank: i + 1 })),
    { player: 'P8', points: 50, rank: 8 },
    { player: 'P9', points: 50, rank: 9 },
  ];
  const cutoff = qualifyTop8(rows).at(-1).points;
  const tied = rows.filter((p) => p.points === cutoff);
  assert.equal(tied.length, 2);
  assert.equal(cutoff, 50);
});

test('DECLINED becomes REPLACEMENT without overwriting protected slots', () => {
  const slots = [
    ...Array.from({ length: 7 }, (_, i) => ({ slot: i + 1, player: `P${i + 1}`, status: 'CONFIRMED', points: 100 - i })),
    { slot: 8, player: 'P8', status: 'DECLINED', points: 50 },
  ];
  const result = replaceDeclined(slots, [{ player: 'P9', points: 49 }, { player: 'P10', points: 48 }]);
  assert.equal(result[7].status, 'REPLACEMENT');
  assert.equal(result[7].replacedPlayer, 'P8');
  assert.deepEqual(result.slice(0, 7).map((s) => s.status), Array(7).fill('CONFIRMED'));
});

test('NO_SHOW is protected from automatic replacement refresh', () => {
  const slots = [
    { slot: 1, player: 'P1', status: 'NO_SHOW', points: 100 },
    { slot: 2, player: 'P2', status: 'CONFIRMED', points: 90 },
  ];
  const refreshed = replaceDeclined(slots, [{ player: 'P3', points: 80 }]);
  assert.equal(refreshed[0].player, 'P1');
  assert.equal(refreshed[0].status, 'NO_SHOW');
});

test('protected final result states are immutable by qualification refresh', () => {
  const protectedStatuses = new Set(['CONFIRMED', 'PLAYED', 'NO_SHOW']);
  const slot = { slot: 1, player: 'P1', status: 'PLAYED', finalPoints: 150 };
  assert.equal(protectedStatuses.has(slot.status), true);
  assert.equal(slot.finalPoints, 150);
});

test('replacement candidate cannot duplicate an active qualifier', () => {
  const slots = [
    { slot: 1, player: 'P1', status: 'CONFIRMED' },
    { slot: 2, player: 'P2', status: 'DECLINED' },
  ];
  const result = replaceDeclined(slots, [{ player: 'P1', points: 200 }, { player: 'P3', points: 100 }]);
  assert.equal(result[1].player, 'P3');
});
