import { expect, it } from 'vitest';
import { advanceWellbeing, availableCrisisChoices, resolveCrisisChoice } from './crisis';
import { createLife } from './birth';
import { advanceMonth, advanceYear, resolveChildhoodChoice, startLife } from './life';
import type { ChildhoodChoice, LifeSnapshot } from './life';

function beforeCrisis(choice: ChildhoodChoice): LifeSnapshot {
  const life = startLife(createLife({ name: 'Саша', sex: 'female', seed: 42 }));
  return {
    ...resolveChildhoodChoice({
      ...life, ageInMonths: 48, status: { type: 'decision', decision: 'first-childhood-activity' },
    }, choice),
    ageInMonths: 15 * 12 - 2,
    countryOfResidence: 'AU',
  };
}

it('pauses the year at the first crisis and uses childhood memories in the support dialogue', () => {
  const reader = beforeCrisis('read-with-caregiver');
  const first = advanceYear(reader);
  expect(first).toEqual(advanceMonth(advanceMonth(reader)));
  expect(first.ageInMonths).toBe(180);
  expect(advanceYear(first)).toBe(first);
  const supported = resolveCrisisChoice(first, 'ask-for-help');
  const other = resolveCrisisChoice(advanceYear(beforeCrisis('play-with-peers')), 'ask-for-help');
  expect(supported.chronicle.at(-1)).toMatchObject({ message: expect.stringContaining('читали вместе') });
  expect(supported.wellbeing.mood).toBeGreaterThan(other.wellbeing.mood);
  expect(supported.randomState).toBe(first.randomState);
  expect(supported.relationships[0]?.trust).toBe(75);
  expect(advanceYear(supported).wellbeing.phase).toBe('resolved');
});

it('allows postponement, followed by gradual withdrawal and a change of environment', () => {
  const first = advanceYear(beforeCrisis('play-with-peers'));
  const waiting = resolveCrisisChoice(first, 'wait');
  expect(advanceMonth(waiting).wellbeing.phase).toBe('strain');
  const followup = advanceYear(waiting);
  expect(followup.ageInMonths).toBe(183);
  expect(followup.wellbeing.phase).toBe('withdrawn');
  expect(availableCrisisChoices(followup).map(({ id }) => id)).toEqual(['ask-for-help', 'change-group']);
  const healing = resolveCrisisChoice(followup, 'change-group');
  expect(advanceMonth(healing).wellbeing.phase).toBe('recovering');
  expect(advanceYear(healing).wellbeing.phase).toBe('resolved');
});

it('turns accumulated loss into a mental health pause and offers a recovery path', () => {
  const life = startLife(createLife({ name: 'Илья', sex: 'male', seed: 11 }));
  const stressed: LifeSnapshot = {
    ...life,
    ageInMonths: 240,
    chronicle: [
      ...life.chronicle,
      { type: 'parent-death', role: 'mother', ageInMonths: 230 },
      { type: 'crisis', ageInMonths: 235, message: 'Стало трудно справляться.' },
    ],
  };
  const paused = advanceWellbeing(stressed);
  expect(paused.status).toEqual({ type: 'decision', decision: 'mental-health' });
  expect(paused.wellbeing.mentalHealth?.condition).toBe('anxiety');

  const supported = resolveCrisisChoice(paused, 'seek-care');
  expect(supported.status).toEqual({ type: 'active' });
  expect(supported.wellbeing.mentalHealth).toMatchObject({ condition: 'recovering', supported: true });
  expect(supported.chronicle.at(-1)).toMatchObject({ type: 'crisis' });
});

it('can worsen an unsupported anxious state into depression', () => {
  const life = startLife(createLife({ name: 'Олег', sex: 'male', seed: 12 }));
  const stressed: LifeSnapshot = {
    ...life,
    ageInMonths: 240,
    chronicle: [
      ...life.chronicle,
      { type: 'parent-death', role: 'father', ageInMonths: 230 },
      { type: 'crisis', ageInMonths: 235, message: 'Стало трудно справляться.' },
    ],
  };
  const anxious = advanceWellbeing(stressed);
  const untreated = resolveCrisisChoice(anxious, 'continue-as-usual');
  const monthLater = advanceWellbeing({ ...untreated, ageInMonths: 241 });
  const depressed = advanceWellbeing({ ...monthLater, ageInMonths: 242 });
  expect(depressed.wellbeing.mentalHealth?.condition).toBe('depression');
});

it('pauses at critical risk and offers urgent support without a harmful outcome', () => {
  const life = startLife(createLife({ name: 'Лена', sex: 'female', seed: 18 }));
  const stressed: LifeSnapshot = {
    ...life,
    ageInMonths: 17 * 12,
    wellbeing: {
      ...life.wellbeing,
      mentalHealth: { condition: 'depression', severity: 2, months: 2, supported: false },
    },
    chronicle: [
      ...life.chronicle,
      { type: 'world', id: 'school-bullying', ageInMonths: 195, effects: { mood: -8 } },
      { type: 'world', id: 'online-harassment', ageInMonths: 196, effects: { mood: -9 } },
    ],
  };
  const paused = advanceWellbeing(stressed);
  expect(paused.status).toEqual({ type: 'decision', decision: 'mental-health' });
  expect(paused.wellbeing.mentalHealth?.condition).toBe('critical-risk');
  expect(availableCrisisChoices(paused).map(({ id }) => id)).toContain('urgent-support');

  const supported = resolveCrisisChoice(paused, 'urgent-support');
  expect(supported.status).toEqual({ type: 'active' });
  expect(supported.wellbeing.mentalHealth).toMatchObject({ condition: 'recovering', supported: true });
  expect(supported.chronicle.at(-1)).toMatchObject({ type: 'crisis' });
});
