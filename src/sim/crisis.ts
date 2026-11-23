import { familySupport } from './family';
import type { LifeSnapshot } from './life';
import { remember } from './relationships';

export const crisisChoices = ['ask-for-help', 'wait', 'change-group'] as const;
export const mentalHealthChoices = [
  'seek-care', 'ask-for-support', 'rest-and-routine', 'continue-as-usual', 'urgent-support',
] as const;
export type CrisisChoice = typeof crisisChoices[number] | typeof mentalHealthChoices[number];
export type CrisisPhase = 'none' | 'strain' | 'withdrawn' | 'recovering' | 'resolved';
export type MentalHealthCondition = 'none' | 'anxiety' | 'depression' | 'burnout' | 'critical-risk' | 'recovering';

export interface MentalHealth {
  readonly condition: MentalHealthCondition;
  readonly severity: 0 | 1 | 2 | 3;
  readonly months: number;
  readonly supported: boolean;
}

export interface Wellbeing {
  readonly mood: number;
  readonly phase: CrisisPhase;
  readonly monthsInPhase: number;
  readonly support: boolean;
  readonly mentalHealth?: MentalHealth;
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
      wellbeing: {
        ...wellbeing,
        mood: Math.max(0, wellbeing.mood - 15),
        phase: 'strain',
        monthsInPhase: 0,
        support: false,
        mentalHealth: wellbeing.mentalHealth ?? {
          condition: 'none', severity: 0, months: 0, supported: false,
        },
      },
      status: { type: 'decision', decision: 'school-crisis' },
      chronicle: [...life.chronicle, {
        type: 'crisis', ageInMonths, message,
      }],
    };
  }

  const mental = advanceMentalHealth(life);
  if (mental !== life) return mental;

  if (wellbeing.phase === 'none' || wellbeing.phase === 'resolved') {
    const mood = wellbeing.mood > 80 ? wellbeing.mood - 1 : wellbeing.mood < 55 ? wellbeing.mood + 1 : wellbeing.mood;
    return mood === wellbeing.mood ? life : { ...life, wellbeing: { ...wellbeing, mood } };
  }

  function stressScore(life: LifeSnapshot): number {
    const cutoff = life.ageInMonths - 12;
    const raw = life.chronicle.reduce((score, event) => {
      if (event.ageInMonths < cutoff) return score;
      if (event.type === 'parent-death' || event.type === 'sibling-death') return score + 5;
      if (event.type === 'crisis') return score + (event.choice === 'ask-for-help' ? 0 : 2);
      if (event.type === 'turning-point') return score + (event.id === 'lost-job' ? 3 : 2);
      if (event.type === 'turning-choice' || event.type === 'turning-consequence') return score + 1;
      if (event.type === 'romance' && event.step === 'end') return score + 3;
      if (event.type === 'world') {
        const moodLoss = event.effects.mood ?? 0;
        if (life.ageInMonths >= 12 * 12) {
          if (moodLoss <= -7) return score + 3;
          if (moodLoss <= -3) return score + 2;
        } else if (moodLoss <= -3) {
          return score + 1;
        }
      }
      return score;
    }, 0);
    return Math.max(0, raw - Math.floor(life.development.skills.resilience / 20));
  }

  function hasTrustedSupport(life: LifeSnapshot): boolean {
    return life.wellbeing.support || life.relationships.some(({ trust }) => trust >= 60);
  }

  function mentalEvent(life: LifeSnapshot, message: string): LifeSnapshot {
    return {
      ...life,
      status: { type: 'decision', decision: 'mental-health' },
      chronicle: [...life.chronicle, { type: 'crisis', ageInMonths: life.ageInMonths, message }],
    };
  }

  function advanceMentalHealth(life: LifeSnapshot): LifeSnapshot {
    if (life.ageInMonths < 12 * 12 || life.status.type !== 'active') return life;
    if (life.wellbeing.phase !== 'none' && life.wellbeing.phase !== 'resolved') return life;
    const current = life.wellbeing.mentalHealth ?? {
      condition: 'none' as const, severity: 0 as const, months: 0, supported: false,
    };
    const stress = stressScore(life);
    const support = hasTrustedSupport(life);
    if (current.condition === 'none' && stress >= 4 && !support) {
      return mentalEvent({
        ...life,
        wellbeing: { ...life.wellbeing, mentalHealth: {
          condition: stress >= 9 ? 'depression' : 'anxiety', severity: stress >= 9 ? 2 : 1, months: 0, supported: false,
        } },
      }, stress >= 9
        ? 'Сил стало заметно меньше, а привычные дела начали казаться непосильными. Это не просто плохой день — нужна поддержка.'
        : 'Тревога стала возвращаться чаще и мешать обычным делам. Пора отнестись к этому серьёзно.');
    }
    if (current.condition === 'anxiety' && current.months >= 2 && stress >= 3 && !support) {
      return mentalEvent({
        ...life,
        wellbeing: { ...life.wellbeing, mentalHealth: { ...current, condition: 'depression', severity: 2 } },
      }, 'Тревога не отступала несколько месяцев. Стало трудно радоваться и заботиться о себе, даже когда внешне всё выглядело обычно.');
    }
    if ((current.condition === 'depression' || current.condition === 'burnout')
      && current.months >= 2 && stress >= 6 && !support) {
      return mentalEvent({
        ...life,
        wellbeing: { ...life.wellbeing, mentalHealth: {
          condition: 'critical-risk', severity: 3, months: current.months, supported: false,
        } },
      }, 'Состояние стало критическим: появились мысли о том, чтобы причинить себе вред. Нужна срочная помощь и человек рядом.');
    }
    const months = current.months + 1;
    if (current.condition === 'none') return life;
    if ((current.condition === 'anxiety' || current.condition === 'depression') && stress >= 6
      && !support && life.development.employment !== 'unemployed' && months >= 2) {
      return mentalEvent({
        ...life,
        wellbeing: { ...life.wellbeing, mentalHealth: { ...current, condition: 'burnout', severity: Math.max(current.severity, 2) as 0 | 1 | 2 | 3, months } },
      }, 'Постоянное напряжение и нагрузка начали отнимать силы быстрее, чем они восстанавливались. Нужны изменения, а не ещё больше усилий.');
    }
    const recoveryMonths = Math.max(4, 6 - Math.floor(life.development.skills.resilience / 50));
    if (current.condition === 'recovering' && support && stress <= 2 && months >= recoveryMonths) {
      return {
        ...life,
        wellbeing: { ...life.wellbeing, mentalHealth: { condition: 'none', severity: 0, months: 0, supported: true } },
        chronicle: [...life.chronicle, { type: 'crisis', ageInMonths: life.ageInMonths, message: 'Постепенно стало легче просить о помощи и возвращаться к обычным делам.' }],
      };
    }
    if (current.condition !== 'recovering' && current.supported && support && stress <= 2 && months >= recoveryMonths) {
      return {
        ...life,
        wellbeing: { ...life.wellbeing, mentalHealth: { condition: 'none', severity: 0, months: 0, supported: true } },
        chronicle: [...life.chronicle, { type: 'crisis', ageInMonths: life.ageInMonths, message: 'Поддержка стала частью жизни, а тяжёлый период постепенно остался позади.' }],
      };
    }
    return {
      ...life,
      wellbeing: { ...life.wellbeing, mentalHealth: { ...current, months, supported: current.supported && support } },
    };
  }
  const monthsInPhase = wellbeing.monthsInPhase + 1;
  if (wellbeing.phase === 'recovering') {
    const recovered = monthsInPhase >= (wellbeing.support ? 4 : 6);
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
  if (life.status.type !== 'decision') return [];
  if (life.status.decision === 'mental-health') {
    if (life.wellbeing.mentalHealth?.condition === 'critical-risk') {
      return [
        { id: 'urgent-support', label: 'Обратиться за срочной помощью' },
        { id: 'ask-for-support', label: 'Сразу рассказать близкому человеку' },
        { id: 'seek-care', label: 'Составить план лечения со специалистом' },
      ];
    }
    return [
      { id: 'seek-care', label: 'Обратиться за профессиональной помощью' },
      { id: 'ask-for-support', label: 'Рассказать близкому человеку' },
      { id: 'rest-and-routine', label: 'Снизить нагрузку и восстановить режим' },
      { id: 'continue-as-usual', label: 'Пока ничего не менять' },
    ];
  }
  if (life.status.decision !== 'school-crisis') return [];
  const choices: CrisisOption[] = [{ id: 'ask-for-help', label: `Попросить поддержки · ${familySupport(life)}` }];
  if (life.wellbeing.phase === 'strain') choices.push({ id: 'wait', label: 'Пока понаблюдать' });
  else choices.push({ id: 'change-group', label: 'Перейти в другую учебную группу' });
  return choices;
}

