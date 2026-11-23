import { siblings } from '../sim/siblings';
import { healthStatus, seekMedicalCare } from '../sim/health';
import { availableRomance, chooseRomance, romance, romanceLabels } from '../sim/romance';
import type { RomanceAction } from '../sim/romance';
import { characterTraits, traitLabels } from '../sim/traits';
import { resolveTurningPoint, turningPoints } from '../sim/turning-points';
import { autoplayDelays } from './autoplay-delay';
import type { AutoplayDelay } from './autoplay-delay';
import { yearlyPrecipitation } from '../data/households';
import { familySupport, griefChoices, resolveGrief } from '../sim/family';
import { socialCircle } from './journal';
import { worldScene } from '../data/world-event-variants';
import { eventEffects } from '../data/world-events';
import type { EventEffect } from '../data/world-events';
import type { WorldEvent } from '../sim/world';
import { demographics } from '../data/demographics';
import { availableActions, resolveAction } from '../sim/actions';
import type { ActionOption } from '../sim/actions';
import { availableCrisisChoices, resolveCrisisChoice } from '../sim/crisis';
import { plans } from '../sim/growth';
import type { Plan } from '../sim/growth';
import {
  advanceEarlyChildhood, advanceMonth, advanceYear, availableChildhoodChoices, firstChoiceAgeInMonths,
  resolveChildhoodChoice, setPlan,
} from '../sim/life';
import type { LifeSnapshot } from '../sim/life';
import { button, el, facts, heading, panel } from './elements';
import {
  ageLabel, childhoodLabels, decisionLabels, educationLabels, employmentLabels, eventLabel,
  mentalHealthLabels, mentalSeverityLabels, peopleLabels, phaseLabels, physicalHealthLabels, planLabels, skillLabels, wealthLabel,
} from './labels';
import { actionEffects, childhoodEffects, crisisEffects, decisionContext, planEffects, riskEffects } from './choice-copy';
import { innerVoice } from '../sim/inner-voice';

export function metric(label: string, value: number): HTMLElement {
  const meter = el('meter');
  meter.max = 100;
  meter.value = value;
  meter.setAttribute('aria-label', label);
  return el('div', 'metric', el('div', '', el('span', '', label), el('span', '', String(value))), meter);
}

const effectLabels: Record<EventEffect, string> = {
  mood: 'Настроение', funds: 'Достаток', academics: 'Учёба',
  creativity: 'Творчество', communication: 'Общение', resilience: 'Стойкость',
  practical: 'Практичность', empathy: 'Эмпатия', trust: 'Доверие',
};
const signed = new Intl.NumberFormat('ru', { signDisplay: 'always' });

function worldDetails(event: WorldEvent, life: LifeSnapshot): HTMLElement {
  const [, story] = worldScene(event.id, event.variant);
  const sibling = event.sibling === undefined ? undefined : siblings(life)[event.sibling];
  const changes = eventEffects.flatMap((effect) => {
    const value = event.effects[effect];
    if (!value) return [];
    const relation = event.person ? peopleLabels[event.person] : sibling?.role;
    const label = effect === 'trust' && relation ? `Доверие · ${relation}` : effectLabels[effect];
    return [el('span', value > 0 ? 'gain' : 'loss', `${label} ${signed.format(value)}`)];
  });
  const context = event.id.startsWith('rain') && event.country ? el('p', 'helper',
    `Осадки в стране — в среднем ${yearlyPrecipitation[event.country]} мм в год по данным Всемирного банка.`) : null;
  const family = sibling ? el('p', 'helper', `Вместе с ${sibling.role === 'Брат' ? 'братом' : 'сестрой'}.`) : null;
  return el('div', 'world-details', el('p', 'helper', story), ...(family ? [family] : []),
    ...(changes.length ? [el('div', 'effects', ...changes)] : []), ...(context ? [context] : []));
}

