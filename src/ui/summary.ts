import { tr } from './i18n';
import { deathCauses, finalCause } from '../sim/death-causes';
import { socialCircle } from './journal';
import type { CountryCode } from '../data/demographics';
import type { LifeEvent, LifeSnapshot } from '../sim/life';
import { button, el, facts, heading, panel } from './elements';
import { ageLabel, countryLabel, careerLabels, educationLabels, employmentLabels, eventLabel, projectLabels, skillLabels } from './labels';
import { characterPanel, chronicle, indicatorPanel, metric } from './play';
import { alternateLives } from '../sim/alternate-lives';
import { achievements } from '../sim/achievements';

function countriesLivedIn(life: LifeSnapshot): readonly string[] {
  const countries = new Set<CountryCode>([life.birth.countryOfBirth]);
  for (const event of life.chronicle) {
    if (event.type === 'action' && event.action.id === 'move' && event.succeeded) {
      countries.add(event.action.destination);
    }
  }
  countries.add(life.countryOfResidence);
  return [...countries].map((code) => countryLabel(code));
}

function keyEvent(event: LifeEvent): boolean {
  return (event.type === 'world' && ['library-return', 'move-welcome', 'shift-cover', 'new-colleague'].includes(event.id))
    || event.type === 'turning-choice' || event.type === 'turning-consequence' || event.type === 'sibling-death' || event.type === 'parent-death' || (event.type === 'romance' && event.step !== 'spend-time') || event.type === 'birth' || event.type === 'death' || event.type === 'crisis'
    || event.type === 'childhood-choice' || (event.type === 'action' && event.succeeded);
}

interface SummaryNavigation {
  home: () => void;
  more: () => void;
  openDiary: () => void;
}

function lifeLesson(life: LifeSnapshot): { title: string; text: string } {
  const crises = life.chronicle.filter((event) => event.type === 'crisis').length;
  const moves = life.chronicle.filter((event) =>
    event.type === 'action' && event.action.id === 'move' && event.succeeded).length;
  if (crises >= 3) return {
    title: tr('Сила была в обращении за поддержкой'),
    text: tr('Самые заметные изменения жизни пришли после трудных решений. Повторная жизнь могла бы раньше снизить нагрузку и подключить близких.'),
  };
  if (moves > 0) return {
    title: tr('Новые жизни начинаются с перемены'),
    text: tr('Переезды дали герою новые контакты и шансы. В следующей жизни стоит раньше планировать ресурсы и сохранять связь с прошлым.'),
  };
  if (life.development.career || life.development.project) return {
    title: tr('Навык превращался в траекторию'),
    text: tr('Постоянный рост квалификации создал возможности для работы и проектов. Главный урок — не откладывать учебные шаги до позднего возраста.'),
  };
  return {
    title: tr('Жизнь складывалась из повседневных решений'),
    text: tr('Центральным опытом героя стали отношения и малые шаги. В следующей жизни стоит выбрать цель раньше и чаще использовать поддержку.'),
  };
}

function lessonDialog(life: LifeSnapshot, navigation: SummaryNavigation): HTMLDialogElement {
  const lesson = lifeLesson(life);
  const title = el('h2', '', lesson.title);
  title.id = 'life-lesson-title';
  const unlocked = achievements(life).filter((item) => item.unlocked).length;
  const dialog = el('dialog', 'lesson-dialog',
    el('p', 'eyebrow', tr('Урок жизни')),
    title,
    el('p', '', lesson.text),
    facts([[tr('Открытые достижения'), tr`${unlocked} из ${achievements(life).length}`],
      [tr('Ключевые решения'), life.chronicle.filter((event) => event.type === 'turning-choice').length]]),
    el('div', 'turns',
      button(tr('Закрыть'), () => dialog.close(), 'quiet'),
      button(tr('Вернуться в меню'), () => { dialog.close(); navigation.home(); }, 'primary'))) as HTMLDialogElement;
  dialog.setAttribute('aria-labelledby', title.id);
  dialog.addEventListener('cancel', () => dialog.close());
  return dialog;
}

export function summary(life: LifeSnapshot, limit: number, navigation: SummaryNavigation): HTMLElement {
  const lesson = lessonDialog(life, navigation);
  const profile = el('section', 'profile', el('div', '',
    el('div', 'eyebrow', tr('Итог жизни')), heading(life.birth.name),
    el('p', 'location', ageLabel(life.ageInMonths))),
  el('div', 'profile-actions', button(tr('Дневник'), navigation.openDiary, 'quiet', 'open-diary'),
    button(tr('Урок жизни'), () => lesson.showModal(), 'primary', 'open-life-lesson'),
    button(tr('Меню'), navigation.home, 'quiet', 'menu')));
  const [cause, context] = deathCauses[finalCause(life)];
  const overview = panel(tr('Прожитая жизнь'), facts([
    [tr('Возраст'), ageLabel(life.ageInMonths)],
    [tr('Причина смерти'), tr(cause)],
    [tr('Страны проживания'), countriesLivedIn(life).join(', ')],
    [tr('Образование'), educationLabels[life.development.education]],
    [tr('Занятость'), employmentLabels[life.development.employment]],
    ...(life.development.career ? [[tr('Карьерная траектория'), tr`${careerLabels[life.development.career]} · уровень ${life.development.careerLevel}`] as const] : []),
    ...(life.development.project ? [[tr('Большой проект'), tr`${projectLabels[life.development.project]} · уровень ${life.development.projectLevel}`] as const] : []),
  ]), el('p', 'helper', tr(context)));
  const skills = Object.entries(skillLabels).map(([key, label]) =>
    metric(label, life.development.skills[key as keyof typeof skillLabels]));
  const events = life.chronicle.filter(keyEvent).slice(-10);
  const milestones = panel(tr('Ключевые события'), el('ol', 'chronicle', ...events.map((event) =>
    el('li', '', el('span', 'event-age', ageLabel(event.ageInMonths)), el('span', '', eventLabel(event))))));
  const alternatives = alternateLives(life);
  const alternatePanel = alternatives.length
    ? panel(tr('Альтернативные версии'), el('p', 'helper', tr('Это не предсказания, а честные варианты того, как могли измениться последствия ключевых решений.')),
      el('ul', '', ...alternatives.map((version) => el('li', '',
        el('strong', '', tr(version.title)), el('p', '', tr(version.description)),
        el('span', 'helper', tr`Основано на: ${tr(version.basis)}.`)))))
    : null;
  const lifeAchievements = achievements(life);
  const unlockedAchievements = lifeAchievements.filter((item) => item.unlocked);
  const achievementCards = unlockedAchievements.length
    ? unlockedAchievements.map((item) =>
      el('article', 'achievement-card achievement-unlocked',
        el('span', 'achievement-mark', '✓'),
        el('div', '', el('strong', '', tr(item.title)), el('p', 'helper', tr(item.description)))))
    : [el('p', 'helper', tr('В этой жизни ни одно достижение пока не открыто. Новая жизнь даст новые возможности.'))];
  const achievementPanel = panel(tr('Достижения'),
    el('p', 'achievement-count', tr`${unlockedAchievements.length} из ${lifeAchievements.length} открыто`),
    el('div', 'achievement-grid', ...achievementCards));
  return el('div', '', profile, el('div', 'grid',
    el('div', 'stack', overview, milestones, ...(alternatePanel ? [alternatePanel] : []), chronicle(life, limit, navigation.more)),
    el('aside', 'stack', achievementPanel, indicatorPanel(tr('Навыки'), 'skills', ...skills), characterPanel(life), socialCircle(life))), lesson);
}
