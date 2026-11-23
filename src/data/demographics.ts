import snapshot from './wpp2024-2023.json';

export const sexes = ['female', 'male'] as const;

export type CountryCode = keyof typeof snapshot.countries;
export const countryCodes = Object.keys(snapshot.countries) as readonly CountryCode[];
export type Sex = (typeof sexes)[number];

export type MortalityBand =
  | { readonly startAge: number; readonly years: number; readonly deathProbability: number }
  | {
      readonly startAge: number;
      readonly years: null;
      readonly deathProbability: 1;
      readonly remainingLifeYears: number;
    };

interface Country {
  readonly name: string;
  readonly births: number;
  readonly mortality: Readonly<Record<Sex, readonly MortalityBand[]>>;
}

interface Demographics {
  readonly version: string;
  readonly year: number;
  readonly countries: Readonly<Record<CountryCode, Country>>;
}

function assertSnapshot(data: typeof snapshot): asserts data is typeof snapshot & Demographics {
  if (!data.version.trim() || !Number.isInteger(data.year) || data.year <= 0) {
    throw new Error('Invalid demographics metadata');
  }

  for (const code of countryCodes) {
    const country = data.countries[code];
    if (!country?.name.trim() || !Number.isSafeInteger(country.births) || country.births <= 0) {
      throw new Error(`Invalid birth data for ${code}`);
    }

    for (const sex of sexes) {
      const table = country.mortality[sex];
      const valid = table?.length === 22 && table.every((band, index) => {
        const expectedAge = index < 2 ? index : (index - 1) * 5;
        if (band.startAge !== expectedAge) return false;

        if (band.startAge === 100) {
          return band.years === null && band.deathProbability === 1
            && Number.isFinite(band.remainingLifeYears) && (band.remainingLifeYears ?? 0) > 0;
        }

        const expectedYears = index === 0 ? 1 : index === 1 ? 4 : 5;
        return band.years === expectedYears
          && band.deathProbability >= 0 && band.deathProbability < 1;
      });

      if (!valid) throw new Error(`Invalid mortality table for ${code}/${sex}`);
    }
  }
}

assertSnapshot(snapshot);
export const demographics: Demographics = snapshot;

export const totalBirths = countryCodes.reduce(
  (sum, code) => sum + demographics.countries[code].births,
  0,
);

export function birthShare(code: CountryCode): number {
  return demographics.countries[code].births / totalBirths;
}

/** Maps a unit-interval roll to contiguous, half-open birth-weight intervals. */
export function countryForBirthRoll(roll: number): CountryCode {
  if (!(roll >= 0 && roll < 1)) throw new RangeError('Expected a birth roll in [0, 1)');

  let cumulativeBirths = 0;
  for (const code of countryCodes) {
    cumulativeBirths += demographics.countries[code].births;
    if (roll < cumulativeBirths / totalBirths) return code;
  }

  throw new Error('Birth weights do not cover the unit interval');
}

export function monthlyMortality(code: CountryCode, sex: Sex, ageInMonths: number): number {
  if (!Number.isSafeInteger(ageInMonths) || ageInMonths < 0) {
    throw new RangeError('Expected age in whole nonnegative months');
  }

  const age = ageInMonths / 12;
  const band = demographics.countries[code].mortality[sex].find(
    ({ startAge, years }) => age >= startAge && (years === null || age < startAge + years),
  );
  if (!band) throw new Error('Mortality table does not cover the requested age');

  if (band.years === null) {
    return -Math.expm1(-1 / (12 * band.remainingLifeYears));
  }
  return -Math.expm1(Math.log1p(-band.deathProbability) / (12 * band.years));
}