export function chronicle(life: LifeSnapshot, limit: number, more: () => void): HTMLElement {
  const items = el('ol', 'chronicle');
  for (const event of life.chronicle.slice(-limit).reverse()) {
    const content = event.type === 'world'
      ? el('details', 'world-entry', el('summary', '', eventLabel(event)), worldDetails(event, life))
      : event.type === 'turning-point' || event.type === 'turning-consequence'
        ? el('div', 'turning-entry', el('span', 'turning-entry-label', event.type === 'turning-point' ? 'Трудный выбор' : 'Последствие решения'),
          el('span', '', eventLabel(event)))
        : el('span', '', eventLabel(event));
    items.append(el('li', '', el('span', 'event-age', ageLabel(event.ageInMonths)), content));
  }
  const section = panel('Хроника', items);
  if (life.chronicle.length > limit) {
    section.append(button('Показать более ранние записи', more, 'quiet', 'older-events'));
  }
  return section;
}

export function indicatorPanel(title: string, category: string, ...content: Node[]): HTMLElement {
  const section = panel(title, ...content);
  section.classList.add('indicator', `indicator-${category}`);
  return section;
}

function development(life: LifeSnapshot): HTMLElement[] {
  const { skills } = life.development;
  const skillMeters = Object.entries(skillLabels).map(([key, label]) =>
    metric(label, skills[key as keyof typeof skills]));
  return [
    indicatorPanel('Навыки', 'skills', ...skillMeters),
    characterPanel(life),
  ];
}

export function characterPanel(life: LifeSnapshot): HTMLElement {
  const traits = characterTraits(life);
  const list = el('ul', 'trait-list', ...traits.map(({ id, reason }) =>
    el('li', '', el('strong', '', traitLabels[id]), el('p', 'helper', reason))));
  return indicatorPanel('Характер', 'character', traits.length ? list
    : el('p', 'helper', 'Черты проявятся через трудные решения и повторяющийся жизненный опыт.'));
}

interface PlayHandlers {
  commit: (life: LifeSnapshot) => void;
  preview: (option: ActionOption | null) => void;
  home: () => void;
  diary: () => void;
  auto: boolean;
  toggleAuto: () => void;
  delay: AutoplayDelay;
  changeDelay: (delay: AutoplayDelay) => void;
  more: () => void;
}

const percent = new Intl.NumberFormat('ru', { style: 'percent', maximumFractionDigits: 1 });

function choiceCard(label: string, details: string, click: () => void, id: string, primary = false): HTMLElement {
  const description = el('span', 'choice-description', details);
  description.id = `${id}-description`;
  const control = button(label, click, primary ? 'choice-card primary' : 'choice-card', id);
  control.setAttribute('aria-describedby', description.id);
  control.setAttribute('aria-label', label);
  control.append(description);
  return control;
}

function planControl(life: LifeSnapshot, commit: PlayHandlers['commit']): HTMLElement {
  const select = el('select');
  select.id = 'life-plan';
  select.append(new Option('Без плана', ''), ...plans.map((id) => new Option(planLabels[id], id)));
  const current = life.development.plan;
  select.value = current ?? '';
  const description = el('p', 'helper');
  description.id = 'plan-description';
  description.setAttribute('aria-live', 'polite');
  select.setAttribute('aria-describedby', description.id);
  const save = button('Применить план', () => commit(setPlan(life, (select.value || null) as Plan | null)),
    'quiet', 'apply-plan');
  const update = () => {
    const choice = (select.value || null) as Plan | null;
    description.textContent = choice ? planEffects[choice] : 'Герой будет проживать месяцы без выбранного занятия.';
    save.disabled = choice === current;
  };
  update();
  select.addEventListener('change', update);
  return el('div', 'plan-block', el('h3', '', 'Что герой делает каждый месяц'),
    el('p', 'helper', current ? `Текущий план — ${planLabels[current]}.` : 'Текущий план — без плана.'),
    el('label', 'field plan', 'Выбрать план', select), description, save);
}

function actionEffect(option: ActionOption): string {
  if (option.action.id === 'move') return `Сменит страну проживания за ${option.cost} ед. достатка.`;
  return actionEffects[option.action.id];
}

