import { deathCauses } from '../sim/death-causes';
import { turningPoints } from '../sim/turning-points';
import { demographics } from '../data/demographics';
import { worldScene } from '../data/world-event-variants';
import { activities } from '../sim/actions';
import type { ChildhoodChoice, LifeEvent, LifeStatus } from '../sim/life';
import type { Plan } from '../sim/growth';

export const planLabels: Record<Plan, string> = {
  study: 'Учёба', 'practice-art': 'Творчество', community: 'Общение', 'personal-care': 'Стиль и уход',
};

export const childhoodLabels: Record<ChildhoodChoice, string> = {
  'read-with-caregiver': 'Почитать с опекуном', 'play-with-peers': 'Поиграть со сверстниками',
};

export const decisionLabels: Record<Extract<LifeStatus, { type: 'decision' }>['decision'], string> = {
  'first-childhood-activity': 'Первое самостоятельное решение',
  'teen-activity': 'Занятие для подростка',
  'adult-path': 'Начало взрослой жизни',
  'later-life': 'Решение о жизни после 65',
  'turning-point': 'Трудный выбор',
  'family-loss': 'Потеря близкого',
  'school-crisis': 'Трудности в учебной группе',
  'mental-health': 'Состояние психического здоровья',
};

export const educationLabels = {
  general: 'Общее', vocational: 'Профессиональное', higher: 'Высшее',
};

export const employmentLabels = {
  unemployed: 'Без работы', 'entry-level': 'Работа начального уровня',
  specialist: 'Работа по специальности', retired: 'На пенсии',
};

export const skillLabels = { academics: 'Учёба', creativity: 'Творчество', communication: 'Общение' };
export const peopleLabels = { caregiver: 'Опекун', friend: 'Друг детства', colleague: 'Коллега', neighbor: 'Сосед' };
export const phaseLabels = {
  none: 'Стабильное состояние', strain: 'Трудности в группе', withdrawn: 'Замкнутость',
  recovering: 'Восстановление', resolved: 'Кризис пройден',
};
export const mentalHealthLabels = {
  none: 'Стабильное состояние',
  anxiety: 'Тревожное состояние',
  depression: 'Депрессивное состояние',
  burnout: 'Истощение',
  recovering: 'Восстановление',
};

export function ageLabel(months: number): string {
  return months < 12 ? `${months} мес.` : `${Math.floor(months / 12)} г. ${months % 12} мес.`;
}

export function eventLabel(event: LifeEvent): string {
  switch (event.type) {
    case 'turning-point': return turningPoints[event.id].title;
    case 'turning-choice': return turningPoints[event.id].responses[event.response].outcome;
    case 'turning-consequence': return turningPoints[event.id].responses[event.response].followup;
    case 'sibling-death': return event.role === 'Сестра' ? 'Умерла сестра' : 'Умер брат';
    case 'sibling-visit': return event.role === 'Сестра' ? 'Герой провёл время с сестрой' : 'Герой провёл время с братом';
    case 'romance': {
      switch (event.step) {
        case 'meet': return `Появилась симпатия к человеку по имени ${event.name}`;
        case 'date': return `Начались отношения · ${event.name}`;
        case 'spend-time': return `Время вдвоём · ${event.name}`;
        case 'love': return `Чувства оказались взаимными · ${event.name}`;
        case 'end': return `Романтическая история завершилась · ${event.name}`;
      }
    }
    case 'parent-death': return event.role === 'mother' ? 'Мама умерла' : 'Папа умер';
    case 'family-response': return event.choice === 'support' ? 'Герой обратился за поддержкой' : 'Герой вспомнил хорошие моменты';
    case 'world': return worldScene(event.id, event.variant)[0];
    case 'birth': return 'Началась жизнь';
    case 'childhood-year': return 'День рождения';
    case 'death': return event.cause ? `Жизнь завершилась · ${deathCauses[event.cause][0].toLowerCase()}` : 'Жизнь завершилась';
    case 'childhood-choice': return childhoodLabels[event.choice];
    case 'crisis': return event.message;
    case 'plan': return event.plan ? `План — ${planLabels[event.plan]}` : 'План отменён';
    case 'action': {
      if (event.action.id === 'move') return `Переезд в страну «${demographics.countries[event.action.destination].name}»`;
      const outcome = event.succeeded ? 'получилось' : 'попытка не удалась';
      return `${activities[event.action.id]} — ${outcome}`;
    }
  }
}

export function wealthLabel(funds: number): string {
  if (funds <= 1) return 'Крайняя бедность';
  if (funds <= 3) return 'Бедность';
  if (funds <= 9) return 'Скромный достаток';
  if (funds <= 24) return 'Достаток';
  if (funds <= 59) return 'Обеспеченность';
  return 'Богатство';
}
