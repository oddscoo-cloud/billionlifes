import type { LifeSnapshot } from './life';

export function healthStatus(life: LifeSnapshot): { label: string; detail: string } {
  if (life.status.type === 'dead') return { label: 'Жизнь завершилась', detail: '' };
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
