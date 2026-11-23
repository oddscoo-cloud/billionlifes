import type { LifeSnapshot } from './life';

export const goalIds = ['education', 'career', 'stability', 'relationships', 'wellbeing', 'travel'] as const;
export type GoalId = (typeof goalIds)[number];

export interface LifeGoal {
  readonly id: GoalId;
  readonly startedAt: number;
}

export const goalLabels: Record<GoalId, string> = {
  education: 'Получить образование',
  career: 'Сделать карьеру',
  stability: 'Создать стабильность',
  relationships: 'Укрепить близкие связи',
  wellbeing: 'Сохранить здоровье',
  travel: 'Переехать и увидеть мир',
};

export const goalDescriptions: Record<GoalId, string> = {
  education: 'Повышайте учёбу или выбирайте профессиональный путь.',
  career: 'Получите квалификацию, работу специалиста и рост.',
  stability: 'Накопите достаток и стабильную занятость.',
  relationships: 'Развивайте доверие в семье, дружбе или романтике.',
  wellbeing: 'Следите за настроением, самочувствием и помощью.',
  travel: 'Измените страну проживания хотя бы однажды.',
};

export function setGoal(life: LifeSnapshot, id: GoalId): LifeSnapshot {
  if (life.status.type === 'dead' || !goalIds.includes(id)) return life;
  const goals = life.goals ?? [];
  const exists = goals.some((goal) => goal.id === id);
  if (!exists && goals.length >= 3) return life;
  return {
    ...life,
    goals: exists
      ? goals.filter((goal) => goal.id !== id)
      : [...goals, { id, startedAt: life.ageInMonths }],
  };
}

export function goalProgress(life: LifeSnapshot, id: GoalId): number {
  switch (id) {
    case 'education':
      return life.development.education === 'higher' ? 100
        : life.development.education === 'vocational' ? 65
          : Math.min(35, 15 + Math.round(life.development.skills.academics / 3));
    case 'career':
      if (life.development.career && life.development.employment === 'specialist') {
        return Math.min(100, 70 + life.development.careerLevel * 6);
      }
      if (life.development.employment === 'specialist') return 70;
      if (life.development.employment === 'entry-level') return 35;
      return Math.min(30, life.development.skills.communication + life.development.skills.practical);
    case 'stability':
      return Math.min(100,
        life.development.funds * 3
        + (life.development.employment === 'specialist' ? 40
          : life.development.employment === 'entry-level' ? 25 : 0));
    case 'relationships': {
      const trust = Math.max(...life.relationships.map((person) => person.trust), 0);
      return Math.min(100, Math.round(trust));
    }
    case 'wellbeing':
      return Math.max(0, Math.min(100,
        life.wellbeing.mood
        - (life.physicalHealth.condition === 'serious' ? 30 : life.physicalHealth.condition === 'chronic' ? 15 : 0)
        - (life.wellbeing.mentalHealth && life.wellbeing.mentalHealth.condition !== 'none' ? 20 : 0)));
    case 'travel':
      return life.countryOfResidence !== life.birth.countryOfBirth
        ? 100
        : life.chronicle.some((event) => event.type === 'action' && event.action.id === 'move')
          ? 100 : 0;
  }
}
