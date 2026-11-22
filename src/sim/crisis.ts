import { familySupport } from './family';
import type { LifeSnapshot } from './life';
import { remember } from './relationships';

export const crisisChoices = ['ask-for-help', 'wait', 'change-group'] as const;
export type CrisisChoice = (typeof crisisChoices)[number];
export type CrisisPhase = 'none' | 'strain' | 'withdrawn' | 'recovering' | 'resolved';

export interface Wellbeing {
  readonly mood: number;
  readonly phase: CrisisPhase;
  readonly monthsInPhase: number;
  readonly support: boolean;
}

interface CrisisOption {
  readonly id: CrisisChoice;
  readonly label: string;
}

export function advanceWellbeing(life: LifeSnapshot): LifeSnapshot {
  const { wellbeing, ageInMonths } = life;
  if (ageInMonths === 15 * 12) {
    const hadWarning = life.chronicle.some((event) =>
      event.type === 'world' && event.id === 'school-rumor' && event.ageInMonths === ageInMonths - 1);
    const message = hadWarning
      ? 'Шутки в группе продолжились, и сегодня после занятия стало трудно вернуться в класс.'
      : 'После насмешек на занятии стало трудно возвращаться в группу.';
    return {
      ...life,
      wellbeing: { mood: Math.max(0, wellbeing.mood - 15), phase: 'strain', monthsInPhase: 0, support: false },
      status: { type: 'decision', decision: 'school-crisis' },
      chronicle: [...life.chronicle, {
        type: 'crisis', ageInMonths, message,
      }],
    };
  }

  if (wellbeing.phase === 'none' || wellbeing.phase === 'resolved') {
    const mood = wellbeing.mood > 80 ? wellbeing.mood - 1 : wellbeing.mood < 55 ? wellbeing.mood + 1 : wellbeing.mood;
    return mood === wellbeing.mood ? life : { ...life, wellbeing: { ...wellbeing, mood } };
  }
  const monthsInPhase = wellbeing.monthsInPhase + 1;
  if (wellbeing.phase === 'recovering') {
    const recovered = monthsInPhase >= (wellbeing.support ? 3 : 5);
    return {
      ...life,
      wellbeing: {
        ...wellbeing, mood: Math.min(100, wellbeing.mood + 5),
        phase: recovered ? 'resolved' : 'recovering', monthsInPhase: recovered ? 0 : monthsInPhase,
      },
      chronicle: recovered ? [...life.chronicle, {
        type: 'crisis', ageInMonths, message: 'С каждым месяцем становилось легче. Появились силы на привычные дела.',
      }] : life.chronicle,
    };
  }

  const withdrawn = wellbeing.phase === 'strain' && monthsInPhase >= 3;
  return {
    ...life,
    wellbeing: {
      ...wellbeing, mood: Math.max(20, wellbeing.mood - 4),
      phase: withdrawn ? 'withdrawn' : wellbeing.phase,
      monthsInPhase: withdrawn ? 0 : monthsInPhase,
    },
    status: withdrawn ? { type: 'decision', decision: 'school-crisis' } : life.status,
    chronicle: withdrawn ? [...life.chronicle, {
      type: 'crisis', ageInMonths, message: 'За три месяца стало труднее общаться. Пора решить, как изменить ситуацию.',
    }] : life.chronicle,
  };
}

export function availableCrisisChoices(life: LifeSnapshot): readonly CrisisOption[] {
  if (life.status.type !== 'decision' || life.status.decision !== 'school-crisis') return [];
  const choices: CrisisOption[] = [{ id: 'ask-for-help', label: `Попросить поддержки · ${familySupport(life)}` }];
  if (life.wellbeing.phase === 'strain') choices.push({ id: 'wait', label: 'Пока понаблюдать' });
  else choices.push({ id: 'change-group', label: 'Перейти в другую учебную группу' });
  return choices;
}

export function resolveCrisisChoice(life: LifeSnapshot, choice: CrisisChoice): LifeSnapshot {
  if (!availableCrisisChoices(life).some(({ id }) => id === choice)) return life;
  const { ageInMonths, wellbeing } = life;
  const support = choice === 'ask-for-help';
  const caregiver = life.relationships.find(({ id }) => id === 'caregiver');
  const remembersReading = caregiver?.memories.some(({ kind }) => kind === 'shared-reading');
  const speaker = familySupport(life);
  const label = speaker[0]!.toUpperCase() + speaker.slice(1);
  const message = support
    ? remembersReading
      ? `${label}: «Помнишь, как мы читали вместе? Я рядом. Давай поговорим».`
      : `${label}: «Спасибо, что рассказал. Давай подумаем, как тебе помочь».`
    : choice === 'change-group'
      ? 'В новой группе можно постепенно освоиться.'
      : 'Герой решил пока отложить разговор.';
  return {
    ...life,
    status: { type: 'active' },
    wellbeing: {
      ...wellbeing,
      mood: support ? Math.min(100, wellbeing.mood + (remembersReading ? 8 : 4)) : wellbeing.mood,
      phase: choice === 'wait' ? 'strain' : 'recovering',
      monthsInPhase: 0,
      support,
    },
    relationships: support
      ? remember(life.relationships, 'caregiver', { kind: 'asked-for-help', ageInMonths }, 10)
      : life.relationships,
    chronicle: [...life.chronicle, { type: 'crisis', ageInMonths, message, choice }],
  };
}
