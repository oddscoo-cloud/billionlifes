import type { LifeSnapshot } from './life';
import { drawRandom } from './random';

export const romanceEvents = ['meet', 'date', 'spend-time', 'love', 'end'] as const;
export type RomanceEvent = (typeof romanceEvents)[number];
export type RomanceAction = Exclude<RomanceEvent, 'meet'>;

const names = ['Саша', 'Женя', 'Валя', 'Слава', 'Рен', 'Ким'] as const;
export const romanceLabels: Record<Exclude<RomanceEvent, 'end' | 'spend-time'>, string> = {
  meet: 'Симпатия', date: 'Отношения', love: 'Любовь',
};

export function romance(life: LifeSnapshot) {
  let current: { stage: 'meet' | 'date' | 'love'; name: string; since: number; last: number; meetings: number } | null = null;
  for (const event of life.chronicle) {
    if (event.type !== 'romance') continue;
    if (event.step === 'meet') {
      current = { stage: 'meet', name: event.name, since: event.ageInMonths, last: event.ageInMonths, meetings: 0 };
    } else if (event.step === 'end') {
      current = null;
    } else if (current) {
      current.last = event.ageInMonths;
      if (event.step === 'spend-time') current.meetings += 1;
      else {
        current.stage = event.step;
        current.since = event.ageInMonths;
      }
    }
  }
  return current;
}

export function advanceRomance(life: LifeSnapshot): LifeSnapshot {
  const age = life.ageInMonths;
  if (age < 18 * 12 || life.status.type !== 'active') return life;
  const world = life.chronicle.at(-1);
  const social = world?.type === 'world' && world.ageInMonths === age
    && ['local-swap', 'community-meal', 'shared-ride', 'market', 'garden', 'study-group'].includes(world.id);
  if (!social || (age + life.seed % 4) % 4 > 1 || romance(life)) return life;
  const ended = life.chronicle.slice(-30).some((event) =>
    event.type === 'romance' && event.step === 'end' && age - event.ageInMonths < 8);
  if (ended) return life;
  const roll = drawRandom((life.seed ^ Math.imul(age, 0x3c6ef372)) >>> 0);
  return {
    ...life, chronicle: [...life.chronicle, {
      type: 'romance', ageInMonths: age, step: 'meet', name: names[Math.floor(roll.value * names.length)]!,
    }],
  };
}

export function availableRomance(life: LifeSnapshot): readonly RomanceAction[] {
  if (life.status.type !== 'active' || life.ageInMonths < 18 * 12) return [];
  const current = romance(life);
  if (!current) return [];
  if (current.stage === 'meet') return ['date', 'end'];
  const actions: RomanceAction[] = [];
  if (life.ageInMonths - current.last >= 2) actions.push('spend-time');
  if (current.stage === 'date' && current.meetings >= 2 && life.ageInMonths - current.since >= 4) actions.push('love');
  actions.push('end');
  return actions;
}

export function chooseRomance(life: LifeSnapshot, step: RomanceAction): LifeSnapshot {
  if (!availableRomance(life).includes(step)) return life;
  const current = romance(life)!;
  const mood = step === 'end' ? (current.stage === 'meet' ? 0 : -5) : step === 'love' ? 7 : 3;
  return {
    ...life,
    wellbeing: { ...life.wellbeing, mood: Math.min(100, Math.max(0, life.wellbeing.mood + mood)) },
    chronicle: [...life.chronicle, { type: 'romance', ageInMonths: life.ageInMonths, step, name: current.name }],
  };
}
