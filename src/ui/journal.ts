import { tr } from './i18n';
import { canVisitSibling, siblings, visitSibling } from '../sim/siblings';
import { parentLabels } from '../sim/family';
import { worldEvents } from '../data/world-events';
import { diaryEntryLimit, diaryTextLimit } from '../sim/diary';
import type { LifeSnapshot } from '../sim/life';
import type { Memory } from '../sim/relationships';
import { button, el, facts, heading, panel } from './elements';
import { ageLabel, countryLabel, eventLabel, friendRoleLabels, peopleLabels } from './labels';
import { metric } from './play';
import { portrait } from './portrait';

function journalHeader(title: string, back: () => void): HTMLElement {
  return el('div', 'profile', heading(title), button(tr('К жизни'), back, 'quiet', 'back-to-life'));
}

export function diary(life: LifeSnapshot, back: () => void, save: (text: string) => void): HTMLElement {
  const latest = life.chronicle.at(-1);
  const notes = life.diary.slice().reverse().map((note) => el('article', 'diary-entry',
    el('p', 'event-age', ageLabel(note.ageInMonths)), el('p', 'note-text', note.text)));
  const history = panel(tr('Мои записи'), ...(notes.length ? notes : [el('p', 'helper', tr('Здесь будут ваши записи от лица героя.'))]));
  if (life.diary.length >= diaryEntryLimit) {
    return el('div', 'journal-screen', journalHeader(tr('Личный дневник'), back),
      panel(tr('Дневник заполнен'), el('p', '', tr`Сохранено ${diaryEntryLimit} записей.`)), history);
  }

  const text = el('textarea');
  text.id = 'diary-text';
  text.placeholder = tr('Что хочется запомнить об этом месяце?');
  text.maxLength = diaryTextLimit;
  text.rows = 4;
  text.required = true;
  text.addEventListener('input', () => text.setCustomValidity(''));
  const submit = el('button', 'primary', tr('Сохранить запись'));
  submit.type = 'submit';
  const form = el('form', 'diary-form', el('label', 'field', tr('Запись от лица героя'), text), submit);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (text.value.trim()) save(text.value);
    else {
      text.setCustomValidity(tr('Напишите хотя бы несколько слов.'));
      text.reportValidity();
    }
  });

  const context = el('p', 'helper', latest
    ? tr`Возраст героя — ${ageLabel(life.ageInMonths)}. Последнее событие — ${eventLabel(latest)}.`
    : ageLabel(life.ageInMonths));
  return el('div', 'journal-screen', journalHeader(tr('Личный дневник'), back),
    panel(tr('Новая запись'), context, form), history);
}

const pastChoices: Record<Exclude<Memory['kind'], 'world'>, string> = {
  'shared-reading': tr('Вместе читали'),
  'shared-play': tr('Познакомились за игрой'),
  club: tr('Записались в кружок'),
  volunteering: tr('Вместе помогали местному сообществу'),
  'shared-hardship': tr('Поддержали друг друга в трудный момент'),
  'took-distance': tr('После ссоры некоторое время общались реже'),
  'asked-for-help': tr('Поговорили о трудностях в группе'),
};

const relationshipDescriptions = {
  caregiver: tr('Близкий взрослый, который растил героя.'),
  friend: tr('Знакомый с детства. Общие воспоминания помогают поддерживать связь.'),
  colleague: tr('Знакомый по работе. Может помочь найти смену, если часов стало меньше.'),
  neighbor: tr('Знакомый по району. Помог герою освоиться после переезда.'),
};

export function socialCircle(life: LifeSnapshot, commit?: (next: LifeSnapshot) => void): HTMLElement {
  const family = life.birth.family;
  const house = { 'two-parents': tr('Двое родителей'), 'one-parent': tr('Один родитель'), 'other-guardians': tr('Другие опекуны') };
  const means = { limited: tr('Ограниченный'), moderate: tr('Средний'), high: tr('Высокий') };
  const household = panel(tr('Семья, в которой вырос герой'), facts([
    [tr('Кто воспитывал'), house[family.caregivers]],
    [tr('Старшие братья и сёстры'), family.olderSiblings],
    [tr('Достаток семьи'), means[family.means]],
    [tr('Здоровье при рождении'), life.birth.startingHealth === 'typical' ? tr('Обычное') : tr('Требовалась поддержка')],
  ]));
  const parents = life.parents.map((parent) => {
    const age = ageLabel(parent.ageAtBirth + (parent.diedAt ?? life.ageInMonths));
    return el('p', 'parent-line', el('strong', '', tr(parentLabels[parent.role])),
      el('span', '', parent.diedAt === undefined ? age : tr`${parent.role === 'mother' ? tr('Умерла') : tr('Умер')} · ${age}`));
  });
  const siblingCards = siblings(life).map((person) => {
    const age = ageLabel(person.ageInMonths);
    const status = person.diedAt === undefined ? age : tr`${person.role === 'Сестра' ? tr('Умерла') : tr('Умер')} · ${age}`;
    const row = el('div', 'sibling-card', el('p', 'parent-line', el('strong', '', tr(person.role)), el('span', '', status)));
    if (person.diedAt === undefined) {
      row.append(metric(tr('Доверие'), person.trust));
      if (commit && canVisitSibling(life, person)) row.append(button(tr('Провести время вместе'),
        () => commit(visitSibling(life, person.index)), 'quiet', `sibling-${person.index}`));
    }
    return row;
  });
  const contacts = life.relationships.map((person) => {
    const memories = el('ol', 'chronicle', ...person.memories.slice(-6).reverse().map((memory) => el('li', '',
      el('span', 'event-age', ageLabel(memory.ageInMonths)),
      el('span', '', memory.kind === 'world' ? tr(worldEvents[memory.event][0]) : pastChoices[memory.kind]))));
    const description = el('div', '', el('p', '', relationshipDescriptions[person.id]),
      ...(person.id === 'friend' && person.role ? [el('p', 'helper', tr`Роль в жизни героя: ${friendRoleLabels[person.role]}.`)] : []));
    if (person.country) description.append(el('p', 'helper', tr`Место знакомства — ${countryLabel(person.country)}.`));
    const content = [el('div', 'social-person', portrait(person.id, person.country ?? life.birth.countryOfBirth, life.seed + person.id.length), description), metric(tr('Доверие'), person.trust)];
    const card = panel(person.id === 'caregiver' && life.parents.length ? tr('Поддержка семьи') : peopleLabels[person.id], ...content, person.memories.length
      ? el('div', '', el('h3', '', tr('Последние общие воспоминания')), memories)
      : el('p', 'helper', tr('Общие воспоминания появятся по ходу жизни.')));
    card.classList.add('indicator', 'indicator-people');
    return card;
  });
  const details = el('details', 'social-details', el('summary', '', tr('Детали семьи и общие воспоминания')),
    household, ...contacts);
  const closePeople = life.relationships.filter((person) => person.id !== 'caregiver' || !life.parents.length);
  return panel(tr('Круг общения'), ...parents, ...siblingCards, ...closePeople.map((person) =>
    el('p', 'parent-line', peopleLabels[person.id], el('span', '', tr`Доверие ${person.trust}`))), details);
}
