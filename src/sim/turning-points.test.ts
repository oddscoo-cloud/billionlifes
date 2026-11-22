import { expect, it } from 'vitest';
import { availableActions } from './actions';
import { createLife } from './birth';
import { advanceAuto, advanceMonth, advanceYear, startLife } from './life';
import type { LifeSnapshot } from './life';
import { drawRandom } from './random';
import { characterTraits } from './traits';
import { advanceTurningPoint, resolveTurningPoint } from './turning-points';

const newborn = () => startLife(createLife({ name: 'Мира', sex: 'female', seed: 42 }));

it('pauses the auto and yearly turn and preserves immediate and delayed consequences', () => {
  const start = newborn();
  const { state: safe } = drawRandom(start.randomState);
  const child = { ...start, parents: [], ageInMonths: 71, randomState: safe };
  const paused = advanceMonth(child);
  expect(paused.status).toMatchObject({ type: 'decision', decision: 'turning-point' });
  expect(advanceAuto(child)).toEqual(paused);
  expect(advanceYear(child)).toEqual(paused);
  expect(advanceMonth(paused)).toBe(paused);
  const chose = resolveTurningPoint(paused, 0);
  expect(chose.status.type).toBe('active');
  expect(characterTraits(chose)).toHaveLength(1);
  const later = advanceMonth(advanceMonth(chose));
  expect(later.chronicle.at(-1)).toMatchObject({ type: 'turning-consequence', response: 0 });
});

it('links earlier shift cuts to a job loss and delays new job applications', () => {
  const start = newborn();
  const adult: LifeSnapshot = {
    ...start, ageInMonths: 241,
    development: { ...start.development, employment: 'entry-level' },
    chronicle: [...start.chronicle, { type: 'world', id: 'shift-cut', ageInMonths: 240, effects: { funds: -1 } }],
  };
  const paused = advanceTurningPoint(adult);
  expect(paused.status).toMatchObject({ type: 'decision', decision: 'turning-point', id: 'lost-job' });
  expect(paused.development.employment).toBe('unemployed');
  const choice = resolveTurningPoint(paused, 1);
  expect(characterTraits(choice)[0]?.id).toBe('independent');
  expect(availableActions(choice).some(({ action }) => action.id === 'entry-level-job')).toBe(false);
  expect(availableActions({ ...choice, ageInMonths: 243 }).some(({ action }) => action.id === 'entry-level-job')).toBe(true);
});

it('learns a trait from repeated experience and uses it in university odds', () => {
  const start = { ...newborn(), ageInMonths: 18 * 12 };
  const event = { type: 'world', id: 'study-group', effects: {} } as const;
  const prepared = { ...start, chronicle: [...start.chronicle,
    { ...event, ageInMonths: 100 }, { ...event, ageInMonths: 110 }, { ...event, ageInMonths: 120 }] };
  expect(characterTraits({ ...prepared, chronicle: prepared.chronicle.slice(0, -1) })).toEqual([]);
  expect(characterTraits(prepared).map(({ id }) => id)).toEqual(['persistent']);
  expect(availableActions(prepared).find(({ action }) => action.id === 'apply-university')?.factors)
    .toContainEqual({ label: 'Настойчивость', contribution: 0.08 });
});
