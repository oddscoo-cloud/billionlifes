import { monthlyMortality } from '../data/demographics';
import type { BirthConditions } from './birth';
import type { LifeSnapshot } from './life';
import { drawRandom } from './random';

export const parentRoles = ['mother', 'father'] as const;
export type ParentRole = (typeof parentRoles)[number];

export const parentLabels: Record<ParentRole, string> = { mother: 'Мама', father: 'Папа' };

export interface Parent {
  readonly role: ParentRole;
  readonly ageAtBirth: number;
  readonly diedAt?: number;
}

export function initialParents(family: BirthConditions['family'], seed: number): readonly Parent[] {
  if (family.caregivers === 'other-guardians') return [];
  const roll = drawRandom((seed ^ 0x8b82975c) >>> 0);
  const roles = family.caregivers === 'two-parents' ? parentRoles
    : [roll.value < .85 ? 'mother' : 'father'] as const;
  const motherAge = 20 * 12 + Math.floor(drawRandom(roll.state).value * 19 * 12);
  return roles.map((role) => ({
    role, ageAtBirth: role === 'mother' ? motherAge : motherAge + Math.floor(roll.value * 8 * 12),
  }));
}

export function familySupport(life: LifeSnapshot): string {
  const available = life.parents.filter(({ diedAt }) => diedAt === undefined);
  if (available.length === 2) return 'родные';
  if (available[0]) return available[0].role === 'mother' ? 'мама' : 'папа';
  return life.parents.length ? 'близкий взрослый' : 'опекун';
}

export function advanceParents(life: LifeSnapshot): LifeSnapshot {
  const { parents, ageInMonths } = life;
  const losses: Parent[] = [];
  const next = parents.map((parent) => {
    if (parent.diedAt !== undefined) return parent;
    const state = life.seed ^ Math.imul(ageInMonths, 0x9e3779b9)
      ^ (parent.role === 'mother' ? 0x3e4a55e4 : 0x017591ab);
    const { value } = drawRandom(state >>> 0);
    const risk = monthlyMortality(life.birth.countryOfBirth,
      parent.role === 'mother' ? 'female' : 'male', parent.ageAtBirth + ageInMonths - 1);
    if (value >= risk) return parent;
    const lost = { ...parent, diedAt: ageInMonths };
    losses.push(lost);
    return lost;
  });
  if (!losses.length) return life;
  const resume = life.status.type === 'decision' && life.status.decision !== 'family-loss' && life.status.decision !== 'turning-point'
    ? life.status.decision : undefined;
  return {
    ...life, parents: next,
    status: { type: 'decision', decision: 'family-loss', ...(resume ? { resume } : {}) },
    wellbeing: { ...life.wellbeing, mood: Math.max(0, life.wellbeing.mood - 16 * losses.length) },
    chronicle: [...life.chronicle, ...losses.map(({ role }) => ({ type: 'parent-death' as const, role, ageInMonths }))],
  };
}

export const griefChoices = ['support', 'remember'] as const;
export type GriefChoice = (typeof griefChoices)[number];

export function resolveGrief(life: LifeSnapshot, choice: GriefChoice): LifeSnapshot {
  if (life.status.type !== 'decision' || life.status.decision !== 'family-loss' || !griefChoices.includes(choice)) return life;
  const { resume } = life.status;
  return {
    ...life,
    status: resume ? { type: 'decision', decision: resume } : { type: 'active' },
    wellbeing: { ...life.wellbeing, mood: Math.min(100, life.wellbeing.mood + (choice === 'support' ? 6 : 3)) },
    chronicle: [...life.chronicle, { type: 'family-response', choice, ageInMonths: life.ageInMonths }],
  };
}
