import { countryForBirthRoll, demographics, sexes } from '../data/demographics';
import type { CountryCode, Sex } from '../data/demographics';
import { drawRandom } from './random';

export type Caregivers = 'two-parents' | 'one-parent' | 'other-guardians';
export type HouseholdMeans = 'limited' | 'moderate' | 'high';
export type StartingHealth = 'typical' | 'needs-support';

export interface BirthConditions {
  readonly name: string;
  readonly sex: Sex;
  readonly countryOfBirth: CountryCode;
  readonly family: {
    readonly caregivers: Caregivers;
    readonly olderSiblings: number;
    readonly means: HouseholdMeans;
  };
  readonly startingHealth: StartingHealth;
}

export interface NewLife {
  readonly birth: BirthConditions;
  readonly ageInMonths: 0;
  readonly demographicsVersion: string;
  readonly seed: number;
  readonly randomState: number;
}

export function createLife(input: { name: string; sex: Sex; seed: number }): NewLife {
  const name = input.name.trim();
  if (!name) throw new RangeError('Expected a nonempty name');
  if (!sexes.includes(input.sex)) throw new RangeError('Unsupported sex');

  const country = drawRandom(input.seed);
  const caregivers = drawRandom(country.state);
  const siblings = drawRandom(caregivers.state);
  const means = drawRandom(siblings.state);
  const health = drawRandom(means.state);

  return {
    birth: {
      name,
      sex: input.sex,
      countryOfBirth: countryForBirthRoll(country.value),
      family: {
        caregivers: caregivers.value < 0.72 ? 'two-parents'
          : caregivers.value < 0.95 ? 'one-parent' : 'other-guardians',
        olderSiblings: Math.floor(siblings.value * 4),
        means: means.value < 0.25 ? 'limited' : means.value < 0.9 ? 'moderate' : 'high',
      },
      startingHealth: health.value < 0.9 ? 'typical' : 'needs-support',
    },
    ageInMonths: 0,
    demographicsVersion: demographics.version,
    seed: input.seed,
    randomState: health.state,
  };
}
