export const DGP_CATEGORIES = [
  { code: 'GENERAL', label: 'Opći GP' },
  { code: 'S65', label: 'S65' },
  { code: 'S50', label: 'S50' },
  { code: 'U1800', label: 'U1800' },
  { code: 'U20', label: 'U20' },
  { code: 'U16', label: 'U16' },
  { code: 'U12', label: 'U12' },
  { code: 'WOMEN', label: 'Žene' },
];

export const FINAL_SLOTS = 8;
export const FINAL_STATUSES = ['QUALIFIED', 'INVITED', 'CONFIRMED', 'DECLINED', 'REPLACEMENT', 'NO_SHOW', 'PLAYED'];

export function ageBySeasonYear(birthYear, seasonYear) {
  if (!birthYear || !seasonYear) return null;
  return Number(seasonYear) - Number(birthYear);
}

export function isCategoryEligible(category, player, seasonYear, rating) {
  if (!player) return false;
  const age = ageBySeasonYear(player.birth_year, seasonYear);
  switch (category) {
    case 'U12': return age !== null && age <= 12;
    case 'U16': return age !== null && age <= 16;
    case 'U20': return age !== null && age <= 20;
    case 'S50': return age !== null && age >= 50;
    case 'S65': return age !== null && age >= 65;
    case 'U1800': return rating !== null && rating !== undefined && Number(rating) < 1800;
    case 'WOMEN': return player.gender === 'F' || player.gender === 'Ž' || player.gender === 'FEMALE';
    default: return true;
  }
}

export function finalStatusIsLocked(status) {
  return ['CONFIRMED', 'PLAYED', 'NO_SHOW'].includes(status);
}
