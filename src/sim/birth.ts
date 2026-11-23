import { householdSizeFor } from '../data/households';
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

  const countryOfBirth = countryForBirthRoll(country.value);
  const [small, medium, large] = householdSizeFor(countryOfBirth);
  const draw = siblings.value * (small + medium + large);
  const caregiversAtBirth: Caregivers = caregivers.value < .72 ? 'two-parents'
    : caregivers.value < .95 ? 'one-parent' : 'other-guardians';
  const size = draw < small ? 2 + Math.floor(draw / small * 2)
    : draw < small + medium ? 4 + Math.floor((draw - small) / medium * 2)
    : 6 + Math.floor((draw - small - medium) / large * 2);
  return {
    birth: {
      name,
      sex: input.sex,
      countryOfBirth,
      family: {
        caregivers: caregiversAtBirth,
        olderSiblings: Math.max(0, size - (caregiversAtBirth === 'two-parents' ? 3 : 2)),
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
