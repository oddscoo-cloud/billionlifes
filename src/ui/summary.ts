import { deathCauses, finalCause } from '../sim/death-causes';
import { socialCircle } from './journal';
import { demographics } from '../data/demographics';
import type { CountryCode } from '../data/demographics';
import type { LifeEvent, LifeSnapshot } from '../sim/life';
import { button, el, facts, heading, panel } from './elements';
import { ageLabel, educationLabels, employmentLabels, eventLabel, skillLabels } from './labels';
import { characterPanel, chronicle, indicatorPanel, metric } from './play';

function countriesLivedIn(life: LifeSnapshot): readonly string[] {
  const countries = new Set<CountryCode>([life.birth.countryOfBirth]);
  for (const event of life.chronicle) {
    if (event.type === 'action' && event.action.id === 'move' && event.succeeded) {
      countries.add(event.action.destination);
    }
  }
  countries.add(life.countryOfResidence);
  return [...countries].map((code) => demographics.countries[code].name);
}

function keyEvent(event: LifeEvent): boolean {
  return (event.type === 'world' && ['library-return', 'move-welcome', 'shift-cover', 'new-colleague'].includes(event.id))
    || event.type === 'turning-choice' || event.type === 'turning-consequence' || event.type === 'parent-death' || event.type === 'birth' || event.type === 'death' || event.type === 'crisis'
    || event.type === 'childhood-choice' || (event.type === 'action' && event.succeeded);
}

interface SummaryNavigation {
  home: () => void;
  more: () => void;
  openDiary: () => void;
}

export function summary(life: LifeSnapshot, limit: number, navigation: SummaryNavigation): HTMLElement {
  const profile = el('section', 'profile', el('div', '',
    el('div', 'eyebrow', 'Итог жизни'), heading(life.birth.name),
    el('p', 'location', ageLabel(life.ageInMonths))),
  el('div', 'profile-actions', button('Дневник', navigation.openDiary, 'quiet', 'open-diary'),
    button('Меню', navigation.home, 'quiet', 'menu')));
  const [cause, context] = deathCauses[finalCause(life)];
  const overview = panel('Прожитая жизнь', facts([
    ['Возраст', ageLabel(life.ageInMonths)],
    ['Причина смерти', cause],
    ['Страны проживания', countriesLivedIn(life).join(', ')],
    ['Образование', educationLabels[life.development.education]],
    ['Занятость', employmentLabels[life.development.employment]],
  ]), el('p', 'helper', context));
  const skills = Object.entries(skillLabels).map(([key, label]) =>
    metric(label, life.development.skills[key as keyof typeof skillLabels]));
  const events = life.chronicle.filter(keyEvent).slice(-10);
  const milestones = panel('Ключевые события', el('ol', 'chronicle', ...events.map((event) =>
    el('li', '', el('span', 'event-age', ageLabel(event.ageInMonths)), el('span', '', eventLabel(event))))));
  return el('div', '', profile, el('div', 'grid',
    el('div', 'stack', overview, milestones, chronicle(life, limit, navigation.more)),
    el('aside', 'stack', indicatorPanel('Навыки', 'skills', ...skills), characterPanel(life), socialCircle(life))));
}
