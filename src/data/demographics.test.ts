import { describe, expect, it } from 'vitest';
import {
  birthShare, countryCodes, countryForBirthRoll, demographics, monthlyMortality, sexes, totalBirths,
} from './demographics';

describe('birth weights', () => {
  it('normalizes positive weights across all supported countries', () => {
    const shares = countryCodes.map(birthShare);
    expect(shares).toHaveLength(193);
    expect(shares.every((share) => share > 0)).toBe(true);
    expect(shares.reduce((sum, share) => sum + share, 0)).toBeCloseTo(1, 12);
    expect(demographics.year).toBe(2023);
  });

  it('selects each country from its exact lower bound and from below its upper bound', () => {
    let lowerBirths = 0;
    for (const code of countryCodes) {
      expect(countryForBirthRoll(lowerBirths / totalBirths)).toBe(code);
      lowerBirths += demographics.countries[code].births;
      expect(countryForBirthRoll(lowerBirths / totalBirths - Number.EPSILON)).toBe(code);
    }
  });

  it.each([-1, 1, Number.NaN])('rejects invalid roll %s', (roll) => {
    expect(() => countryForBirthRoll(roll)).toThrow(RangeError);
  });
});

describe('monthly mortality', () => {
  it.each(countryCodes)('covers all age bands for both sexes in %s', (code) => {
    for (const sex of sexes) {
      for (const band of demographics.countries[code].mortality[sex]) {
        const startMonth = band.startAge * 12;
        const risk = monthlyMortality(code, sex, startMonth);
        expect(risk).toBeGreaterThan(0);
        expect(risk).toBeLessThan(1);
        if (band.years !== null) {
          const months = band.years * 12;
          expect(monthlyMortality(code, sex, startMonth + months - 1)).toBe(risk);
          expect(1 - (1 - risk) ** months).toBeCloseTo(band.deathProbability, 12);
        } else {
          expect(risk).toBeCloseTo(1 - Math.exp(-1 / (12 * band.remainingLifeYears)), 12);
          expect(monthlyMortality(code, sex, startMonth + 360)).toBe(risk);
        }
      }
    }
  });

  it('switches from infant mortality to the ages 1–4 band on the first birthday', () => {
    expect(monthlyMortality('UA', 'female', 11)).toBeGreaterThan(monthlyMortality('UA', 'female', 12));
    expect(monthlyMortality('UA', 'female', 12)).not.toBe(monthlyMortality('UA', 'male', 12));
  });
});
