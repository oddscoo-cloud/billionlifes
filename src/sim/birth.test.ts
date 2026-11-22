import { describe, expect, it } from 'vitest';
import { createLife } from './birth';
import { drawRandom } from './random';

describe('createLife', () => {
  const input = { name: ' Мария ', sex: 'female', seed: 2023 } as const;

  it('reproduces all starting conditions and the state for the next draw', () => {
    const life = createLife(input);
    expect(createLife({ ...input })).toEqual(life);
    expect(life.birth.name).toBe('Мария');
    expect(life.birth.sex).toBe('female');
    expect(life.ageInMonths).toBe(0);

    let expectedState: number = input.seed;
    for (let draw = 0; draw < 5; draw++) expectedState = drawRandom(expectedState).state;
    expect(life.randomState).toBe(expectedState);
  });

  it('keeps the seed-based birth conditions when only the chosen name or sex changes', () => {
    const initial = createLife(input);
    const renamed = createLife({ ...input, name: 'Алексей', sex: 'male' });
    expect(renamed).toEqual({
      ...initial,
      birth: { ...initial.birth, name: 'Алексей', sex: 'male' },
    });
  });

  it('produces different conditions for different seeds', () => {
    expect(createLife({ ...input, seed: 1 }).birth).not.toEqual(createLife(input).birth);
  });

  it.each([-1, 2 ** 32, 1.5, Infinity])('rejects invalid seed %s', (seed) => {
    expect(() => createLife({ ...input, seed })).toThrow(RangeError);
  });

  it('rejects a blank name', () => {
    expect(() => createLife({ ...input, name: '  ' })).toThrow(RangeError);
  });
});
