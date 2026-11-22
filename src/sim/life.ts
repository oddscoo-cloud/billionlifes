import { monthlyMortality } from '../data/demographics';
import type { CountryCode } from '../data/demographics';
import type { NewLife } from './birth';
import { drawRandom } from './random';

export type ChildhoodChoice = 'read-with-caregiver' | 'play-with-peers';

export type LifeEvent = {
  readonly ageInMonths: number;
} & (
  | { readonly type: 'birth' | 'childhood-year' | 'death' }
  | { readonly type: 'childhood-choice'; readonly choice: ChildhoodChoice }
);

export type LifeStatus =
  | { readonly type: 'active' }
  | { readonly type: 'decision'; readonly decision: 'first-childhood-activity' }
  | { readonly type: 'dead' };

export interface LifeSnapshot extends Omit<NewLife, 'ageInMonths'> {
  readonly ageInMonths: number;
  readonly countryOfResidence: CountryCode;
  readonly status: LifeStatus;
  readonly chronicle: readonly LifeEvent[];
}

export function startLife(newLife: NewLife): LifeSnapshot {
  return {
    ...newLife,
    countryOfResidence: newLife.birth.countryOfBirth,
    status: { type: 'active' },
    chronicle: [{ type: 'birth', ageInMonths: 0 }],
  };
}

export function advanceMonth(life: LifeSnapshot): LifeSnapshot {
  if (life.status.type !== 'active') return life;

  const mortality = monthlyMortality(life.countryOfResidence, life.birth.sex, life.ageInMonths);
  const roll = drawRandom(life.randomState);
  const ageInMonths = life.ageInMonths + 1;
  const next = { ...life, ageInMonths, randomState: roll.state };

  if (roll.value < mortality) {
    return {
      ...next,
      status: { type: 'dead' },
      chronicle: [...life.chronicle, { type: 'death', ageInMonths }],
    };
  }

  if (ageInMonths <= 48 && ageInMonths % 12 === 0) {
    return {
      ...next,
      status: ageInMonths === 48
        ? { type: 'decision', decision: 'first-childhood-activity' }
        : next.status,
      chronicle: [...life.chronicle, { type: 'childhood-year', ageInMonths }],
    };
  }

  return next;
}
