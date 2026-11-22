import { canVisitSibling, siblings, visitSibling } from '../sim/siblings';
import { parentLabels } from '../sim/family';
import { demographics } from '../data/demographics';
import { worldEvents } from '../data/world-events';
import { diaryEntryLimit, diaryTextLimit } from '../sim/diary';
import type { LifeSnapshot } from '../sim/life';
import type { Memory } from '../sim/relationships';
import { button, el, facts, heading, panel } from './elements';
import { ageLabel, eventLabel, peopleLabels } from './labels';
import { metric } from './play';
import { portrait } from './portrait';

function journalHeader(title: string, back: () => void): HTMLElement {
  return el('div', 'profile', heading(title), button('К жизни', back, 'quiet', 'back-to-life'));
}

export function diary(life: LifeSnapshot, back: () => void, save: (text: string) => void): HTMLElement {
  const latest = life.chronicle.at(-1);
  const notes = life.diary.slice().reverse().map((note) => el('article', 'diary-entry',
    el('p', 'event-age', ageLabel(note.ageInMonths)), el('p', 'note-text', note.text)));
  const history = panel('Мои записи', ...(notes.length ? notes : [el('p', 'helper', 'Здесь будут ваши записи от лица героя.')]));
  if (life.diary.length >= diaryEntryLimit) {
    return el('div', 'journal-screen', journalHeader('Личный дневник', back),
      panel('Дневник заполнен', el('p', '', `Сохранено ${diaryEntryLimit} записей.`)), history);
  }

  const text = el('textarea');
  text.id = 'diary-text';
  text.placeholder = 'Что хочется запомнить об этом месяце?';
  text.maxLength = diaryTextLimit;
  text.rows = 4;
  text.required = true;
  text.addEventListener('input', () => text.setCustomValidity(''));
  const submit = el('button', 'primary', 'Сохранить запись');
  submit.type = 'submit';
  const form = el('form', 'diary-form', el('label', 'field', 'Запись от лица героя', text), submit);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (text.value.trim()) save(text.value);
    else {
      text.setCustomValidity('Напишите хотя бы несколько слов.');
      text.reportValidity();
    }
  });

  const context = el('p', 'helper', latest
    ? `Возраст героя — ${ageLabel(life.ageInMonths)}. Последнее событие — ${eventLabel(latest)}.`
    : ageLabel(life.ageInMonths));
  return el('div', 'journal-screen', journalHeader('Личный дневник', back),
    panel('Новая запись', context, form), history);
}

const pastChoices: Record<Exclude<Memory['kind'], 'world'>, string> = {
  'shared-reading': 'Вместе читали',
  'shared-play': 'Познакомились за игрой',
  club: 'Записались в кружок',
  volunteering: 'Вместе помогали местному сообществу',
  'shared-hardship': 'Поддержали друг друга в трудный момент',
  'took-distance': 'После ссоры некоторое время общались реже',
  'asked-for-help': 'Поговорили о трудностях в группе',
};

const relationshipDescriptions = {
  caregiver: 'Близкий взрослый, который растил героя.',
  friend: 'Знакомый с детства. Общие воспоминания помогают поддерживать связь.',
  colleague: 'Знакомый по работе. Может помочь найти смену, если часов стало меньше.',
  neighbor: 'Знакомый по району. Помог герою освоиться после переезда.',
};

export function socialCircle(life: LifeSnapshot, commit?: (next: LifeSnapshot) => void): HTMLElement {
  const family = life.birth.family;
  const house = { 'two-parents': 'Двое родителей', 'one-parent': 'Один родитель', 'other-guardians': 'Другие опекуны' };
  const means = { limited: 'Ограниченный', moderate: 'Средний', high: 'Высокий' };
  const household = panel('Семья, в которой вырос герой', facts([
    ['Кто воспитывал', house[family.caregivers]],
    ['Старшие братья и сёстры', family.olderSiblings],
    ['Достаток семьи', means[family.means]],
    ['Здоровье при рождении', life.birth.startingHealth === 'typical' ? 'Обычное' : 'Требовалась поддержка'],
  ]));
  const parents = life.parents.map((parent) => {
    const age = ageLabel(parent.ageAtBirth + (parent.diedAt ?? life.ageInMonths));
    return el('p', 'parent-line', el('strong', '', parentLabels[parent.role]),
      el('span', '', parent.diedAt === undefined ? age : `Умер${parent.role === 'mother' ? 'ла' : ''} · ${age}`));
  });
  const siblingCards = siblings(life).map((person) => {
    const age = ageLabel(person.ageInMonths);
    const status = person.diedAt === undefined ? age : `Умер${person.role === 'Сестра' ? 'ла' : ''} · ${age}`;
    const row = el('div', 'sibling-card', el('p', 'parent-line', el('strong', '', person.role), el('span', '', status)));
    if (person.diedAt === undefined) {
      row.append(metric('Доверие', person.trust));
      if (commit && canVisitSibling(life, person)) row.append(button('Провести время вместе',
        () => commit(visitSibling(life, person.index)), 'quiet', `sibling-${person.index}`));
    }
    return row;
  });
  const contacts = life.relationships.map((person) => {
    const memories = el('ol', 'chronicle', ...person.memories.slice(-6).reverse().map((memory) => el('li', '',
      el('span', 'event-age', ageLabel(memory.ageInMonths)),
      el('span', '', memory.kind === 'world' ? worldEvents[memory.event][0] : pastChoices[memory.kind]))));
    const description = el('div', '', el('p', '', relationshipDescriptions[person.id]));
    if (person.country) description.append(el('p', 'helper', `Место знакомства — ${demographics.countries[person.country].name}.`));
    const content = [el('div', 'social-person', portrait(person.id), description), metric('Доверие', person.trust)];
    const card = panel(person.id === 'caregiver' && life.parents.length ? 'Поддержка семьи' : peopleLabels[person.id], ...content, person.memories.length
      ? el('div', '', el('h3', '', 'Последние общие воспоминания'), memories)
      : el('p', 'helper', 'Общие воспоминания появятся по ходу жизни.'));
    card.classList.add('indicator', 'indicator-people');
    return card;
  });
  const details = el('details', 'social-details', el('summary', '', 'Детали семьи и общие воспоминания'),
    household, ...contacts);
  const closePeople = life.relationships.filter((person) => person.id !== 'caregiver' || !life.parents.length);
  return panel('Круг общения', ...parents, ...siblingCards, ...closePeople.map((person) =>
    el('p', 'parent-line', peopleLabels[person.id], el('span', '', `Доверие ${person.trust}`))), details);
}
