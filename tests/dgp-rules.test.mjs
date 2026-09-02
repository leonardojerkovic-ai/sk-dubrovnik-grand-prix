import assert from 'node:assert/strict';
import test from 'node:test';
import { DGP_CATEGORIES, FINAL_SLOTS, FINAL_STATUSES, ageBySeasonYear, isCategoryEligible, finalStatusIsLocked } from '../lib/dgpRules.js';

test('DGP ima svih 8 ljestvica', () => assert.equal(DGP_CATEGORIES.length, 8));
test('TOP 8 je točno 8 slotova', () => assert.equal(FINAL_SLOTS, 8));
test('FINAL statusi sadrže replacement i no-show', () => {
  assert.ok(FINAL_STATUSES.includes('DECLINED'));
  assert.ok(FINAL_STATUSES.includes('REPLACEMENT'));
  assert.ok(FINAL_STATUSES.includes('NO_SHOW'));
});

test('dob se računa kao godina sezone minus godište', () => assert.equal(ageBySeasonYear(2015, 2027), 12));
test('U12 uključuje točno granicu 12', () => assert.equal(isCategoryEligible('U12', { birth_year: 2015 }, 2027, 1500), true));
test('U12 odbija 13 godina', () => assert.equal(isCategoryEligible('U12', { birth_year: 2014 }, 2027, 1500), false));
test('U16 uključuje 16 godina', () => assert.equal(isCategoryEligible('U16', { birth_year: 2011 }, 2027, 1500), true));
test('U20 uključuje 20 godina', () => assert.equal(isCategoryEligible('U20', { birth_year: 2007 }, 2027, 1500), true));
test('S50 uključuje točno 50 godina', () => assert.equal(isCategoryEligible('S50', { birth_year: 1977 }, 2027, 1500), true));
test('S50 odbija 49 godina', () => assert.equal(isCategoryEligible('S50', { birth_year: 1978 }, 2027, 1500), false));
test('S65 uključuje točno 65 godina', () => assert.equal(isCategoryEligible('S65', { birth_year: 1962 }, 2027, 1500), true));
test('S65 odbija 64 godine', () => assert.equal(isCategoryEligible('S65', { birth_year: 1963 }, 2027, 1500), false));
test('U1800 uključuje rejting ispod 1800', () => assert.equal(isCategoryEligible('U1800', { birth_year: 1990 }, 2027, 1799), true));
test('U1800 odbija 1800 i više', () => assert.equal(isCategoryEligible('U1800', { birth_year: 1990 }, 2027, 1800), false));
test('Žene koristi spol igrača', () => assert.equal(isCategoryEligible('WOMEN', { birth_year: 1990, gender: 'F' }, 2027, 1800), true));
test('Zaključani FINAL statusi su zaštićeni', () => {
  assert.equal(finalStatusIsLocked('CONFIRMED'), true);
  assert.equal(finalStatusIsLocked('PLAYED'), true);
  assert.equal(finalStatusIsLocked('NO_SHOW'), true);
  assert.equal(finalStatusIsLocked('QUALIFIED'), false);
  assert.equal(finalStatusIsLocked('DECLINED'), false);
});
