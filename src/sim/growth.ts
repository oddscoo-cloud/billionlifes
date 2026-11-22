import type { HouseholdMeans } from './birth';

export const plans = ['study', 'practice-art', 'community', 'personal-care'] as const;
export type Plan = (typeof plans)[number];
type Skill = 'academics' | 'creativity' | 'communication';
type Trait = 'discipline' | 'openness';

export interface Development {
  readonly skills: Readonly<Record<Skill, number>>;
  readonly interests: Readonly<Record<Plan, number>>;
  readonly character: Readonly<Record<Trait, number>>;
  readonly appearance: number;
  readonly plan: Plan | null;
  readonly education: 'general' | 'vocational' | 'higher';
  readonly employment: 'unemployed' | 'entry-level' | 'specialist' | 'retired';
  readonly funds: number;
  readonly admissionAttempts: number;
}

export function initialDevelopment(means: HouseholdMeans): Development {
  return {
    skills: { academics: 0, creativity: 0, communication: 0 },
    interests: { study: 0, 'practice-art': 0, community: 0, 'personal-care': 0 },
    character: { discipline: 50, openness: 50 },
    appearance: 50,
    plan: null,
    education: 'general',
    employment: 'unemployed',
    funds: { limited: 2, moderate: 5, high: 10 }[means],
    admissionAttempts: 0,
  };
}

type Growth = Readonly<{
  skill?: Skill;
  trait: Trait;
  interest: Plan;
  appearance?: boolean;
}>;

const planGrowth: Readonly<Record<Plan, Growth>> = {
  study: { skill: 'academics', trait: 'discipline', interest: 'study' },
  'practice-art': { skill: 'creativity', trait: 'openness', interest: 'practice-art' },
  community: { skill: 'communication', trait: 'openness', interest: 'community' },
  'personal-care': { trait: 'discipline', interest: 'personal-care', appearance: true },
};

export function grow(development: Development, plan: Plan, points = 1): Development {
  const { skill, trait, interest, appearance } = planGrowth[plan];
  const increase = (value: number) => Math.min(100, value + points);

  return {
    ...development,
    skills: skill ? { ...development.skills, [skill]: increase(development.skills[skill]) }
      : development.skills,
    interests: { ...development.interests, [interest]: increase(development.interests[interest]) },
    character: { ...development.character, [trait]: increase(development.character[trait]) },
    appearance: appearance ? increase(development.appearance) : development.appearance,
  };
}

export function growMonth(development: Development): Development {
  const income = { unemployed: 0, 'entry-level': 1, specialist: 2, retired: 0 }[
    development.employment
  ];
  const next = development.plan ? grow(development, development.plan) : development;
  return income > 0 ? { ...next, funds: next.funds + income } : next;
}
