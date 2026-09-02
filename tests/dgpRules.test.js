import test from 'node:test';
import assert from 'node:assert/strict';
import { ageBySeasonYear, isCategoryEligible, finalStatusIsLocked } from '../lib/dgpRules.js';

test('U kategorije koriste seasonYear - birthYear', () => {
  assert.equal(ageBySeasonYear(2015, 2027), 12);
  assert.equal(isCategoryEligible('U12', { birth_year: 2015 }, 2027), true);
  assert.equal(isCategoryEligible('U12', { birth_year: 2014 }, 2027), false);
  assert.equal(isCategoryEligible('U16', { birth_year: 2011 }, 2027), true);
  assert.equal(isCategoryEligible('U20', { birth_year: 2007 }, 2027), true);
});

test('S kategorije koriste seasonYear - birthYear kao minimalnu dob', () => {
  assert.equal(isCategoryEligible('S50', { birth_year: 1977 }, 2027), true);
  assert.equal(isCategoryEligible('S50', { birth_year: 1978 }, 2027), false);
  assert.equal(isCategoryEligible('S65', { birth_year: 1962 }, 2027), true);
  assert.equal(isCategoryEligible('S65', { birth_year: 1963 }, 2027), false);
});

test('U1800 i žene', () => {
  assert.equal(isCategoryEligible('U1800', { birth_year: 2000 }, 2027, 1799), true);
  assert.equal(isCategoryEligible('U1800', { birth_year: 2000 }, 2027, 1800), false);
  assert.equal(isCategoryEligible('WOMEN', { gender: 'F' }, 2027), true);
  assert.equal(isCategoryEligible('WOMEN', { gender: 'M' }, 2027), false);
});

test('Final statusi zaključavaju potvrđene/odigrane/no-show slotove', () => {
  assert.equal(finalStatusIsLocked('CONFIRMED'), true);
  assert.equal(finalStatusIsLocked('PLAYED'), true);
  assert.equal(finalStatusIsLocked('NO_SHOW'), true);
  assert.equal(finalStatusIsLocked('DECLINED'), false);
  assert.equal(finalStatusIsLocked('REPLACEMENT'), false);
});