function actionPreview(life: LifeSnapshot, selected: ActionOption, handlers: PlayHandlers): HTMLElement {
  const title = el('h2', '', selected.label);
  title.id = 'action-preview';
  title.tabIndex = -1;
  const preview = el('section', 'panel preview', title, el('p', '', actionEffect(selected)));
  if (selected.chance < 1) {
    preview.append(el('h3', '', `Шанс в симуляции — ${percent.format(selected.chance)}`),
      el('ul', 'chance-factors', ...selected.factors.map(({ label, contribution }) => el('li', '',
        `${label} · ${percent.format(contribution)}`))));
  }
  const actionId = selected.action.id;
  if (actionId === 'apply-university' || actionId === 'specialist-job') {
    preview.append(el('p', 'helper', riskEffects[actionId]));
  }
  preview.append(el('p', 'helper', 'Действие произойдёт сразу. Возраст изменится только после хода.'),
    el('div', 'turns',
      button('К вариантам', () => handlers.preview(null), 'quiet', 'cancel-action'),
      button('Подтвердить', () => handlers.commit(resolveAction(life, selected.action)), 'primary', 'confirm-action')));
  preview.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') handlers.preview(null);
  });
  return preview;
}

function controls(life: LifeSnapshot, selected: ActionOption | null, handlers: PlayHandlers): HTMLElement {
  if (selected) return actionPreview(life, selected, handlers);

  const { status } = life;
  const options = availableActions(life);
  const ongoing = status.type === 'active';
  const scene = status.type === 'decision' && status.decision === 'turning-point' ? turningPoints[status.id] : null;
  const section = panel(scene?.title ?? (status.type === 'decision' ? decisionLabels[status.decision] : 'Продвинуть время'));
  const title = section.querySelector('h2')!;
  title.id = 'turn-title';
  title.tabIndex = -1;
  if (ongoing) {
    section.append(el('div', 'turn-options',
      choiceCard('Прожить месяц', 'Один шаг вперёд. Удобно, если вы хотите менять план по ходу жизни.',
        () => handlers.commit(advanceMonth(life)), 'month'),
      choiceCard('Прожить год', 'До 12 месяцев. Важный выбор или смерть остановят ход раньше.',
        () => handlers.commit(advanceYear(life)), 'year', true),
      ...(life.ageInMonths < firstChoiceAgeInMonths ? [
        choiceCard('До четырёх лет', 'Прожить раннее детство одним ходом. Игра остановится при важном событии или смерти.',
          () => handlers.commit(advanceEarlyChildhood(life)), 'early-childhood'),
      ] : [])));
    const delay = el('select');
    delay.id = 'autoplay-delay';
    delay.append(...autoplayDelays.map((seconds) => new Option(
      seconds === 1 ? '1 секунда' : seconds === 3 ? '3 секунды' : `${seconds} секунд`, String(seconds),
    )));
    delay.value = String(handlers.delay);
    delay.addEventListener('change', () => {
      const value = autoplayDelays.find((seconds) => String(seconds) === delay.value);
      if (value !== undefined) handlers.changeDelay(value);
    });
    section.append(el('div', 'autoplay-settings',
      el('label', 'field', 'Задержка автохода', delay),
      button(handlers.auto ? 'Остановить автоход' : 'Включить автоход',
        handlers.toggleAuto, handlers.auto ? 'primary' : 'quiet', 'autoplay')),
      el('p', 'helper', 'Автоход проживает месяцы за вас и останавливается у важных решений.'));
    if (life.ageInMonths < firstChoiceAgeInMonths) {
      section.append(el('p', 'helper', 'В раннем детстве события попадают в хронику. Первое решение появится в четыре года.'));
    } else {
      section.append(planControl(life, handlers.commit));
    }
  } else if (status.type === 'decision') {
    section.classList.add('decision');
    section.prepend(el('p', 'pause-label', 'Время на паузе'));
    if (status.decision === 'school-crisis' || status.decision === 'mental-health') {
      const event = life.chronicle.slice(-8).reverse().find(({ type }) => type === 'crisis');
      if (event) section.append(el('p', '', eventLabel(event)));
    }
    if (status.decision === 'family-loss') {
      const losses = life.chronicle.filter((event) => (event.type === 'parent-death' || event.type === 'sibling-death') && event.ageInMonths === life.ageInMonths);
      section.append(el('p', '', losses.map(eventLabel).join('. ') + '.'));
    }
    if (scene) {
      section.append(el('p', '', scene.story));
      if (status.decision === 'turning-point' && status.id === 'lost-job') {
        section.append(el('p', 'helper', 'Подать заявку на новую постоянную работу можно через два месяца.'));
      }
    }
    else section.append(el('p', 'helper', decisionContext[status.decision]));
  }

  const first = availableChildhoodChoices(life).map((id) => choiceCard(id === 'read-with-caregiver' ? `Почитать вместе · ${familySupport(life)}` : childhoodLabels[id], childhoodEffects[id],
    () => handlers.commit(resolveChildhoodChoice(life, id)), id));
  const crisis = availableCrisisChoices(life).map(({ id, label }) => choiceCard(label, crisisEffects[id],
    () => handlers.commit(resolveCrisisChoice(life, id)), id));
  const grief = status.type === 'decision' && status.decision === 'family-loss'
    ? griefChoices.map((id) => choiceCard(id === 'support' ? 'Обратиться за поддержкой' : 'Вспомнить хорошее',
      id === 'support' ? 'Разговор с близкими поможет справиться с потерей.' : 'Герой вспомнит моменты, проведённые вместе.',
      () => handlers.commit(resolveGrief(life, id)), `grief-${id}`))
    : [];
  const challenges = scene ? ([0, 1] as const).map((index) => {
    const option = scene.responses[index];
    return choiceCard(option.label, option.hint, () => handlers.commit(resolveTurningPoint(life, index)), `turning-${index}`);
  }) : [];
  const decisions = [...first, ...crisis, ...grief, ...challenges];
  if (decisions.length) section.append(el('div', 'choice-grid', ...decisions));
  if (options.length) {
    if (ongoing) section.append(el('h3', '', 'Что можно сделать сейчас'));
    section.append(el('p', 'helper', 'Откройте вариант, чтобы увидеть условия и подтвердить действие.'));
    const actions = options.map((option) => {
      const id = option.action.id === 'move' ? option.action.destination : option.action.id;
      const chance = option.chance < 1 ? ` · Шанс ${percent.format(option.chance)}` : '';
      return choiceCard(option.label, actionEffect(option) + chance,
        () => handlers.preview(option), `action-${id}`);
    });
    section.append(el('div', 'choice-grid', ...actions));
  }
  return section;
}

