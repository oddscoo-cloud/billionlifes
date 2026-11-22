import type { LifeSnapshot } from './life';
import { turningPoints } from './turning-points';
import type { TraitId } from './turning-points';

export const traitLabels: Record<TraitId, string> = {
  persistent: 'Настойчивость',
  resourceful: 'Находчивость',
  supportive: 'Забота о близких',
  open: 'Готовность к диалогу',
  careful: 'Осмотрительность',
  independent: 'Самостоятельность',
};

export interface CharacterTrait {
  readonly id: TraitId;
  readonly reason: string;
}

export function characterTraits(life: LifeSnapshot): readonly CharacterTrait[] {
  const traits = new Map<TraitId, CharacterTrait>();
  const resolved = new Set<string>();
  let study = 0;
  let community = 0;
  let relocations = 0;
  let familyTime = 0;
  const learn = (id: TraitId, reason: string): void => {
    if (!traits.has(id)) traits.set(id, { id, reason });
  };
  for (const event of life.chronicle) {
    if (event.type === 'turning-choice') {
      if (resolved.has(event.id)) continue;
      resolved.add(event.id);
      const point = turningPoints[event.id];
      const choice = point.responses[event.response];
      learn(choice.trait, `${point.title} — ${choice.label.toLowerCase()}.`);
    } else if ((event.type === 'crisis' && event.choice === 'ask-for-help')
      || (event.type === 'family-response' && event.choice === 'support')) {
      learn('open', 'В трудный момент герой обратился за поддержкой.');
    } else if (event.type === 'sibling-visit') {
      familyTime += 1;
      if (familyTime >= 3) learn('supportive', 'Герой регулярно находил время для братьев и сестёр.');
    } else if (event.type === 'world') {
      if (event.id === 'study-group' || event.id === 'library-return' || event.id === 'rain-study') {
        study += 1;
        if (study >= 3) learn('persistent', 'Герой несколько раз возвращался к занятиям вне привычного распорядка.');
      }
      if (event.id === 'community-meal' || event.id === 'neighbor-help' || event.id === 'garden') {
        community += 1;
        if (community >= 3) learn('supportive', 'Герой не раз участвовал в общих делах с соседями.');
      }
    } else if (event.type === 'action' && event.succeeded && event.action.id === 'move') {
      relocations += 1;
      if (relocations >= 2) learn('independent', 'Герой дважды обустроил жизнь после переезда.');
    }
  }
  return [...traits.values()];
}
