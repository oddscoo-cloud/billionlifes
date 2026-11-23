import type { CountryCode } from '../data/demographics';
import type { LifeAction } from '../sim/actions';
import { getLanguage, tr } from './i18n';
import { deathCauses } from '../sim/death-causes';
import { turningPoints } from '../sim/turning-points';
import { demographics } from '../data/demographics';
import { worldScene } from '../data/world-event-variants';
import { activities } from '../sim/actions';
import type { ChildhoodChoice, LifeEvent, LifeStatus } from '../sim/life';
import type { CareerPath, LifeProject, Plan } from '../sim/growth';

export const planLabels: Record<Plan, string> = {
  study: tr('Учёба'), 'practice-art': tr('Творчество'), community: tr('Общение'), 'personal-care': tr('Стиль и уход'),
};

export const childhoodLabels: Record<ChildhoodChoice, string> = {
  'read-with-caregiver': tr('Почитать с опекуном'), 'play-with-peers': tr('Поиграть со сверстниками'),
};

export const decisionLabels: Record<Extract<LifeStatus, { type: 'decision' }>['decision'], string> = {
  'first-childhood-activity': tr('Первое самостоятельное решение'),
  'teen-activity': tr('Занятие для подростка'),
  'adult-path': tr('Начало взрослой жизни'),
  'later-life': tr('Решение о жизни после 65'),
  'turning-point': tr('Трудный выбор'),
  'family-loss': tr('Потеря близкого'),
  'school-crisis': tr('Трудности в учебной группе'),
  'mental-health': tr('Состояние психического здоровья'),
};

export const educationLabels = {
  general: tr('Общее'), vocational: tr('Профессиональное'), higher: tr('Высшее'),
};

export const employmentLabels = {
  unemployed: tr('Без работы'), 'entry-level': tr('Работа начального уровня'),
  specialist: tr('Работа по специальности'), retired: tr('На пенсии'),
};
export const careerLabels: Record<CareerPath, string> = {
  technology: tr('Технологии'),
  healthcare: tr('Здравоохранение'),
  trades: tr('Ремесло и производство'),
  creative: tr('Творческие индустрии'),
  'public-service': tr('Государственная служба'),
};
export const projectLabels: Record<LifeProject, string> = {
  shop: tr('Магазин'),
  stall: tr('Лавка'),
  cafe: tr('Кофейня'),
};

export const skillLabels = {
  academics: tr('Учёба'), creativity: tr('Творчество'), communication: tr('Общение'),
  resilience: tr('Стойкость'), practical: tr('Практичность'), empathy: tr('Эмпатия'),
};
export const peopleLabels = { caregiver: tr('Опекун'), friend: tr('Друг детства'), colleague: tr('Коллега'), neighbor: tr('Сосед') };
export const friendRoleLabels = {
  friend: tr('Друг'),
  confidant: tr('Доверенное лицо'),
  mentor: tr('Наставник'),
  rival: tr('Соперник'),
  distant: tr('Друг на расстоянии'),
} as const;
export const phaseLabels = {
  none: tr('Стабильное состояние'), strain: tr('Трудности в группе'), withdrawn: tr('Замкнутость'),
  recovering: tr('Восстановление'), resolved: tr('Кризис пройден'),
};
export const mentalHealthLabels = {
  none: tr('Нет устойчивых признаков расстройства'),
  anxiety: tr('Тревожное состояние'),
  depression: tr('Депрессивное состояние'),
  burnout: tr('Истощение'),
  'critical-risk': tr('Критический риск: нужна срочная поддержка'),
  recovering: tr('Восстановление'),
};
export const mentalSeverityLabels = {
  0: tr('Нет заметных признаков'),
  1: tr('Лёгкая выраженность'),
  2: tr('Сильная выраженность'),
  3: tr('Критическая выраженность'),
} as const;
export const physicalHealthLabels = {
  stable: tr('Стабильное'),
  recovering: tr('Восстановление'),
  chronic: tr('Хроническое состояние'),
  serious: tr('Серьёзное ухудшение'),
} as const;

const language = getLanguage();
const regions = language === 'ru' ? null : new Intl.DisplayNames(language, { type: 'region' });
const years = new Intl.NumberFormat(language, { style: 'unit', unit: 'year', unitDisplay: 'short' });
const monthsFormat = new Intl.NumberFormat(language, { style: 'unit', unit: 'month', unitDisplay: 'short' });

export function countryLabel(code: CountryCode): string {
  return regions?.of(code) ?? demographics.countries[code].name;
}