const romanceActions: Record<RomanceAction, string> = {
  date: 'Предложить свидание', 'spend-time': 'Провести время вдвоём',
  love: 'Поговорить о чувствах', end: 'Поставить точку',
};

function wellbeingPanel(life: LifeSnapshot, commit: PlayHandlers['commit']): HTMLElement {
  const health = healthStatus(life);
  const current = romance(life);
  const moodLabel = life.wellbeing.mood <= 20 ? 'Очень низкое настроение'
    : life.wellbeing.mood <= 40 ? 'Сниженное настроение' : phaseLabels[life.wellbeing.phase];
  const section = indicatorPanel('Самочувствие', 'wellbeing', el('p', '', moodLabel),
    metric('Настроение', life.wellbeing.mood), facts([
      ['Здоровье', health.label],
      ['Физическое состояние', physicalHealthLabels[life.physicalHealth.condition]],
    ]),
    el('p', 'helper', `${health.detail} Настроение отражает состояние сейчас, а психическое состояние — устойчивые изменения за несколько месяцев.`));
  const mental = life.wellbeing.mentalHealth ?? { condition: 'none' as const, severity: 0 as const };
  section.append(facts([['Психическое состояние', mentalHealthLabels[mental.condition]],
    ['Выраженность', mentalSeverityLabels[mental.severity]],
    ...(mental.condition !== 'none' ? [
      ['Длительность', `${mental.months} мес.`] as const,
      ['Поддержка', mental.supported ? 'Есть' : 'Не подключена'] as const,
    ] : [])]));
  if (life.physicalHealth.condition === 'serious') {
    section.append(button('Обратиться за медицинской помощью',
      () => commit(seekMedicalCare(life)), 'primary', 'seek-medical-care'));
  }
  if (life.ageInMonths < 18 * 12) return section;
  if (!current) {
    section.append(facts([['Романтика', 'Пока нет']]));
    return section;
  }
  section.append(facts([[romanceLabels[current.stage], current.name]]));
  const options = availableRomance(life);
  if (options.length) section.append(el('details', 'romance-actions', el('summary', '', 'Романтика'),
    ...(current.stage === 'date' && !options.includes('love')
      ? [el('p', 'helper', 'Разговор о чувствах станет доступен после двух встреч и четырёх месяцев отношений.')] : []),
    ...options.map((step) => button(romanceActions[step], () => commit(chooseRomance(life, step)), 'quiet', `romance-${step}`))));
  return section;
}

