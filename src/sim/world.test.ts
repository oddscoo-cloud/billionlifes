import { expect, it } from 'vitest';
import { resolveAction } from './actions';
import { createLife } from './birth';
import { addDiaryEntry } from './diary';
import { advanceMonth, advanceYear, resolveChildhoodChoice, startLife } from './life';
import type { LifeSnapshot } from './life';
import { advanceWorld } from './world';
import type { WorldEvent } from './world';

const newborn = () => startLife(createLife({ name: 'Мира', sex: 'female', seed: 43 }));
const lastWorld = (life: LifeSnapshot) => life.chronicle.at(-1) as WorldEvent;

it('adds everyday events every two to three months with deterministic month and year turns', () => {
  const life = newborn();
  let monthly = life;
  for (let month = 0; month < 12; month += 1) monthly = advanceMonth(monthly);
  expect(advanceYear(life)).toEqual(monthly);
  const events = monthly.chronicle.filter((event): event is WorldEvent => event.type === 'world');
  expect(events.length).toBeGreaterThanOrEqual(4);
  expect(new Set(events.map(({ ageInMonths }) => ageInMonths)).size).toBe(events.length);
  expect(new Set(events.map(({ id }) => id)).size).toBeGreaterThanOrEqual(3);
});

it('uses the childhood choice when the library reopens and keeps the gameplay random state', () => {
  const child: LifeSnapshot = {
    ...newborn(), ageInMonths: 48, status: { type: 'decision', decision: 'first-childhood-activity' },
  };
  for (const read of [true, false]) {
    const resolved = resolveChildhoodChoice(child, read ? 'read-with-caregiver' : 'play-with-peers');
    const waiting: LifeSnapshot = {
      ...resolved, ageInMonths: 81, chronicle: [...resolved.chronicle, {
        type: 'world', ageInMonths: 80, id: 'library-closed', effects: { mood: -2 },
      }],
    };
    const reopened = advanceWorld(waiting);
    expect(lastWorld(reopened).id).toBe(read ? 'library-return' : 'library-open');
    expect(reopened.development.skills.academics - waiting.development.skills.academics).toBe(read ? 3 : 1);
    expect(reopened.randomState).toBe(waiting.randomState);
  }
});

it('connects relocation to a later encounter with a neighbor', () => {
  const start = newborn();
  const adult = { ...start, ageInMonths: 25 * 12, countryOfResidence: 'AU' as const,
    development: { ...start.development, funds: 10 } };
  const moved = resolveAction(adult, { id: 'move', destination: 'UA' });
  const firstMonth = advanceMonth(moved);
  expect(lastWorld(firstMonth).id).toBe('move-paperwork');
  expect(firstMonth.wellbeing.mood).toBe(moved.wellbeing.mood - 4);
  const secondMonth = advanceMonth(firstMonth);
  expect(lastWorld(secondMonth)).toMatchObject({ id: 'move-welcome', person: 'neighbor' });
  expect(secondMonth.relationships.find(({ id }) => id === 'neighbor')?.memories)
    .toEqual([{ ageInMonths: 302, kind: 'world', event: 'move-welcome' }]);
});

it('lets communication or a trusted colleague soften the impact of cut shifts', () => {
  const start = newborn();
  const base: LifeSnapshot = {
    ...start, ageInMonths: 241,
    development: { ...start.development, employment: 'entry-level' },
    chronicle: [...start.chronicle, { type: 'world', id: 'shift-cut', ageInMonths: 240, effects: { funds: -1 } }],
  };
  const supported = advanceWorld({
    ...base,
    development: { ...base.development, skills: { ...base.development.skills, communication: 20 } },
  });
  const unsupported = advanceWorld(base);
  expect(lastWorld(supported)).toMatchObject({ id: 'shift-cover', effects: { funds: 1 } });
  expect(lastWorld(unsupported)).toMatchObject({ id: 'shift-search' });
  expect(supported.development.funds).toBe(unsupported.development.funds + 1);
});

it('allows a note without advancing time or changing the simulation draw', () => {
  const life = newborn();
  expect(addDiaryEntry(life, '   ')).toBe(life);
  expect(addDiaryEntry(life, 'x'.repeat(601))).toBe(life);
  const noted = addDiaryEntry(life, '   Хороший день.  ');
  expect(noted).toEqual({ ...life, diary: [{ ageInMonths: 0, text: 'Хороший день.' }] });
  expect(advanceMonth(noted)).toEqual({ ...advanceMonth(life), diary: noted.diary });
});

it('uses local rainfall averages to make rainy events more common in a wetter country', () => {
  const start = newborn();
  const countRain = (countryOfResidence: 'BR' | 'AU') => Array.from({ length: 800 }, (_, index) => {
    const life = { ...start, ageInMonths: 250 + index, countryOfResidence };
    const event = advanceWorld(life).chronicle.at(-1);
    return event?.type === 'world' && event.id === 'rain' ? event.effects.mood : undefined;
  }).filter((mood) => mood === -3).length;
  expect(countRain('BR')).toBeGreaterThan(countRain('AU') * 2);
});
