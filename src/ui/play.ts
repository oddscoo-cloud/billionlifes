import { demographics } from '../data/demographics';
import { availableActions, resolveAction } from '../sim/actions';
import type { ActionOption } from '../sim/actions';
import { availableCrisisChoices, resolveCrisisChoice } from '../sim/crisis';
import { plans } from '../sim/growth';
import type { Plan } from '../sim/growth';
import {
  advanceMonth, advanceYear, availableChildhoodChoices, resolveChildhoodChoice, setPlan,
} from '../sim/life';
import type { LifeSnapshot } from '../sim/life';
import { button, el, facts, heading, panel } from './elements';
import {
  ageLabel, childhoodLabels, decisionLabels, educationLabels, employmentLabels, eventLabel,
  peopleLabels, phaseLabels, planLabels, skillLabels,
} from './labels';
import { portrait } from './portrait';

export function metric(label: string, value: number): HTMLElement {
  const meter = el('meter');
  meter.max = 100;
  meter.value = value;
  meter.setAttribute('aria-label', label);
  return el('div', 'metric', el('div', '', el('span', '', label), el('span', '', String(value))), meter);
}

export function relations(life: LifeSnapshot): HTMLElement {
  const cards = life.relationships.map((person) => el('article', 'person', portrait(person.id),
    el('div', '', el('h3', '', peopleLabels[person.id]), metric('Доверие', person.trust))));
  return panel('Близкие', ...cards);
}

export function chronicle(life: LifeSnapshot, limit: number, more: () => void): HTMLElement {
  const items = el('ol', 'chronicle');
  for (const event of life.chronicle.slice(-limit).reverse()) {
    items.append(el('li', '', el('span', 'event-age', ageLabel(event.ageInMonths)),
      el('span', '', eventLabel(event))));
  }
  const section = panel('Хроника', items);
  if (life.chronicle.length > limit) {
    section.append(button('Показать более ранние записи', more, 'quiet', 'older-events'));
  }
  return section;
}

function development(life: LifeSnapshot): HTMLElement {
  const { skills, interests, character, appearance } = life.development;
  const skillMeters = Object.entries(skillLabels).map(([key, label]) =>
    metric(label, skills[key as keyof typeof skills]));
  return panel('Развитие', el('h3', '', 'Навыки'), ...skillMeters,
    el('h3', '', 'Характер и внешность'),
    metric('Дисциплина', character.discipline), metric('Открытость', character.openness),
    metric('Привлекательность', appearance),
    el('details', '', el('summary', '', 'Интересы'), ...plans.map((id) => metric(planLabels[id], interests[id]))));
}

interface PlayHandlers {
  commit: (life: LifeSnapshot) => void;
  preview: (option: ActionOption | null) => void;
  home: () => void;
  more: () => void;
}

function controls(life: LifeSnapshot, selected: ActionOption | null, handlers: PlayHandlers): HTMLElement {
  const { status } = life;
  const options = availableActions(life);
  const ongoing = status.type === 'active';
  const section = panel(status.type === 'decision' ? decisionLabels[status.decision] : 'Следующий ход');
  if (ongoing) {
    section.append(el('div', 'turns',
      button('Прожить месяц', () => handlers.commit(advanceMonth(life)), 'quiet', 'month'),
      button('Прожить год', () => handlers.commit(advanceYear(life)), 'primary', 'year')));
    if (life.ageInMonths >= 48) {
      const select = el('select');
      select.id = 'life-plan';
      select.append(new Option('Без плана', ''), ...plans.map((id) => new Option(planLabels[id], id)));
      select.value = life.development.plan ?? '';
      select.addEventListener('change', () => handlers.commit(setPlan(life, (select.value || null) as Plan | null)));
      section.append(el('label', 'field plan', 'План на месяцы', select));
    }
  } else {
    section.append(el('p', 'status-text', 'Время на паузе. Выберите, что делать дальше.'));
    if (status.type === 'decision' && status.decision === 'school-crisis') {
      section.append(el('p', '', eventLabel(life.chronicle.at(-1)!)));
    }
  }

  const first = availableChildhoodChoices(life).map((id) =>
    button(childhoodLabels[id], () => handlers.commit(resolveChildhoodChoice(life, id)), 'quiet', id));
  const crisis = availableCrisisChoices(life).map(({ id, label }) =>
    button(label, () => handlers.commit(resolveCrisisChoice(life, id)), 'quiet', id));
  if (first.length || crisis.length) section.append(el('div', 'option-list', ...first, ...crisis));
  if (options.length) {
    if (ongoing) section.append(el('h3', '', 'Действия'));
    const actions = options.map((option) => {
      const id = option.action.id === 'move' ? option.action.destination : option.action.id;
      return button(option.label, () => handlers.preview(option), 'quiet', `action-${id}`);
    });
    section.append(el('div', 'option-list', ...actions));
  }
  if (selected) {
    const percent = new Intl.NumberFormat('ru', { style: 'percent', maximumFractionDigits: 1 });
    const title = el('h3', '', selected.label);
    title.id = 'action-preview';
    title.tabIndex = -1;
    const preview = el('section', 'preview', title);
    if (selected.chance < 1) {
      preview.append(el('p', '', `Шанс в симуляции — ${percent.format(selected.chance)}`),
        el('ul', '', ...selected.factors.map(({ label, contribution }) => el('li', '',
          `${label} · ${percent.format(contribution)}`))));
    }
    if (selected.cost) preview.append(el('p', '', `Стоимость — ${selected.cost} ед. достатка`));
    preview.append(el('div', 'turns',
      button('Отмена', () => handlers.preview(null), 'quiet', 'cancel-action'),
      button('Подтвердить', () => handlers.commit(resolveAction(life, selected.action)), 'primary', 'confirm-action')));
    section.prepend(preview);
  }
  return section;
}

export function play(
  life: LifeSnapshot, selected: ActionOption | null, limit: number, handlers: PlayHandlers,
): HTMLElement {
  const profile = el('section', 'profile', el('div', '',
    el('div', 'eyebrow', 'Дневник жизни'), heading(life.birth.name),
    el('p', 'location', `${ageLabel(life.ageInMonths)} · ${demographics.countries[life.countryOfResidence].name}`)),
  button('Меню', handlers.home, 'quiet', 'menu'));
  const { family, startingHealth } = life.birth;
  const caregivers = {
    'two-parents': 'Двое родителей', 'one-parent': 'Один родитель', 'other-guardians': 'Другие опекуны',
  };
  const householdMeans = { limited: 'Ограниченный', moderate: 'Средний', high: 'Высокий' };
  const data = facts([
    ['Страна рождения', demographics.countries[life.birth.countryOfBirth].name],
    ['Достаток', `${life.development.funds} ед.`],
    ['Образование', educationLabels[life.development.education]],
    ['Занятость', employmentLabels[life.development.employment]],
  ]);
  const birth = el('details', '', el('summary', '', 'Условия при рождении'), facts([
    ['Семья', caregivers[family.caregivers]],
    ['Старшие братья и сёстры', family.olderSiblings],
    ['Достаток семьи', householdMeans[family.means]],
    ['Здоровье', startingHealth === 'typical' ? 'Обычное' : 'Требовалась поддержка'],
  ]));
  const wellbeing = panel('Самочувствие', el('p', '', phaseLabels[life.wellbeing.phase]),
    metric('Настроение', life.wellbeing.mood));
  return el('div', '', profile, el('div', 'grid',
    el('div', 'stack', controls(life, selected, handlers), chronicle(life, limit, handlers.more)),
    el('aside', 'stack', panel('О герое', data, birth), wellbeing, development(life), relations(life))));
}
