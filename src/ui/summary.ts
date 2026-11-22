import { demographics } from '../data/demographics';
import type { CountryCode } from '../data/demographics';
import type { LifeEvent, LifeSnapshot } from '../sim/life';
import { button, el, facts, heading, panel } from './elements';
import { ageLabel, educationLabels, employmentLabels, eventLabel, skillLabels } from './labels';
import { chronicle, metric, relations } from './play';

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
  return event.type === 'birth' || event.type === 'death' || event.type === 'crisis'
    || event.type === 'childhood-choice' || (event.type === 'action' && event.succeeded);
}

export function summary(life: LifeSnapshot, limit: number, home: () => void, more: () => void): HTMLElement {
  const profile = el('section', 'profile', el('div', '',
    el('div', 'eyebrow', 'Итог жизни'), heading(life.birth.name),
    el('p', 'location', ageLabel(life.ageInMonths))),
  button('Меню', home, 'quiet', 'menu'));
  const overview = panel('Прожитая жизнь', facts([
    ['Возраст', ageLabel(life.ageInMonths)],
    ['Страны проживания', countriesLivedIn(life).join(', ')],
    ['Образование', educationLabels[life.development.education]],
    ['Занятость', employmentLabels[life.development.employment]],
  ]));
  const skills = Object.entries(skillLabels).map(([key, label]) =>
    metric(label, life.development.skills[key as keyof typeof skillLabels]));
  const events = life.chronicle.filter(keyEvent).slice(-10);
  const milestones = panel('Ключевые события', el('ol', 'chronicle', ...events.map((event) =>
    el('li', '', el('span', 'event-age', ageLabel(event.ageInMonths)), el('span', '', eventLabel(event))))));
  return el('div', '', profile, el('div', 'grid',
    el('div', 'stack', overview, milestones, chronicle(life, limit, more)),
    el('aside', 'stack', panel('Навыки', ...skills), relations(life))));
}
