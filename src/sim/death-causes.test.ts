import { expect, it } from 'vitest';
import { createLife } from './birth';
import { chooseDeathCause, finalCause } from './death-causes';
import { startLife } from './life';

const newborn = () => startLife(createLife({ name: 'Лия', sex: 'female', seed: 42 }));

it('explains death in early childhood and uses a recent illness when appropriate', () => {
  const life = newborn();
  expect(['child-illness', 'home-accident']).toContain(chooseDeathCause(life, 48));
  const chronicle = [...life.chronicle, { type: 'world', id: 'child-fever', ageInMonths: 46, effects: {} } as const];
  const linked = Array.from({ length: 20 }, (_, seed) => seed).some((seed) =>
    chooseDeathCause({ ...life, seed, chronicle }, 48) === 'infection-complications');
  expect(linked).toBe(true);
});

it('can explain a finished save from before causes were recorded', () => {
  const life = newborn();
  const saved = {
    ...life, ageInMonths: 48, status: { type: 'dead' } as const,
    chronicle: [...life.chronicle, { type: 'death', ageInMonths: 48 } as const],
  };
  expect(finalCause(saved)).toBe(chooseDeathCause(life, 48));
  expect(finalCause({
    ...saved, chronicle: [...life.chronicle, { type: 'death', ageInMonths: 48, cause: 'home-accident' }],
  })).toBe('home-accident');
});
