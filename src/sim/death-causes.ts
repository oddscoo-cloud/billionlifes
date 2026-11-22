import type { LifeSnapshot } from './life';
import { drawRandom } from './random';

// Narrative outcomes for a fatal roll. These are model descriptions, not vital statistics.
export const deathCauses = {
  'birth-complications': ['Осложнения после рождения', 'Здоровье с рождения требовало поддержки. В первые месяцы возникли тяжёлые осложнения.'],
  'infant-illness': ['Острое заболевание в младенчестве', 'Самочувствие резко ухудшилось в первые месяцы жизни.'],
  'infection-complications': ['Осложнения после болезни', 'После недавней болезни состояние резко ухудшилось.'],
  'child-illness': ['Острое заболевание', 'Заболевание развилось быстро, и ребёнок не смог оправиться.'],
  'home-accident': ['Несчастный случай дома', 'Обычный день дома прервался несчастным случаем.'],
  'outdoor-accident': ['Несчастный случай на улице', 'Несчастный случай во время обычных дел на улице оказался смертельным.'],
  'road-accident': ['Дорожное происшествие', 'Привычная дорога закончилась тяжёлым дорожным происшествием.'],
  'bad-weather-accident': ['Несчастный случай в непогоду', 'После недавних ливней часть привычных дорог оставалась опасной. В дороге произошёл несчастный случай.'],
  'sudden-illness': ['Внезапное заболевание', 'Болезнь развилась быстро, без заметных признаков в предыдущих месяцах.'],
  'cardiovascular-complication': ['Сердечно-сосудистое осложнение', 'Внезапное осложнение со стороны сердца или сосудов оказалось смертельным.'],
  'age-related-decline': ['Ухудшение здоровья в пожилом возрасте', 'Организм уже хуже справлялся с нагрузкой. В этом месяце состояние резко ухудшилось.'],
  'health-setback': ['Осложнения после ухудшения здоровья', 'После недавнего ухудшения здоровья восстановиться не удалось.'],
} as const;

export type DeathCause = keyof typeof deathCauses;

export function chooseDeathCause(life: LifeSnapshot, monthOfDeath: number): DeathCause {
  const age = monthOfDeath - 1;
  const recent = life.chronicle.slice(-12).filter((event) => event.type === 'world'
    && event.ageInMonths >= monthOfDeath - 2 && event.ageInMonths < monthOfDeath);
  const had = (id: string) => recent.some((event) => event.type === 'world' && event.id === id);
  const { value } = drawRandom((life.seed ^ Math.imul(monthOfDeath, 0x4383b1ed)) >>> 0);

  if (age < 12) {
    if (life.birth.startingHealth === 'needs-support' && age < 6 && value < .75) return 'birth-complications';
    return 'infant-illness';
  }
  if (age < 12 * 12) {
    if (had('child-fever') && value < .75) return 'infection-complications';
    if (value < .7) return 'child-illness';
    return age < 6 * 12 ? 'home-accident' : 'outdoor-accident';
  }
  if (age >= 65 * 12) {
    if (had('older-health') && value < .65) return 'health-setback';
    return value < .65 ? 'age-related-decline' : 'cardiovascular-complication';
  }
  if (had('rain-commute') && value < .5) return 'bad-weather-accident';
  if (value < (age < 30 * 12 ? .35 : .15)) return 'road-accident';
  return age >= 45 * 12 && value > .55 ? 'cardiovascular-complication' : 'sudden-illness';
}

export function finalCause(life: LifeSnapshot): DeathCause {
  const last = life.chronicle.at(-1);
  return (last?.type === 'death' && last.cause) || chooseDeathCause(life, life.ageInMonths);
}
