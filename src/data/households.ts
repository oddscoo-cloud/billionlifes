import type { CountryCode } from './demographics';

// UN DESA Household Size and Composition 2026. Percentages for 2–3, 4–5 and 6+ residents.
export const householdSizes: Partial<Record<CountryCode, readonly [number, number, number]>> = {
  UA: [53.13, 19.01, 2.90],
  IN: [30.31, 40.37, 24.21],
  NG: [26.37, 26.27, 30.43],
  MX: [39.40, 35.48, 12.93],
  BR: [53.42, 23.62, 4.03],
  AU: [49.95, 22.44, 3.27],
};

// World Bank AG.LND.PRCP.MM, 2022 data, long-term average in millimetres per year.
export const yearlyPrecipitation: Partial<Record<CountryCode, number>> = {
  UA: 565, IN: 1083, NG: 1150, MX: 758, BR: 1761, AU: 534,
};

const defaultHouseholdSize: readonly [number, number, number] = [45, 28, 12];

export function householdSizeFor(code: CountryCode): readonly [number, number, number] {
  return householdSizes[code] ?? defaultHouseholdSize;
}

export function precipitationFor(code: CountryCode): number {
  return yearlyPrecipitation[code] ?? 900;
}
