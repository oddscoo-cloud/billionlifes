import { expect, it } from 'vitest';
import { createLife } from './birth';
import { adjustedMortality, advancePhysicalHealth, seekMedicalCare } from './health';
import { startLife } from './life';

it('turns an unsupported illness into a serious physical state', () => {
  const life = startLife(createLife({ name: 'Лена', sex: 'female', seed: 18 }));
  const ill = {
    ...life,
    ageInMonths: 16 * 12,
    physicalHealth: { condition: 'recovering' as const, severity: 1 as const, months: 2, supported: false },
    chronicle: [...life.chronicle, {
      type: 'world' as const, id: 'older-health' as const, ageInMonths: 191, effects: { mood: -3 },
    }],
  };
  expect(advancePhysicalHealth(ill).physicalHealth).toEqual({
    condition: 'serious', severity: 2, months: 2, supported: false,
  });
});

it('lets a health follow-up connect an illness to recovery', () => {
  const life = startLife(createLife({ name: 'Лена', sex: 'female', seed: 19 }));
  const ill = {
    ...life,
    ageInMonths: 12,
    physicalHealth: { condition: 'recovering' as const, severity: 1 as const, months: 1, supported: false },
    chronicle: [...life.chronicle, {
      type: 'world' as const, id: 'health-followup' as const, ageInMonths: 11, effects: { mood: 2 },
    }],
  };
  expect(advancePhysicalHealth(ill).physicalHealth?.supported).toBe(true);
});

it('raises mortality risk for serious health and offers recovery through care', () => {
  const life = startLife(createLife({ name: 'Лена', sex: 'female', seed: 20 }));
  const serious = {
    ...life,
    physicalHealth: { condition: 'serious' as const, severity: 2 as const, months: 87, supported: false },
  };
  expect(adjustedMortality(0.1, serious.physicalHealth)).toBe(0.25);
  expect(seekMedicalCare(serious).physicalHealth).toEqual({
    condition: 'recovering', severity: 1, months: 0, supported: true,
  });
});
