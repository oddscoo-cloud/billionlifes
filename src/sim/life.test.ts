import { describe, expect, it } from 'vitest';
import { monthlyMortality } from '../data/demographics';
import { createLife } from './birth';
import {
  advanceMonth, advanceYear, availableChildhoodChoices, resolveChildhoodChoice, startLife,
} from './life';
import { drawRandom } from './random';

const newborn = () => startLife(createLife({ name: 'Алекс', sex: 'female', seed: 42 }));

function stateForRoll(min: number, max: number): number {
  for (let state = 0; state < 100_000; state += 1) {
    const { value } = drawRandom(state);
    if (value >= min && value < max) return state;
  }
  throw new Error('Expected a random state in the test interval');
}

describe('life progression', () => {
  it('replays a year as twelve identical monthly transitions', () => {
    const start = newborn();
    let monthly = start;
    for (let month = 0; month < 12; month += 1) monthly = advanceMonth(monthly);

    expect(monthly.ageInMonths).toBe(12);
    expect(advanceYear(newborn())).toEqual(monthly);
    expect(monthly.seed).toBe(start.seed);
    expect(monthly.randomState).not.toBe(start.randomState);
    expect(start.chronicle).toEqual([{ type: 'birth', ageInMonths: 0 }]);
  });

  it('records early childhood and pauses both modes at month 48', () => {
    let life = newborn();
    for (let month = 0; month < 43; month += 1) life = advanceMonth(life);
    expect(availableChildhoodChoices(life)).toEqual([]);
    expect(resolveChildhoodChoice(life, 'play-with-peers')).toBe(life);

    let monthly = life;
    for (let month = 0; month < 12; month += 1) monthly = advanceMonth(monthly);
    const paused = advanceYear(life);
    expect(paused).toEqual(monthly);
    expect(paused.ageInMonths).toBe(48);
    expect(paused.status).toEqual({ type: 'decision', decision: 'first-childhood-activity' });
    expect(paused.chronicle.map(({ ageInMonths }) => ageInMonths)).toEqual([0, 12, 24, 36, 48]);
    expect(advanceYear(paused)).toBe(paused);
    expect(advanceMonth(paused)).toBe(paused);

    for (const choice of availableChildhoodChoices(paused)) {
      const resumed = resolveChildhoodChoice(paused, choice);
      expect(resumed.status.type).toBe('active');
      expect(resumed.ageInMonths).toBe(48);
      expect(resumed.randomState).toBe(paused.randomState);
      expect(resumed.chronicle.at(-1)).toEqual({
        type: 'childhood-choice', ageInMonths: 48, choice,
      });
      expect(advanceMonth(resumed).ageInMonths).toBe(49);
    }
    expect(availableChildhoodChoices(paused)).toHaveLength(2);
  });

  it('uses residence for infant mortality and stops permanently in the fatal month', () => {
    const lowRisk = monthlyMortality('AU', 'female', 0);
    const highRisk = monthlyMortality('NG', 'female', 0);
    const start = {
      ...newborn(), countryOfResidence: 'NG' as const,
      randomState: stateForRoll(lowRisk, highRisk),
    };
    const dead = advanceYear(start);
    expect(dead).toEqual(advanceMonth(start));
    expect(dead.ageInMonths).toBe(1);
    expect(dead.status.type).toBe('dead');
    expect(dead.chronicle.at(-1)).toEqual({ type: 'death', ageInMonths: 1 });
    expect(advanceMonth(dead)).toBe(dead);
    expect(advanceYear(dead)).toBe(dead);
    expect(resolveChildhoodChoice(dead, 'play-with-peers')).toBe(dead);
    expect(advanceMonth({ ...start, countryOfResidence: 'AU' }).status.type).toBe('active');
  });

  it('gives death priority over the fourth birthday and its decision', () => {
    const life = newborn();
    const risk = monthlyMortality(life.countryOfResidence, life.birth.sex, 47);
    const dead = advanceMonth({ ...life, ageInMonths: 47, randomState: stateForRoll(0, risk) });
    expect(dead.status.type).toBe('dead');
    expect(dead.chronicle.slice(1)).toEqual([{ type: 'death', ageInMonths: 48 }]);
  });

  it('applies the open-band risk beyond age 100', () => {
    const life = newborn();
    const ageInMonths = 125 * 12;
    const risk = monthlyMortality(life.countryOfResidence, life.birth.sex, ageInMonths);
    const older = { ...life, ageInMonths };

    expect(advanceMonth({ ...older, randomState: stateForRoll(0, risk) }).status.type).toBe('dead');
    expect(advanceMonth({ ...older, randomState: stateForRoll(risk, 1) }).status.type).toBe('active');
  });
});
