import { expect, it } from 'vitest';
import { alternateLives } from './alternate-lives';
import { createLife } from './birth';
import { startLife } from './life';

it('builds alternatives from major choices without changing the saved life', () => {
  const life = startLife(createLife({ name: 'Ира', sex: 'female', seed: 1 }));
  const chosen = {
    ...life,
    development: { ...life.development, career: 'creative' as const },
    chronicle: [
      ...life.chronicle,
      { type: 'action' as const, ageInMonths: 300, action: { id: 'start-project' as const, project: 'cafe' as const }, succeeded: true, chance: 1 },
      { type: 'turning-choice' as const, id: 'moral-family-time' as const, response: 0 as const, ageInMonths: 360 },
    ],
  };
  expect(alternateLives(chosen).map(({ basis }) => basis))
    .toEqual(expect.arrayContaining(['большой жизненный проект', 'моральная дилемма', 'карьерная траектория']));
  expect(chosen.development.project).toBeNull();
});
