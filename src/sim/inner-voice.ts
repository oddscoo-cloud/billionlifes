import { romance } from './romance';
import type { LifeSnapshot } from './life';

export interface InnerVoice {
  readonly desire: string;
  readonly worry: string;
}

export function innerVoice(life: LifeSnapshot): InnerVoice {
  const age = life.ageInMonths / 12;
  const plan = life.development.plan;
  const relationship = romance(life);
  const trusted = life.relationships.some(({ trust }) => trust >= 70);

  if (life.wellbeing.phase === 'strain' || life.wellbeing.phase === 'withdrawn') {
    return {
      desire: trusted ? 'Чтобы кто-нибудь просто побыл рядом.' : 'Найти место, где можно выдохнуть.',
      worry: 'Что это состояние заметят, но не поймут.',
    };
  }
  if (age < 7) {
    return { desire: 'Чтобы сегодняшний вечер не заканчивался.', worry: 'Что взрослые уйдут слишком далеко.' };
  }
  if (age < 14) {
    return {
      desire: plan === 'study' ? 'Понять то, что пока кажется слишком сложным.' : 'Чтобы меня позвали в игру первыми.',
      worry: 'Что остальные уже знают что-то важное, а я отстал.',
    };
  }
  if (age < 18) {
    return {
      desire: 'Найти своё место и человека, с которым не нужно притворяться.',
      worry: 'Что один неловкий день определит меня навсегда.',
    };
  }
  if (relationship) {
    return {
      desire: 'Чтобы у этих отношений появилось спокойное завтра.',
      worry: 'Что близость закончится раньше, чем я научусь её беречь.',
    };
  }
  if (age < 35) {
    return {
      desire: plan === 'study' ? 'Получить шанс, которого хватит на новую жизнь.' : 'Собрать жизнь, которая будет похожа на мою.',
      worry: 'Что я выберу не тот путь и пойму это слишком поздно.',
    };
  }
  if (age < 65) {
    return {
      desire: trusted ? 'Оставить близким что-то, что они будут вспоминать с улыбкой.' : 'Снова почувствовать, что впереди есть время.',
      worry: 'Что привычные дни пройдут незаметно.',
    };
  }
  return {
    desire: 'Успеть рассказать близким то, что обычно откладывалось.',
    worry: 'Что самое важное останется несказанным.',
  };
}
