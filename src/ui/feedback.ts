import { deathCauses, finalCause } from '../sim/death-causes';
import { characterTraits, traitLabels } from '../sim/traits';
import { turningPoints } from '../sim/turning-points';
import type { LifeSnapshot } from '../sim/life';
import { ageLabel, decisionLabels, eventLabel, planLabels } from './labels';

function elapsedLabel(months: number): string {
  if (months >= 12) {
    const years = Math.floor(months / 12);
    const rest = months % 12;
    const label = `${years} ${years === 1 ? 'год' : years < 5 ? 'года' : 'лет'}`;
    return rest ? `${label} и ${elapsedLabel(rest)}` : label;
  }
  if (months === 1) return '1 месяц';
  if (months >= 2 && months <= 4) return `${months} месяца`;
  return `${months} месяцев`;
}

export function turnFeedback(previous: LifeSnapshot | undefined, next: LifeSnapshot): string {
  if (!previous || next.ageInMonths === 0) return 'Жизнь началась. Выберите, на сколько продвинуть время.';

  const monthDelta = next.ageInMonths - previous.ageInMonths;
  const event = next.chronicle.length > previous.chronicle.length ? next.chronicle.at(-1) : undefined;
  if (next.status.type === 'dead') {
    return `Ход завершился в возрасте ${ageLabel(next.ageInMonths)}. Причина смерти — ${deathCauses[finalCause(next)][0].toLowerCase()}.`;
  }
  if (monthDelta === 0 && event?.type === 'family-response') return `${eventLabel(event)}.`;
  if (next.status.type === 'decision') {
    const title = next.status.decision === 'turning-point' ? turningPoints[next.status.id].title
      : decisionLabels[next.status.decision];
    return `Время продвинулось на ${elapsedLabel(monthDelta)}. Ход остановлен: ${title.toLowerCase()}.`;
  }
  if (monthDelta > 0) {
    const funds = next.development.funds - previous.development.funds;
    const details = [];
    const events = next.chronicle.slice(previous.chronicle.length).filter(({ type }) => type === 'world');
    if (events.length > 1) details.push(`событий вокруг героя — ${events.length}`);
    if (event) details.push(eventLabel(event));
    if (funds !== 0) details.push(`достаток ${funds > 0 ? '+' : ''}${funds} ед.`);
    if (next.development.plan && previous.development !== next.development) {
      const { skills, appearance } = next.development;
      const before = previous.development;
      if (appearance > before.appearance || skills.academics > before.skills.academics
        || skills.creativity > before.skills.creativity || skills.communication > before.skills.communication) {
        details.push(`есть прогресс по плану «${planLabels[next.development.plan]}»`);
      }
    }
    return `Время продвинулось на ${elapsedLabel(monthDelta)}${details.length ? ` · ${details.join(' · ')}` : ''}.`;
  }
  if (event?.type === 'sibling-visit' || event?.type === 'romance') return `${eventLabel(event)}.`;
  if (event?.type === 'turning-choice') {
    const trait = turningPoints[event.id].responses[event.response].trait;
    const isNew = characterTraits(next).some(({ id }) => id === trait)
      && !characterTraits(previous).some(({ id }) => id === trait);
    return eventLabel(event) + (isNew ? ` Новая черта — ${traitLabels[trait].toLowerCase()}.` : '');
  }
  if (event?.type === 'action' && event.action.id === 'apply-university' && !event.succeeded) {
    return 'Не удалось поступить. Повторная попытка доступна через три месяца.';
  }
  if (event?.type === 'action' && event.action.id === 'specialist-job' && !event.succeeded) {
    return 'Собеседование не удалось. Текущая занятость сохранилась.';
  }
  if (event?.type === 'action') return `${eventLabel(event)}.`;
  if (event?.type === 'crisis') return event.message;
  if (event?.type === 'childhood-choice') return event.choice === 'read-with-caregiver'
    ? 'Совместное чтение развило навык учёбы и укрепило доверие в семье.'
    : 'Игра со сверстниками развила навык общения. У героя появился друг детства.';
  if (event?.type === 'plan') return event.plan
    ? `План «${planLabels[event.plan]}» выбран. Он начнёт действовать со следующего хода.`
    : 'План отменён. Со следующего хода герой проживает месяцы без выбранного занятия.';
  return previous.status.type === 'decision'
    ? 'Решение принято. Теперь можно продолжить время.'
    : 'Изменения сохранены.';
}
