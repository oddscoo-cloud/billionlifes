import type { LifeSnapshot } from './life';

export type AchievementId =
  | 'grown'
  | 'educated'
  | 'career'
  | 'traveler'
  | 'connected'
  | 'resilient'
  | 'mentor'
  | 'long-life';

export interface Achievement {
  readonly id: AchievementId;
  readonly title: string;
  readonly description: string;
  readonly unlocked: boolean;
}

export function achievements(life: LifeSnapshot): readonly Achievement[] {
  const familyLosses = life.chronicle.filter((event) =>
    event.type === 'sibling-death' || event.type === 'parent-death').length;
  const recovery = life.chronicle.filter((event) =>
    event.type === 'crisis' && event.choice !== undefined).length;
  const moves = life.chronicle.filter((event) =>
    event.type === 'action' && event.action.id === 'move' && event.succeeded).length;
  const trusted = life.relationships.some((person) => person.trust >= 80);

  const items: readonly (Achievement & { unlocked: boolean })[] = [
    { id: 'grown', title: 'Первый шаг во взрослую жизнь', description: 'Прожито не менее 18 лет.', unlocked: life.ageInMonths >= 18 * 12 },
    { id: 'educated', title: 'Путь знаний', description: 'Получено высшее образование.', unlocked: life.development.education === 'higher' },
    { id: 'career', title: 'Профессиональный рост', description: 'Выбрана карьера и достигнут уровень специалиста.', unlocked: life.development.employment === 'specialist' && life.development.career !== null },
    { id: 'traveler', title: 'Новая родина', description: 'Совершён переезд в другую страну.', unlocked: moves > 0 },
    { id: 'connected', title: 'Надёжный круг', description: 'У одного из близких доверие достигло 80.', unlocked: trusted },
    { id: 'resilient', title: 'Через трудности', description: 'Принято не менее двух решений в трудных ситуациях.', unlocked: recovery >= 2 || familyLosses > 0 && recovery >= 1 },
    { id: 'mentor', title: 'Передать опыт', description: 'Начат жизненный проект или наставничество.', unlocked: life.development.project !== null || life.chronicle.some((event) => event.type === 'action' && event.action.id === 'mentor') },
    { id: 'long-life', title: 'Долгая дорога', description: 'Прожито 65 лет.', unlocked: life.ageInMonths >= 65 * 12 },
  ];
  return items;
}