export function actionLabel(action: LifeAction): string {
  if (action.id === 'move') return tr`Переехать: ${countryLabel(action.destination)}`;
  if (action.id === 'choose-career') return tr`Выбрать траекторию: ${careerLabels[action.career]}`;
  if (action.id === 'start-project') return tr`Начать проект: ${projectLabels[action.project]}`;
  return tr(activities[action.id]);
}

export function crisisMessage(message: string): string {
  const match = /^([^:]+): «(.+)»\.$/u.exec(message);
  if (!match) return tr(message);
  const [, speaker, line] = match;
  const name = tr(speaker!.toLowerCase());
  const caption = name[0]!.toLocaleUpperCase(language) + name.slice(1);
  if (line === 'Помнишь, как мы читали вместе? Я рядом. Давай поговорим') {
    return tr`${caption}: «Помнишь, как мы читали вместе? Я рядом. Давай поговорим».`;
  }
  if (line === 'Спасибо, что рассказал. Давай подумаем, как тебе помочь') {
    return tr`${caption}: «Спасибо, что рассказал. Давай подумаем, как тебе помочь».`;
  }
  return tr(message);
}

export function healthDetail(detail: string): string {
  const risk = /^Без обращения риск растёт с каждым годом\. Сейчас риск составляет ×([\d.]+) относительно обычного; следующий рост через (\d+) мес\.$/u.exec(detail);
  if (!risk) return tr(detail);
  const multiplier = new Intl.NumberFormat(language, { minimumFractionDigits: 1 }).format(Number(risk[1]));
  return tr`Без обращения риск растёт с каждым годом. Сейчас риск составляет ×${multiplier} относительно обычного; следующий рост через ${risk[2]} мес.`;
}

export function ageLabel(months: number): string {
  if (language === 'ru') return months < 12 ? `${months} мес.` : `${Math.floor(months / 12)} г. ${months % 12} мес.`;
  return months < 12 ? monthsFormat.format(months)
    : `${years.format(Math.floor(months / 12))} ${monthsFormat.format(months % 12)}`;
}

export function eventLabel(event: LifeEvent): string {
  switch (event.type) {
    case 'turning-point': return tr(turningPoints[event.id].title);
    case 'turning-choice': return tr(turningPoints[event.id].responses[event.response].outcome);
    case 'turning-consequence': return tr(turningPoints[event.id].responses[event.response].followup);
    case 'sibling-death': return event.role === 'Сестра' ? tr('Умерла сестра') : tr('Умер брат');
    case 'sibling-visit': return event.role === 'Сестра' ? tr('Герой провёл время с сестрой') : tr('Герой провёл время с братом');
    case 'romance': {
      switch (event.step) {
        case 'meet': return tr`Появилась симпатия к человеку по имени ${tr(event.name)}`;
        case 'date': return tr`Начались отношения · ${tr(event.name)}`;
        case 'spend-time': return tr`Время вдвоём · ${tr(event.name)}`;
        case 'love': return tr`Чувства оказались взаимными · ${tr(event.name)}`;
        case 'end': return tr`Романтическая история завершилась · ${tr(event.name)}`;
      }
    }
    case 'parent-death': return event.role === 'mother' ? tr('Мама умерла') : tr('Папа умер');
    case 'family-response': return event.choice === 'support' ? tr('Герой обратился за поддержкой') : tr('Герой вспомнил хорошие моменты');
    case 'world': return tr(worldScene(event.id, event.variant)[0]);
    case 'birth': return tr('Началась жизнь');
    case 'childhood-year': return tr('День рождения');
    case 'death': return event.cause ? tr`Жизнь завершилась · ${tr(deathCauses[event.cause][0]).toLocaleLowerCase(language)}` : tr('Жизнь завершилась');
    case 'childhood-choice': return childhoodLabels[event.choice];
    case 'crisis': return crisisMessage(event.message);
    case 'plan': return event.plan ? tr`План — ${planLabels[event.plan]}` : tr('План отменён');
    case 'action': {
      if (event.action.id === 'move') return tr`Переезд в страну «${countryLabel(event.action.destination)}»`;
      const outcome = event.succeeded ? tr('получилось') : tr('попытка не удалась');
      return `${actionLabel(event.action)} — ${outcome}`;
    }
  }
}

export function wealthLabel(funds: number): string {
  if (funds <= 1) return tr('Крайняя бедность');
  if (funds <= 3) return tr('Бедность');
  if (funds <= 9) return tr('Скромный достаток');
  if (funds <= 24) return tr('Достаток');
  if (funds <= 59) return tr('Обеспеченность');
  return tr('Богатство');
}
