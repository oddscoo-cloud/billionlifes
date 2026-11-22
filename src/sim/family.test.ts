import { expect, it } from 'vitest';
import { createLife } from './birth';
import { advanceParents, resolveGrief } from './family';
import { advanceAuto, advanceEarlyChildhood, advanceMonth, advanceYear, startLife } from './life';
import type { LifeSnapshot } from './life';

const newborn = () => startLife(createLife({ name: 'Мира', sex: 'female', seed: 43 }));

it('generates ages for exactly the parents present at birth', () => {
  for (let seed = 0; seed < 100; seed += 1) {
    const life = startLife(createLife({ name: 'Мира', sex: 'female', seed }));
    const count = { 'two-parents': 2, 'one-parent': 1, 'other-guardians': 0 }[life.birth.family.caregivers];
    expect(life.parents).toHaveLength(count);
    expect(life.parents.every(({ ageAtBirth }) => ageAtBirth >= 240 && ageAtBirth < 564)).toBe(true);
  }
});

it('pauses for parental death and restores a simultaneous birthday decision', () => {
  const base: LifeSnapshot = {
    ...newborn(), ageInMonths: 47, parents: [{ role: 'father', ageAtBirth: 540 }],
  };
  let seed = 0;
  while (seed < 10_000 && advanceParents({ ...base, ageInMonths: 48, seed }).status.type === 'active') seed += 1;
  expect(seed).toBeLessThan(10_000);
  const life = { ...base, seed };
  const paused = advanceAuto(life);
  expect(paused).toEqual(advanceMonth(life));
  expect(advanceYear(life)).toEqual(paused);
  expect(advanceEarlyChildhood(life)).toEqual(paused);
  expect(paused.parents[0]?.diedAt).toBe(48);
  expect(paused.status).toEqual({ type: 'decision', decision: 'family-loss', resume: 'first-childhood-activity' });
  expect(advanceAuto(paused)).toBe(paused);
  const resumed = resolveGrief(paused, 'support');
  expect(resumed.status).toEqual({ type: 'decision', decision: 'first-childhood-activity' });
  expect(resumed.ageInMonths).toBe(48);
  expect(resumed.randomState).toBe(paused.randomState);
  expect(advanceParents({ ...resumed, ageInMonths: 49 }).parents).toBe(resumed.parents);
});