export function resolveCrisisChoice(life: LifeSnapshot, choice: CrisisChoice): LifeSnapshot {
  if (life.status.type === 'decision' && life.status.decision === 'mental-health'
    && mentalHealthChoices.includes(choice as typeof mentalHealthChoices[number])) {
    const mental: MentalHealth = life.wellbeing.mentalHealth ?? {
      condition: 'none', severity: 0, months: 0, supported: false,
    };
    const next = choice === 'urgent-support'
      ? { condition: 'recovering' as const, severity: 2 as const, months: 0, supported: true }
      : choice === 'seek-care'
        ? { condition: 'recovering' as const, severity: Math.max(1, mental.severity - 1) as 0 | 1 | 2 | 3, months: 0, supported: true }
      : choice === 'ask-for-support'
        ? { ...mental, severity: Math.max(1, mental.severity - 1) as 0 | 1 | 2 | 3, months: 0, supported: true }
        : choice === 'rest-and-routine'
          ? { condition: 'recovering' as const, severity: mental.severity, months: 0, supported: true }
          : { ...mental, months: mental.months + 1, supported: false };
    const messages = {
      'urgent-support': 'Герой обратился за срочной помощью и не остался один. Теперь у него есть план безопасности и поддержка специалистов.',
      'seek-care': 'Герой обратился за профессиональной помощью. Сразу не стало легко, но появился план восстановления.',
      'ask-for-support': 'Герой рассказал близкому человеку, как ему на самом деле. Разговор не решил всё, но теперь не пришлось оставаться с этим одному.',
      'rest-and-routine': 'Герой отменил часть дел, восстановил сон и оставил в расписании только самое необходимое.',
      'continue-as-usual': 'Герой решил продолжать как обычно. Внешне ничего не изменилось, но состояние осталось без поддержки.',
    } as const;
    return {
      ...life,
      status: { type: 'active' },
      wellbeing: { ...life.wellbeing, mood: Math.min(100, life.wellbeing.mood + (choice === 'urgent-support' ? 8 : 5)), mentalHealth: next },
      relationships: choice === 'ask-for-support'
        ? remember(life.relationships, 'caregiver', { kind: 'asked-for-help', ageInMonths: life.ageInMonths }, 8)
        : life.relationships,
      chronicle: [...life.chronicle, {
        type: 'crisis', ageInMonths: life.ageInMonths,
        message: messages[choice as typeof mentalHealthChoices[number]],
      }],
    };
  }
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
