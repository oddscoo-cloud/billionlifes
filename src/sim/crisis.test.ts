import { expect, it } from 'vitest';
import { availableCrisisChoices, resolveCrisisChoice } from './crisis';
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
