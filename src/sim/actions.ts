import { characterTraits, traitLabels } from './traits';
import { countryCodes, demographics } from '../data/demographics';
import type { CountryCode } from '../data/demographics';
import { grow } from './growth';
import { careerPaths } from './growth';
import type { CareerPath, Development, Plan } from './growth';
import type { LifeSnapshot } from './life';
import { remember } from './relationships';
import { drawRandom } from './random';

export type Milestone = 'teen-activity' | 'adult-path' | 'later-life';
export type Activity = 'school-club' | 'volunteer' | 'apply-university' | 'vocational-training'
  | 'entry-level-job' | 'specialist-job' | 'choose-career' | 'retire' | 'continue-working' | 'mentor' | 'personal-care';

export type LifeAction = { readonly id: Exclude<Activity, 'choose-career'> }
  | { readonly id: 'choose-career'; readonly career: CareerPath }
  | { readonly id: 'move'; readonly destination: CountryCode };

interface ChanceFactor {
  readonly label: string;
  readonly contribution: number;
}

export interface ActionOption {
  readonly action: LifeAction;
  readonly label: string;
  readonly chance: number;
  readonly factors: readonly ChanceFactor[];
  readonly cost: number;
}

type Outcome = Pick<LifeSnapshot, 'development' | 'countryOfResidence'>;

export const activities = {
  'school-club': 'Вступить в школьный кружок',
  volunteer: 'Помочь местному сообществу',
  'apply-university': 'Попробовать поступить в университет',
  'vocational-training': 'Получить профессиональную квалификацию',
  'entry-level-job': 'Устроиться на работу начального уровня',
  'specialist-job': 'Пройти собеседование на должность специалиста',
  'choose-career': 'Выбрать карьерную траекторию',
  retire: 'Выйти на пенсию',
  'continue-working': 'Продолжить работать',
  mentor: 'Стать наставником',
  'personal-care': 'Заняться стилем и уходом',
} satisfies Record<Activity, string>;

// Условные издержки переезда внутри модели, в единицах достатка.
const moveCosts: Readonly<Partial<Record<CountryCode, number>>> = {
  UA: 4, IN: 3, NG: 3, MX: 5, BR: 5, AU: 8,
};

function moveCostFor(destination: CountryCode): number {
  return moveCosts[destination] ?? 6;
}

const milestones: Readonly<Partial<Record<number, Milestone>>> = {
  [14 * 12]: 'teen-activity',
  [18 * 12]: 'adult-path',
  [65 * 12]: 'later-life',
};

export function milestoneAt(ageInMonths: number): Milestone | undefined {
  return milestones[ageInMonths];
}

function option(id: Exclude<Activity, 'choose-career'>, factors: readonly ChanceFactor[] = []): ActionOption {
  const chance = factors.length === 0 ? 1
    : Math.max(0.05, Math.min(0.95, factors.reduce((sum, factor) => sum + factor.contribution, 0)));
  return { action: { id }, label: activities[id], chance, factors, cost: 0 };
}

