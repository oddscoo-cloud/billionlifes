import { monthlyMortality } from '../data/demographics';
import type { LifeSnapshot } from './life';
import { drawRandom } from './random';

export interface Sibling {
  readonly index: number;
  readonly role: 'Брат' | 'Сестра';
  readonly ageAtBirth: number;
  readonly ageInMonths: number;
  readonly trust: number;
  readonly diedAt?: number;
}

export function siblings(life: LifeSnapshot): readonly Sibling[] {
  if (!life.birth.family.olderSiblings) return [];
  const deaths = new Map<number, number>();
  const contacts = new Map<number, number>();
  for (const event of life.chronicle) {
    if (event.type === 'sibling-death') deaths.set(event.index, event.ageInMonths);
    if (event.type === 'sibling-visit') contacts.set(event.index, (contacts.get(event.index) ?? 0) + 6);
    if (event.type === 'world' && event.sibling !== undefined) {
      contacts.set(event.sibling, (contacts.get(event.sibling) ?? 0) + 2);
    }
  }
  let ageAtBirth = 0;
  return Array.from({ length: life.birth.family.olderSiblings }, (_, index) => {
    const roll = drawRandom((life.seed ^ Math.imul(index + 1, 0x9e3779b9)) >>> 0);
    ageAtBirth += 15 + Math.floor(drawRandom(roll.state).value * 25);
    const diedAt = deaths.get(index);
    return {
      index, role: roll.value < .5 ? 'Брат' : 'Сестра', ageAtBirth,
      ageInMonths: ageAtBirth + (diedAt ?? life.ageInMonths),
      trust: Math.min(100, 50 + (contacts.get(index) ?? 0)),
      ...(diedAt !== undefined ? { diedAt } : {}),
    };
  });
}

export function siblingLosses(life: LifeSnapshot): number[] {
  return siblings(life).filter((person) => person.diedAt === undefined && drawRandom((
    life.seed ^ Math.imul(life.ageInMonths, 0xb61a99e9) ^ Math.imul(person.index + 1, 0x6d2b79f5)
  ) >>> 0).value < monthlyMortality(life.birth.countryOfBirth, person.role === 'Брат' ? 'male' : 'female',
    person.ageInMonths - 1)).map(({ index }) => index);
}

export function canVisitSibling(life: LifeSnapshot, sibling: Sibling): boolean {
  return life.status.type === 'active' && life.ageInMonths >= 48 && sibling.diedAt === undefined
    && !life.chronicle.some((event) => event.type === 'sibling-visit'
      && event.index === sibling.index && life.ageInMonths - event.ageInMonths < 3);
}

export function visitSibling(life: LifeSnapshot, index: number): LifeSnapshot {
  const person = siblings(life)[index];
  if (!person || !canVisitSibling(life, person)) return life;
  return {
    ...life,
    wellbeing: { ...life.wellbeing, mood: Math.min(100, life.wellbeing.mood + 3) },
    chronicle: [...life.chronicle, { type: 'sibling-visit', index, role: person.role, ageInMonths: life.ageInMonths }],
  };
}
