import { monthlyMortality } from '../data/demographics';
import type { CountryCode } from '../data/demographics';
import { milestoneAt } from './actions';
import type { LifeAction, Milestone } from './actions';
import type { NewLife } from './birth';
import { grow, growMonth, initialDevelopment, plans } from './growth';
import type { Development, Plan } from './growth';
import { initialRelationships, remember } from './relationships';
import type { Relationship } from './relationships';
import { drawRandom } from './random';

export type ChildhoodChoice = 'read-with-caregiver' | 'play-with-peers';

export type LifeEvent = {
  readonly ageInMonths: number;
} & (
  | { readonly type: 'birth' | 'childhood-year' | 'death' }
  | {
      readonly type: 'action';
      readonly action: LifeAction;
      readonly succeeded: boolean;
      readonly chance: number;
    }
  | { readonly type: 'plan'; readonly plan: Plan | null }
  | { readonly type: 'childhood-choice'; readonly choice: ChildhoodChoice }
);

export type LifeStatus =
  | { readonly type: 'active' }
  | { readonly type: 'decision'; readonly decision: 'first-childhood-activity' | Milestone }
  | { readonly type: 'dead' };

export interface LifeSnapshot extends Omit<NewLife, 'ageInMonths'> {
  readonly ageInMonths: number;
  readonly countryOfResidence: CountryCode;
  readonly status: LifeStatus;
  readonly development: Development;
  readonly relationships: readonly Relationship[];
  readonly chronicle: readonly LifeEvent[];
}

export function startLife(newLife: NewLife): LifeSnapshot {
  return {
    ...newLife,
    relationships: initialRelationships(),
    development: initialDevelopment(newLife.birth.family.means),
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

  const development = growMonth(life.development);
  const milestone = milestoneAt(ageInMonths);
  return {
    ...next,
    development,
    status: milestone ? { type: 'decision', decision: milestone } : next.status,
  };
}

export function availableChildhoodChoices(life: LifeSnapshot): readonly ChildhoodChoice[] {
  return life.status.type === 'decision' && life.status.decision === 'first-childhood-activity'
    ? ['read-with-caregiver', 'play-with-peers'] : [];
}

export function resolveChildhoodChoice(life: LifeSnapshot, choice: ChildhoodChoice): LifeSnapshot {
  if (!availableChildhoodChoices(life).includes(choice)) return life;

  return {
    ...life,
    status: { type: 'active' },
    relationships: choice === 'read-with-caregiver'
      ? remember(life.relationships, 'caregiver', { kind: 'shared-reading', ageInMonths: life.ageInMonths }, 15)
      : remember(life.relationships, 'friend', { kind: 'shared-play', ageInMonths: life.ageInMonths }, 15),
    development: grow(life.development, choice === 'read-with-caregiver' ? 'study' : 'community', 3),
    chronicle: [...life.chronicle, { type: 'childhood-choice', ageInMonths: life.ageInMonths, choice }],
  };
}

export function advanceYear(life: LifeSnapshot): LifeSnapshot {
  let next = life;
  for (let month = 0; month < 12 && next.status.type === 'active'; month += 1) {
    next = advanceMonth(next);
  }
  return next;
}

export function setPlan(life: LifeSnapshot, plan: Plan | null): LifeSnapshot {
  if (life.status.type !== 'active' || life.ageInMonths < 48
    || plan === life.development.plan || (plan !== null && !plans.includes(plan))) return life;

  return {
    ...life,
    development: { ...life.development, plan },
    chronicle: [...life.chronicle, { type: 'plan', ageInMonths: life.ageInMonths, plan }],
  };
}
