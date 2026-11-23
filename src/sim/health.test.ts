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
    condition: 'serious', severity: 2, months: 0, supported: false,
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
  expect(adjustedMortality(0.1, serious.physicalHealth)).toBe(0.55);
  expect(seekMedicalCare(serious).physicalHealth).toEqual({
    condition: 'recovering', severity: 1, months: 0, supported: true,
  });
});

it('raises untreated serious-health mortality risk each year and then caps it', () => {
  const life = startLife(createLife({ name: 'Лена', sex: 'female', seed: 21 }));
  const months = [0, 12, 24, 120] as const;
  const multipliers = months.map((untreatedMonths) => adjustedMortality(
    0.1,
    { condition: 'serious', severity: 2, months: untreatedMonths, supported: false },
  ));
  expect(multipliers[0]).toBe(0.25);
  expect(multipliers[1]).toBeCloseTo(0.3);
  expect(multipliers[2]).toBeCloseTo(0.35);
  expect(multipliers[3]).toBe(0.55);
});

it('counts every month spent in a serious untreated state', () => {
  const life = startLife(createLife({ name: 'Лена', sex: 'female', seed: 22 }));
  const serious = {
    ...life,
    physicalHealth: { condition: 'serious' as const, severity: 2 as const, months: 11, supported: false },
  };
  expect(advancePhysicalHealth(serious).physicalHealth.months).toBe(12);
});

it('can turn a prolonged supported illness into chronic health', () => {
  const life = startLife(createLife({ name: 'Лена', sex: 'female', seed: 23 }));
  const recovering = {
    ...life,
    ageInMonths: 16 * 12,
    physicalHealth: { condition: 'recovering' as const, severity: 1 as const, months: 3, supported: true },
    chronicle: [...life.chronicle, {
      type: 'world' as const, id: 'older-health' as const, ageInMonths: 191, effects: { mood: -3 },
    }],
  };
  expect(advancePhysicalHealth(recovering).physicalHealth).toEqual({
    condition: 'chronic', severity: 2, months: 0, supported: true,
  });
});
