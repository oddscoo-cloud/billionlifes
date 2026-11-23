import type { LifeSnapshot } from './life';

export type PhysicalCondition = 'stable' | 'recovering' | 'chronic' | 'serious';

export interface PhysicalHealth {
  readonly condition: PhysicalCondition;
  readonly severity: 0 | 1 | 2 | 3;
  readonly months: number;
  readonly supported: boolean;
}

export function initialPhysicalHealth(startingHealth: LifeSnapshot['birth']['startingHealth']): PhysicalHealth {
  return startingHealth === 'needs-support'
    ? { condition: 'recovering', severity: 1, months: 0, supported: true }
    : { condition: 'stable', severity: 0, months: 0, supported: false };
}

export function adjustedMortality(baseRisk: number, health: PhysicalHealth): number {
  const multiplier = health.condition === 'serious' ? 2.5
    : health.condition === 'chronic' ? 1.5
      : health.condition === 'recovering' ? 1.25 : 1;
  return Math.min(0.95, baseRisk * multiplier);
}

export function seekMedicalCare(life: LifeSnapshot): LifeSnapshot {
  if (life.physicalHealth.condition !== 'serious') return life;
  return {
    ...life,
    physicalHealth: { condition: 'recovering', severity: 1, months: 0, supported: true },
    chronicle: [...life.chronicle, {
      type: 'crisis', ageInMonths: life.ageInMonths,
      message: 'Герой обратился за медицинской помощью. Появился план наблюдения и восстановления.',
    }],
  };
}

export function advancePhysicalHealth(life: LifeSnapshot): LifeSnapshot {
  const current = life.physicalHealth;
  if (!current) return life;
  const recent = life.chronicle.slice(-8);
  const illness = recent.some((event) => event.type === 'world'
    && (event.id === 'child-fever' || event.id === 'older-health'));
  const support = recent.some((event) => event.type === 'world'
    && (event.id === 'health-check' || event.id === 'health-followup'));
  if (current.condition === 'recovering' && support && !current.supported) {
    return { ...life, physicalHealth: { ...current, supported: true } };
  }
  if (current.condition === 'recovering' && illness && current.months >= 2 && !current.supported) {
    return { ...life, physicalHealth: { condition: 'serious', severity: 2, months: current.months, supported: false } };
  }
  if (illness && current.condition === 'stable') {
    return {
      ...life,
      physicalHealth: {
        condition: 'recovering', severity: life.ageInMonths >= 65 * 12 ? 2 : 1, months: 0, supported: false,
      },
    };
  }
  if (current.condition !== 'recovering') return life;
  const months = current.months + 1;
  if (months < (current.supported ? 3 : 5)) {
    return { ...life, physicalHealth: { ...current, months } };
  }
  return {
    ...life,
    physicalHealth: { condition: 'stable', severity: 0, months: 0, supported: current.supported },
  };
}

export function healthStatus(life: LifeSnapshot): { label: string; detail: string } {
  if (life.status.type === 'dead') return { label: 'Жизнь завершилась', detail: '' };
  if (life.physicalHealth?.condition === 'serious') {
    return { label: 'Серьёзное ухудшение', detail: 'Нужна медицинская помощь и наблюдение.' };
  }
  if (life.physicalHealth?.condition === 'recovering') {
    return { label: 'Восстановление', detail: 'После недавнего ухудшения ещё нужно время на восстановление.' };
  }
  const age = life.ageInMonths;
  const illness = life.chronicle.slice(-16).reverse().find((event) =>
    event.type === 'world' && (event.id === 'child-fever' || event.id === 'older-health')
    && age - event.ageInMonths <= 2);
  if (illness) return age === illness.ageInMonths
    ? { label: 'Недомогание', detail: 'В этом месяце самочувствие ухудшилось.' }
    : { label: 'Восстанавливается', detail: 'После недомогания ещё нужно время на восстановление.' };
  if (age < 12 && life.birth.startingHealth === 'needs-support') {
    return { label: 'Нужно наблюдение', detail: 'Здоровье с рождения требует поддержки.' };
  }
  return { label: 'Стабильное', detail: 'В последние месяцы заметных проблем со здоровьем не было.' };
}