export function availableActions(life: LifeSnapshot): readonly ActionOption[] {
  const { ageInMonths, status, development, countryOfResidence } = life;
  if (status.type === 'dead' || ageInMonths < 48) return [];
  if (status.type === 'decision') {
    if (status.decision === 'first-childhood-activity' || status.decision === 'school-crisis' || status.decision === 'family-loss' || status.decision === 'turning-point') return [];
    if (status.decision === 'teen-activity') return [option('school-club'), option('volunteer')];
    if (status.decision === 'later-life') {
      return development.employment === 'entry-level' || development.employment === 'specialist'
        ? [option('retire'), option('continue-working')]
        : [option('retire'), option('mentor')];
    }
  }

  const options: ActionOption[] = [];
  if (ageInMonths >= 18 * 12) {
    const stillJobSearching = life.chronicle.slice(-12).some((event) => event.type === 'turning-point'
      && event.id === 'lost-job' && ageInMonths - event.ageInMonths < 2);
    const traits = characterTraits(life);
    const persistent = traits.some(({ id }) => id === 'persistent');
    const open = traits.some(({ id }) => id === 'open');
    if (development.education !== 'higher' && ageInMonths >= development.nextAdmissionAge) {
      options.push(option('apply-university', [
        { label: 'Базовый шанс', contribution: 0.30 },
        { label: 'Подготовка', contribution: development.skills.academics * 0.005 },
        { label: 'Стойкость', contribution: development.skills.resilience * 0.0015 },
        ...(persistent ? [{ label: traitLabels.persistent, contribution: 0.08 }] : []),
      ]));
    }
    if (development.education === 'general') options.push(option('vocational-training'));
    if (!stillJobSearching && development.employment === 'unemployed') options.push(option('entry-level-job'));
    if (development.employment === 'specialist' && development.career === null) {
      options.push(...careerPaths.map((career) => ({
        action: { id: 'choose-career', career } as const,
        label: `Выбрать траекторию: ${career}`,
        chance: 1,
        factors: [],
        cost: 0,
      })));
    }
    if (!stillJobSearching && development.education !== 'general'
      && (development.employment === 'unemployed' || development.employment === 'entry-level')) {
      options.push(option('specialist-job', [
        { label: 'Квалификация', contribution: development.education === 'higher' ? 0.60 : 0.45 },
        { label: 'Общение', contribution: development.skills.communication * 0.003 },
        { label: 'Практичность', contribution: development.skills.practical * 0.0015 },
        ...(open ? [{ label: traitLabels.open, contribution: 0.08 }] : []),
      ]));
    }
  }

  if (status.type === 'decision') return options;
  if (development.plan !== 'personal-care') options.push(option('personal-care'));
  if (ageInMonths >= 65 * 12 && development.plan !== 'community') options.push(option('mentor'));
  if (ageInMonths >= 18 * 12) {
    for (const destination of countryCodes) {
      const cost = moveCostFor(destination);
      if (destination !== countryOfResidence && development.funds >= cost) {
        options.push({
          action: { id: 'move', destination },
          label: `Переехать: ${demographics.countries[destination].name}`,
          chance: 1,
          factors: [],
          cost,
        });
      }
    }
  }
  return options;
}

const activityPlans: Readonly<Partial<Record<Activity, Plan>>> = {
  'school-club': 'practice-art',
  volunteer: 'community',
  mentor: 'community',
  'personal-care': 'personal-care',
};

function success(life: LifeSnapshot, action: LifeAction, cost: number): Outcome {
  const { development, countryOfResidence } = life;
  if (action.id === 'move') {
    return {
      development: { ...development, funds: development.funds - cost },
      countryOfResidence: action.destination,
    };
  }

  const plan = activityPlans[action.id];
  if (plan) {
    const next = action.id === 'mentor' || action.id === 'personal-care'
      ? development : grow(development, plan, 2);
    return { countryOfResidence, development: { ...next, plan } };
  }

  switch (action.id) {
    case 'apply-university':
      return { countryOfResidence, development: { ...development, education: 'higher' } };
    case 'vocational-training':
      return { countryOfResidence, development: { ...development, education: 'vocational' } };
    case 'entry-level-job':
      return { countryOfResidence, development: { ...development, employment: 'entry-level' } };
    case 'specialist-job':
      return { countryOfResidence, development: { ...development, employment: 'specialist' } };
    case 'choose-career':
      return { countryOfResidence, development: { ...development, career: action.career, careerLevel: 1 } };
    case 'retire':
      return { countryOfResidence, development: { ...development, employment: 'retired' } };
    default:
      return { countryOfResidence, development };
  }
}

export function resolveAction(life: LifeSnapshot, action: LifeAction): LifeSnapshot {
  const selected = availableActions(life).find(({ action: candidate }) =>
    candidate.id === action.id && (candidate.id !== 'move'
      || (action.id === 'move' && candidate.destination === action.destination)),
  );
  if (!selected) return life;

  const roll = selected.chance < 1 ? drawRandom(life.randomState) : null;
  const succeeded = roll === null || roll.value < selected.chance;
  const outcome = succeeded ? success(life, selected.action, selected.cost) : life;
  const development = action.id === 'apply-university' && !succeeded
    ? { ...outcome.development, nextAdmissionAge: life.ageInMonths + 3 }
    : outcome.development;

  const memory = action.id === 'school-club' ? 'club' : action.id === 'volunteer' ? 'volunteering' : null;
  const relationships = succeeded && memory
    ? remember(life.relationships, 'friend', { kind: memory, ageInMonths: life.ageInMonths }, 10)
    : life.relationships;

  return {
    ...life,
    relationships,
    development,
    countryOfResidence: outcome.countryOfResidence,
    randomState: roll?.state ?? life.randomState,
    status: { type: 'active' },
    chronicle: [...life.chronicle, {
      type: 'action', ageInMonths: life.ageInMonths, action: selected.action,
      succeeded, chance: selected.chance,
    }],
  };
}
