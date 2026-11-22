import { describe, expect, it } from 'vitest';
import { completedYears } from './age';

describe('completedYears', () => {
  it.each([
    [0, 0],
    [11, 0],
    [12, 1],
    [47, 3],
    [48, 4],
  ])('converts %i months to %i full years', (months, years) => {
    expect(completedYears(months)).toBe(years);
  });
});
