import { romance } from './romance';
import type { LifeSnapshot } from './life';

export interface InnerVoice {
  readonly desire: string;
}

export function innerVoice(life: LifeSnapshot): InnerVoice {
  const age = life.ageInMonths / 12;
  const plan = life.development.plan;
  const relationship = romance(life);
  const trusted = life.relationships.some(({ trust }) => trust >= 70);

  if (life.wellbeing.phase === 'strain' || life.wellbeing.phase === 'withdrawn') {
    return {
      desire: trusted ? 'Чтобы кто-нибудь просто побыл рядом.' : 'Найти место, где можно выдохнуть.',
    };
  }
  if (age < 7) {
    return { desire: 'Чтобы сегодняшний вечер не заканчивался.' };
  }
  if (age < 14) {
    return {
      desire: plan === 'study' ? 'Понять то, что пока кажется слишком сложным.' : 'Чтобы меня позвали в игру первыми.',
    };
  }
  if (age < 18) {
    return {
      desire: 'Найти своё место и человека, с которым не нужно притворяться.',
    };
  }
  if (relationship) {
    return {
      desire: 'Чтобы у этих отношений появилось спокойное завтра.',
    };
  }
  if (age < 35) {
    return {
      desire: plan === 'study' ? 'Получить шанс, которого хватит на новую жизнь.' : 'Собрать жизнь, которая будет похожа на мою.',
    };
  }
  if (age < 65) {
    return {
      desire: trusted ? 'Оставить близким что-то, что они будут вспоминать с улыбкой.' : 'Снова почувствовать, что впереди есть время.',
    };
  }
  return {
    desire: 'Успеть рассказать близким то, что обычно откладывалось.',
  };
}