export function play(
  life: LifeSnapshot, selected: ActionOption | null, limit: number, handlers: PlayHandlers,
): HTMLElement {
  const voice = innerVoice(life);
  const profile = el('section', 'profile', el('div', '',
    heading(life.birth.name),
    el('p', 'location', `${ageLabel(life.ageInMonths)} · ${demographics.countries[life.countryOfResidence].name}`),
    el('p', 'voice-line', `Желание: «${voice.desire}»`)),
  el('div', 'profile-actions', button('Дневник', handlers.diary, 'quiet', 'open-diary'),
    button('Меню', handlers.home, 'quiet', 'menu')));
  const { family, startingHealth } = life.birth;
  const caregivers = {
    'two-parents': 'Двое родителей', 'one-parent': 'Один родитель', 'other-guardians': 'Другие опекуны',
  };
  const householdMeans = { limited: 'Ограниченный', moderate: 'Средний', high: 'Высокий' };
  const data = facts([
    ['Страна рождения', demographics.countries[life.birth.countryOfBirth].name],
    ['Достаток', `${wealthLabel(life.development.funds)} · ${life.development.funds} ед.`],
    ['Образование', educationLabels[life.development.education]],
    ['Занятость', employmentLabels[life.development.employment]],
  ]);
  const birth = el('details', '', el('summary', '', 'Условия при рождении'), facts([
    ['Людей в доме при рождении', family.olderSiblings + (family.caregivers === 'two-parents' ? 3 : 2)],
    ['Семья', caregivers[family.caregivers]],
    ['Старшие братья и сёстры', family.olderSiblings],
    ['Достаток семьи', householdMeans[family.means]],
    ['Здоровье', startingHealth === 'typical' ? 'Обычное' : 'Требовалась поддержка'],
  ]));
  const wellbeing = wellbeingPanel(life, handlers.commit);
  const indicators = el('aside', 'indicators', el('div', 'indicator-grid',
    wellbeing, ...development(life),
    indicatorPanel('О герое', 'profile', data, metric('Привлекательность', life.development.appearance), birth)),
    socialCircle(life, handlers.commit));
  indicators.setAttribute('aria-label', 'Показатели героя');
  indicators.tabIndex = -1;
  const recent = life.chronicle.slice(-12).reverse().find((event) => event.type === 'world');
  const spotlight = recent?.type === 'world' && life.ageInMonths - recent.ageInMonths <= 2
    ? [el('section', 'panel world-spotlight', el('p', 'world-kicker', `Вокруг героя · ${ageLabel(recent.ageInMonths)}`),
      el('h2', '', eventLabel(recent)), worldDetails(recent, life))]
    : [];
  const turn = controls(life, selected, handlers);
  const workspace = el('section', 'workspace stack', turn);
  workspace.setAttribute('aria-label', 'Управление жизнью');
  workspace.tabIndex = 0;
  const timeline = el('section', 'timeline stack', ...spotlight, chronicle(life, limit, handlers.more));
  timeline.setAttribute('aria-label', 'Журнал жизни');
  timeline.tabIndex = 0;
  const grid = el('div', 'dashboard-grid', workspace, timeline, indicators);
  const sections = [
    ['turns', 'Ходы', workspace],
    ['journal', 'Журнал жизни', timeline],
    ['stats', 'Показатели', indicators],
  ] as const;
  const tabs = el('div', 'dashboard-tabs');
  tabs.setAttribute('role', 'group');
  tabs.setAttribute('aria-label', 'Разделы игры');
  for (const [id, label, region] of sections) {
    region.id = `dashboard-${id}`;
    const tab = button(label, () => {
      grid.dataset.mobilePanel = id;
      for (const control of tabs.querySelectorAll('button')) {
        control.setAttribute('aria-pressed', String(control === tab));
      }
    }, 'quiet', `${id}-tab`);
    tab.setAttribute('aria-controls', region.id);
    tab.setAttribute('aria-pressed', String(id === 'turns'));
    tabs.append(tab);
  }
  grid.dataset.mobilePanel = 'turns';
  return el('div', 'dashboard', profile, el('div', 'dashboard-content', tabs, grid));
}
