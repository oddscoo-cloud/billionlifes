import { expect, it } from 'vitest';
import { createLife } from './birth';
import { healthStatus } from './health';
import { advanceRelatives } from './family';
import { startLife } from './life';
import type { LifeSnapshot } from './life';
import { advanceRomance, availableRomance, chooseRomance, romance } from './romance';
import { siblings, visitSibling } from './siblings';
import { characterTraits } from './traits';
import { advanceTurningPoint } from './turning-points';
import { advanceWorld } from './world';
import { decodeSave, schemaVersion } from '../storage/schema';

const newborn = () => startLife(createLife({ name: 'Лия', sex: 'female', seed: 42 }));

it('uses only the first answer for older saves and never opens the same difficult choice again', () => {
  const life = newborn();
  const history: LifeSnapshot = {
    ...life, ageInMonths: 114,
    chronicle: [...life.chronicle,
      { type: 'turning-point', id: 'new-class', ageInMonths: 72 },
      { type: 'turning-choice', id: 'new-class', response: 1, ageInMonths: 72 },
      { type: 'turning-choice', id: 'new-class', response: 0, ageInMonths: 108 },
    ],
  };
  expect(characterTraits(history).map(({ id }) => id)).toEqual(['independent']);
  const next = advanceTurningPoint(history);
  expect(next.status).not.toMatchObject({ id: 'new-class' });
});

it('lets siblings age, remembers time together and prevents immediate repeats', () => {
  const life = newborn();
  const older = { ...life, ageInMonths: 60, birth: { ...life.birth, family: { ...life.birth.family, olderSiblings: 2 } } };
  expect(siblings(older)).toHaveLength(2);
  expect(siblings({ ...older, ageInMonths: 72 })[0]?.ageInMonths).toBe(siblings(older)[0]!.ageInMonths + 12);
  const visited = visitSibling(older, 1);
  expect(siblings(visited)[1]?.trust).toBe(56);
  expect(visitSibling(visited, 1)).toBe(visited);
  expect(visitSibling({ ...visited, ageInMonths: 63 }, 1)).not.toBe(visited);
  const end = { ...older, ageInMonths: 1500, parents: [] };
  const lost = Array.from({ length: 40 }, (_, seed) => advanceRelatives({ ...end, seed }))
    .find(({ status }) => status.type === 'decision')!;
  expect(lost.status).toEqual({ type: 'decision', decision: 'family-loss' });
  expect(siblings(lost).some(({ diedAt }) => diedAt === 1500)).toBe(true);
  expect(decodeSave({ schemaVersion, revision: 1, life: lost }).life).toEqual(lost);
});

it('allows adult sympathy to become love with several meetings over time', () => {
  const life = newborn();
  const social = { type: 'world', id: 'market', ageInMonths: 218, effects: {} } as const;
  const met = advanceRomance({ ...life, ageInMonths: 218, chronicle: [...life.chronicle, social] });
  expect(romance(met)?.stage).toBe('meet');
  const date = chooseRomance(met, 'date');
  expect(romance(date)?.stage).toBe('date');
  expect(availableRomance(date)).not.toContain('love');
  const first = chooseRomance({ ...date, ageInMonths: 220 }, 'spend-time');
  const second = chooseRomance({ ...first, ageInMonths: 222 }, 'spend-time');
  expect(romance(chooseRomance(second, 'love'))?.stage).toBe('love');
  expect(romance(chooseRomance(second, 'end'))).toBeNull();
});

it('shows illness, recovery and return to stable health', () => {
  const life = newborn();
  const sick: LifeSnapshot = { ...life, ageInMonths: 39,
    chronicle: [...life.chronicle, { type: 'world', id: 'child-fever', ageInMonths: 39, effects: {} }] };
  expect(healthStatus(sick).label).toBe('Недомогание');
  expect(healthStatus({ ...sick, ageInMonths: 41 }).label).toBe('Восстанавливается');
  expect(healthStatus({ ...sick, ageInMonths: 42 }).label).toBe('Стабильное');
});

it('trains multiple skills in a school project and records each gain', () => {
  const life = newborn();
  const project = Array.from({ length: 100 }, (_, index) =>
    advanceWorld({ ...life, ageInMonths: 80 + index })).find((next) => {
      const event = next.chronicle.at(-1);
      return event?.type === 'world' && event.id === 'school-project';
    })!;
  expect(project.chronicle.at(-1)).toMatchObject({ effects: { creativity: 1, communication: 1 } });
  expect(project.development.skills).toMatchObject({ creativity: 1, communication: 1 });
});
