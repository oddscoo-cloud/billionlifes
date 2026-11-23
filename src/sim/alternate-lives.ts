import type { LifeSnapshot } from './life';

export interface AlternateLife {
  readonly title: string;
  readonly description: string;
  readonly basis: string;
}

export function alternateLives(life: LifeSnapshot): readonly AlternateLife[] {
  const versions: AlternateLife[] = [];
  const move = life.chronicle.find((event) => event.type === 'action' && event.action.id === 'move' && event.succeeded);
  if (move?.type === 'action' && move.action.id === 'move') {
    versions.push({
      title: 'Если бы герой остался',
      description: 'Связи с прежним окружением, вероятно, сохранились бы дольше, но часть новых возможностей осталась бы недоступной.',
      basis: 'переезд',
    });
  }
  const project = life.chronicle.find((event) => event.type === 'action' && event.action.id === 'start-project');
  if (project?.type === 'action' && project.action.id === 'start-project') {
    versions.push({
      title: 'Если бы капитал остался в запасе',
      description: 'У героя было бы меньше риска и больше финансовой подушки, но не появилось бы опыта собственного дела.',
      basis: 'большой жизненный проект',
    });
  }
  const moral = life.chronicle.find((event) => event.type === 'turning-choice'
    && (event.id === 'moral-whistleblowing' || event.id === 'moral-family-time'));
  if (moral?.type === 'turning-choice') {
    versions.push({
      title: 'Если бы решение было другим',
      description: moral.response === 0
        ? 'Другой выбор мог бы сохранить силы или деньги сейчас, но изменить доверие и последствия спустя месяцы.'
        : 'Другой выбор мог бы укрепить отношения или принести спокойствие, но потребовать отказаться от части возможностей.',
      basis: 'моральная дилемма',
    });
  }
  if (life.development.career) {
    versions.push({
      title: 'Если бы траектория началась иначе',
      description: 'Другая профессия изменила бы темп роста дохода, круг общения и набор ежедневных решений.',
      basis: 'карьерная траектория',
    });
  }
  return versions.slice(0, 4);
}
