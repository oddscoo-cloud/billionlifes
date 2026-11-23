import { getLanguage, tr } from './i18n';
import { siblings } from '../sim/siblings';
import { healthStatus, seekMedicalCare } from '../sim/health';
import { availableRomance, chooseRomance, romance, romanceLabels } from '../sim/romance';
import type { RomanceAction } from '../sim/romance';
import { characterTraits, traitLabels } from '../sim/traits';
import { resolveTurningPoint, turningPoints } from '../sim/turning-points';
import { autoplayDelays } from './autoplay-delay';
import type { AutoplayDelay } from './autoplay-delay';
import { precipitationFor } from '../data/households';
import { familySupport, griefChoices, resolveGrief } from '../sim/family';
import { socialCircle } from './journal';
import { worldScene } from '../data/world-event-variants';
import { eventEffects } from '../data/world-events';
import type { EventEffect } from '../data/world-events';
import type { WorldEvent } from '../sim/world';
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
  actionLabel, countryLabel, healthDetail, ageLabel, careerLabels, childhoodLabels, decisionLabels, educationLabels, employmentLabels, eventLabel, projectLabels,
  mentalHealthLabels, mentalSeverityLabels, peopleLabels, phaseLabels, physicalHealthLabels, planLabels, skillLabels, wealthLabel,
} from './labels';
import { actionEffects, childhoodEffects, crisisEffects, decisionContext, planEffects, riskEffects } from './choice-copy';
import { innerVoice } from '../sim/inner-voice';
import { goalDescriptions, goalIds, goalLabels, goalProgress, setGoal } from '../sim/goals';
import { achievements } from '../sim/achievements';

export function metric(label: string, value: number): HTMLElement {
  const meter = el('meter');
  meter.max = 100;
  meter.value = value;
  meter.setAttribute('aria-label', label);
  return el('div', 'metric', el('div', '', el('span', '', label), el('span', '', String(value))), meter);
}

const effectLabels: Record<EventEffect, string> = {
  mood: tr('Настроение'), funds: tr('Достаток'), academics: tr('Учёба'),
  creativity: tr('Творчество'), communication: tr('Общение'), resilience: tr('Стойкость'),
  practical: tr('Практичность'), empathy: tr('Эмпатия'), trust: tr('Доверие'),
};
const signed = new Intl.NumberFormat(getLanguage(), { signDisplay: 'always' });

function worldDetails(event: WorldEvent, life: LifeSnapshot): HTMLElement {
  const [, story] = worldScene(event.id, event.variant);
  const sibling = event.sibling === undefined ? undefined : siblings(life)[event.sibling];
  const changes = eventEffects.flatMap((effect) => {
    const value = event.effects[effect];
    if (!value) return [];
    const relation = event.person ? peopleLabels[event.person] : sibling && tr(sibling.role);
    const label = effect === 'trust' && relation ? tr`Доверие · ${relation}` : effectLabels[effect];
    return [el('span', value > 0 ? 'gain' : 'loss', `${label} ${signed.format(value)}`)];
  });
  const context = event.id.startsWith('rain') && event.country ? el('p', 'helper',
    tr`Осадки в стране — в среднем ${precipitationFor(event.country)} мм в год по данным Всемирного банка.`) : null;
  const family = sibling ? el('p', 'helper', tr`Вместе с ${sibling.role === 'Брат' ? tr('братом') : tr('сестрой')}.`) : null;
  return el('div', 'world-details', el('p', 'helper', tr(story)), ...(family ? [family] : []),
    ...(changes.length ? [el('div', 'effects', ...changes)] : []), ...(context ? [context] : []));
}

export function chronicle(life: LifeSnapshot, limit: number, more: () => void): HTMLElement {
  const items = el('ol', 'chronicle');
  for (const event of life.chronicle.slice(-limit).reverse()) {
    const content = event.type === 'world'
      ? el('details', 'world-entry', el('summary', '', eventLabel(event)), worldDetails(event, life))
      : event.type === 'turning-point' || event.type === 'turning-consequence'
        ? el('div', 'turning-entry', el('span', 'turning-entry-label', event.type === 'turning-point' ? tr('Трудный выбор') : tr('Последствие решения')),
          el('span', '', eventLabel(event)))
        : el('span', '', eventLabel(event));
    items.append(el('li', '', el('span', 'event-age', ageLabel(event.ageInMonths)), content));
  }
  const section = panel(tr('Хроника'), items);
  if (life.chronicle.length > limit) {
    section.append(button(tr('Показать более ранние записи'), more, 'quiet', 'older-events'));
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
    indicatorPanel(tr('Навыки'), 'skills', ...skillMeters),
    characterPanel(life),
  ];
}

export function characterPanel(life: LifeSnapshot): HTMLElement {
  const traits = characterTraits(life);
  const list = el('ul', 'trait-list', ...traits.map(({ id, reason, source }) =>
    el('li', '', el('strong', '', tr(traitLabels[id])), el('p', 'helper',
      source ? `${tr(source.title)} — ${tr(source.choice)}.` : tr(reason)))));
  return indicatorPanel(tr('Характер'), 'character', traits.length ? list
    : el('p', 'helper', tr('Черты проявятся через трудные решения и повторяющийся жизненный опыт.')));
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

const percent = new Intl.NumberFormat(getLanguage(), { style: 'percent', maximumFractionDigits: 1 });

function choiceCard(label: string, details: string, click: () => void, id: string, primary = false): HTMLElement {
  const description = el('span', 'choice-description', details);
  description.id = `${id}-description`;
  const control = button(label, click, primary ? 'choice-card primary' : 'choice-card', id);
  control.setAttribute('aria-describedby', description.id);
  control.setAttribute('aria-label', label);
  control.append(description);
  return control;
}

function goalsDialog(life: LifeSnapshot, commit: PlayHandlers['commit']): HTMLDialogElement {
  const title = el('h2', '', tr('Цели жизни'));
  title.id = 'goals-title';
  const lifeGoals = life.goals ?? [];
  const selected = new Set(lifeGoals.map((goal) => goal.id));
  const cards = goalIds.map((id) => {
    const progress = goalProgress(life, id);
    const active = selected.has(id);
    const card = el('article', `goal-card ${active ? 'goal-active' : ''}`,
      el('div', 'goal-card-head',
        el('strong', '', tr(goalLabels[id])),
        el('span', 'goal-percent', `${progress}%`)),
      el('p', 'helper', tr(goalDescriptions[id])),
      el('div', 'goal-progress',
        el('span', '', ''),
      ),
      button(active ? tr('Снять цель') : tr('Поставить цель'),
        () => commit(setGoal(life, id)), active ? 'quiet' : 'primary', `goal-${id}`));
    const bar = card.querySelector<HTMLElement>('.goal-progress span');
    if (bar) bar.style.width = `${progress}%`;
    card.querySelector('button')!.disabled = !active && lifeGoals.length >= 3;
    return card;
  });
  const dialog = el('dialog', 'goals-dialog',
    title,
    el('p', 'helper', tr('Можно выбрать до трёх целей. Прогресс обновляется реальными решениями и изменениями в жизни.')),
    el('div', 'goal-grid', ...cards),
    el('div', 'turns', button(tr('Закрыть'), () => dialog.close(), 'quiet'))) as HTMLDialogElement;
  dialog.setAttribute('aria-labelledby', title.id);
  dialog.addEventListener('cancel', () => dialog.close());
  return dialog;
}

function planControl(life: LifeSnapshot, commit: PlayHandlers['commit']): HTMLElement {
  const select = el('select');
  select.id = 'life-plan';
  select.append(new Option(tr('Без плана'), ''), ...plans.map((id) => new Option(planLabels[id], id)));
  const current = life.development.plan;
  select.value = current ?? '';
  const description = el('p', 'helper');
  description.id = 'plan-description';
  description.setAttribute('aria-live', 'polite');
  select.setAttribute('aria-describedby', description.id);
  const save = button(tr('Применить план'), () => commit(setPlan(life, (select.value || null) as Plan | null)),
    'quiet', 'apply-plan');
  const update = () => {
    const choice = (select.value || null) as Plan | null;
    description.textContent = choice ? planEffects[choice] : tr('Герой будет проживать месяцы без выбранного занятия.');
    save.disabled = choice === current;
  };
  update();
  select.addEventListener('change', update);
  return el('div', 'plan-block', el('h3', '', tr('Что герой делает каждый месяц')),
    el('p', 'helper', current ? tr`Текущий план — ${planLabels[current]}.` : tr('Текущий план — без плана.')),
    el('label', 'field plan', tr('Выбрать план'), select), description, save);
}

function actionEffect(option: ActionOption): string {
  if (option.action.id === 'move') return tr`Сменит страну проживания за ${option.cost} ед. достатка.`;
  return actionEffects[option.action.id];
}

function actionPreview(life: LifeSnapshot, selected: ActionOption, handlers: PlayHandlers): HTMLElement {
  const title = el('h2', '', actionLabel(selected.action));
  title.id = 'action-preview';
  title.tabIndex = -1;
  const preview = el('section', 'panel preview', title, el('p', '', actionEffect(selected)));
  if (selected.chance < 1) {
    preview.append(el('h3', '', tr`Шанс в симуляции — ${percent.format(selected.chance)}`),
      el('ul', 'chance-factors', ...selected.factors.map(({ label, contribution }) => el('li', '',
        `${tr(label)} · ${percent.format(contribution)}`))));
  }
  const actionId = selected.action.id;
  if (actionId === 'apply-university' || actionId === 'specialist-job') {
    preview.append(el('p', 'helper', riskEffects[actionId]));
  }
  preview.append(el('p', 'helper', tr('Действие произойдёт сразу. Возраст изменится только после хода.')),
    el('div', 'turns',
      button(tr('К вариантам'), () => handlers.preview(null), 'quiet', 'cancel-action'),
      button(tr('Подтвердить'), () => handlers.commit(resolveAction(life, selected.action)), 'primary', 'confirm-action')));
  preview.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') handlers.preview(null);
  });
  return preview;
}

function achievementsDialog(life: LifeSnapshot): HTMLDialogElement {
  const title = el('h2', '', tr('Достижения жизни'));
  title.id = 'achievements-title';
  const items = achievements(life);
  const unlocked = items.filter((item) => item.unlocked).length;
  const dialog = el('dialog', 'achievements-dialog',
    title,
    el('p', 'achievement-count', tr`Открыто ${unlocked} из ${items.length}`),
    el('div', 'achievement-grid',
      ...items.map((item) => el('article', `achievement-card ${item.unlocked ? 'achievement-unlocked' : 'achievement-locked'}`,
        el('span', 'achievement-mark', item.unlocked ? '✓' : '○'),
        el('div', '', el('strong', '', tr(item.title)),
          el('p', 'helper', tr(item.description)))))),
    el('div', 'turns', button(tr('Закрыть'), () => dialog.close(), 'quiet'))) as HTMLDialogElement;
  dialog.setAttribute('aria-labelledby', title.id);
  dialog.addEventListener('cancel', () => dialog.close());
  return dialog;
}

function controls(life: LifeSnapshot, selected: ActionOption | null, handlers: PlayHandlers): HTMLElement {
  if (selected) return actionPreview(life, selected, handlers);

  const { status } = life;
  const options = availableActions(life);
  const ongoing = status.type === 'active';
  const scene = status.type === 'decision' && status.decision === 'turning-point' ? turningPoints[status.id] : null;
  const section = panel(scene ? tr(scene.title) : (status.type === 'decision' ? decisionLabels[status.decision] : tr('Продвинуть время')));
  const title = section.querySelector('h2')!;
  title.id = 'turn-title';
  title.tabIndex = -1;
  if (ongoing) {
    section.append(el('div', 'turn-options',
      choiceCard(tr('Прожить месяц'), tr('Один шаг вперёд. Удобно, если вы хотите менять план по ходу жизни.'),
        () => handlers.commit(advanceMonth(life)), 'month'),
      choiceCard(tr('Прожить год'), tr('До 12 месяцев. Важный выбор или смерть остановят ход раньше.'),
        () => handlers.commit(advanceYear(life)), 'year', true),
      ...(life.ageInMonths < firstChoiceAgeInMonths ? [
        choiceCard(tr('До четырёх лет'), tr('Прожить раннее детство одним ходом. Игра остановится при важном событии или смерти.'),
          () => handlers.commit(advanceEarlyChildhood(life)), 'early-childhood'),
      ] : [])));
    const delay = el('select');
    delay.id = 'autoplay-delay';
    delay.append(...autoplayDelays.map((seconds) => new Option(
      seconds === 1 ? tr('1 секунда') : seconds === 3 ? tr('3 секунды') : tr`${seconds} секунд`, String(seconds),
    )));
    delay.value = String(handlers.delay);
    delay.addEventListener('change', () => {
      const value = autoplayDelays.find((seconds) => String(seconds) === delay.value);
      if (value !== undefined) handlers.changeDelay(value);
    });
    section.append(el('div', 'autoplay-settings',
      el('label', 'field', tr('Задержка автохода'), delay),
      button(handlers.auto ? tr('Остановить автоход') : tr('Включить автоход'),
        handlers.toggleAuto, handlers.auto ? 'primary' : 'quiet', 'autoplay')),
      el('p', 'helper', tr('Автоход проживает месяцы за вас и останавливается у важных решений.')));
    if (life.ageInMonths < firstChoiceAgeInMonths) {
      section.append(el('p', 'helper', tr('В раннем детстве события попадают в хронику. Первое решение появится в четыре года.')));
    } else {
      section.append(planControl(life, handlers.commit));
    }
  } else if (status.type === 'decision') {
    section.classList.add('decision');
    section.prepend(el('p', 'pause-label', tr('Время на паузе')));
    if (status.decision === 'school-crisis' || status.decision === 'mental-health') {
      const event = life.chronicle.slice(-8).reverse().find(({ type }) => type === 'crisis');
      if (event) section.append(el('p', '', eventLabel(event)));
    }
    if (status.decision === 'family-loss') {
      const losses = life.chronicle.filter((event) => (event.type === 'parent-death' || event.type === 'sibling-death') && event.ageInMonths === life.ageInMonths);
      section.append(el('p', '', losses.map(eventLabel).join('. ') + '.'));
    }
    if (scene) {
      section.append(el('p', '', tr(scene.story)));
      if (status.decision === 'turning-point' && status.id === 'lost-job') {
        section.append(el('p', 'helper', tr('Подать заявку на новую постоянную работу можно через два месяца.')));
      }
    }
    else section.append(el('p', 'helper', decisionContext[status.decision]));
  }

  const first = availableChildhoodChoices(life).map((id) => choiceCard(id === 'read-with-caregiver' ? tr`Почитать вместе · ${tr(familySupport(life))}` : childhoodLabels[id], childhoodEffects[id],
    () => handlers.commit(resolveChildhoodChoice(life, id)), id));
  const crisis = availableCrisisChoices(life).map(({ id, label }) => choiceCard(id === 'ask-for-help' ? tr`Попросить поддержки · ${tr(familySupport(life))}` : tr(label), crisisEffects[id],
    () => handlers.commit(resolveCrisisChoice(life, id)), id));
  const grief = status.type === 'decision' && status.decision === 'family-loss'
    ? griefChoices.map((id) => choiceCard(id === 'support' ? tr('Обратиться за поддержкой') : tr('Вспомнить хорошее'),
      id === 'support' ? tr('Разговор с близкими поможет справиться с потерей.') : tr('Герой вспомнит моменты, проведённые вместе.'),
      () => handlers.commit(resolveGrief(life, id)), `grief-${id}`))
    : [];
  const challenges = scene ? ([0, 1] as const).map((index) => {
    const option = scene.responses[index];
    return choiceCard(tr(option.label), tr(option.hint), () => handlers.commit(resolveTurningPoint(life, index)), `turning-${index}`);
  }) : [];
  const decisions = [...first, ...crisis, ...grief, ...challenges];
  if (decisions.length) section.append(el('div', 'choice-grid', ...decisions));
  if (options.length) {
    if (ongoing) section.append(el('h3', '', tr('Что можно сделать сейчас')));
    section.append(el('p', 'helper', tr('Откройте вариант, чтобы увидеть условия и подтвердить действие.')));
    const actions = options.map((option) => {
      const id = option.action.id === 'move' ? option.action.destination : option.action.id;
      const chance = option.chance < 1 ? tr` · Шанс ${percent.format(option.chance)}` : '';
      return choiceCard(actionLabel(option.action), actionEffect(option) + chance,
        () => handlers.preview(option), `action-${id}`);
    });
    section.append(el('div', 'choice-grid', ...actions));
  }
  return section;
}

const romanceActions: Record<RomanceAction, string> = {
  date: tr('Предложить свидание'), 'spend-time': tr('Провести время вдвоём'),
  love: tr('Поговорить о чувствах'), end: tr('Поставить точку'),
};

function wellbeingPanel(life: LifeSnapshot, commit: PlayHandlers['commit']): HTMLElement {
  const health = healthStatus(life);
  const current = romance(life);
  const moodLabel = life.wellbeing.mood <= 20 ? tr('Очень низкое настроение')
    : life.wellbeing.mood <= 40 ? tr('Сниженное настроение') : phaseLabels[life.wellbeing.phase];
  const section = indicatorPanel(tr('Самочувствие'), 'wellbeing', el('p', '', moodLabel),
    metric(tr('Настроение'), life.wellbeing.mood), facts([
      [tr('Здоровье'), tr(health.label)],
      [tr('Физическое состояние'), physicalHealthLabels[life.physicalHealth.condition]],
    ]),
    el('p', 'helper', tr`${healthDetail(health.detail)} Настроение отражает состояние сейчас, а психическое состояние — устойчивые изменения за несколько месяцев.`));
  const mental = life.wellbeing.mentalHealth ?? { condition: 'none' as const, severity: 0 as const };
  section.append(facts([[tr('Психическое состояние'), mentalHealthLabels[mental.condition]],
    [tr('Выраженность'), mentalSeverityLabels[mental.severity]],
    ...(mental.condition !== 'none' ? [
      [tr('Длительность'), tr`${mental.months} мес.`] as const,
      [tr('Поддержка'), mental.supported ? tr('Есть') : tr('Не подключена')] as const,
    ] : [])]));
  if (life.physicalHealth.condition === 'serious') {
    section.append(button(tr('Обратиться за медицинской помощью'),
      () => commit(seekMedicalCare(life)), 'primary', 'seek-medical-care'));
  }
  if (life.ageInMonths < 18 * 12) return section;
  if (!current) {
    section.append(facts([[tr('Романтика'), tr('Пока нет')]]));
    return section;
  }
  section.append(facts([[tr(romanceLabels[current.stage]), tr(current.name)]]));
  const options = availableRomance(life);
  if (options.length) section.append(el('details', 'romance-actions', el('summary', '', tr('Романтика')),
    ...(current.stage === 'date' && !options.includes('love')
      ? [el('p', 'helper', tr('Разговор о чувствах станет доступен после двух встреч и четырёх месяцев отношений.'))] : []),
    ...options.map((step) => button(romanceActions[step], () => commit(chooseRomance(life, step)), 'quiet', `romance-${step}`))));
  return section;
}

export function play(
  life: LifeSnapshot, selected: ActionOption | null, limit: number, handlers: PlayHandlers,
): HTMLElement {
  const voice = innerVoice(life);
  const goals = goalsDialog(life, handlers.commit);
  const lifeGoals = life.goals ?? [];
  const goalButton = button(lifeGoals.length
    ? tr`Цели · ${lifeGoals.length}/3`
    : tr('Выбрать цели'), () => goals.showModal(), 'quiet', 'open-goals');
  const achievementsModal = achievementsDialog(life);
  const achievementButton = button(tr('Достижения'), () => achievementsModal.showModal(), 'quiet', 'open-achievements');
  const profile = el('section', 'profile', el('div', '',
    heading(life.birth.name),
    el('p', 'location', `${ageLabel(life.ageInMonths)} · ${countryLabel(life.countryOfResidence)}`),
    el('p', 'voice-line', tr`Желание: «${tr(voice.desire)}»`)),
  el('div', 'profile-actions', button(tr('Дневник'), handlers.diary, 'quiet', 'open-diary'),
      goalButton, achievementButton, button(tr('Меню'), handlers.home, 'quiet', 'menu')));
  const { family, startingHealth } = life.birth;
  const caregivers = {
    'two-parents': tr('Двое родителей'), 'one-parent': tr('Один родитель'), 'other-guardians': tr('Другие опекуны'),
  };
  const householdMeans = { limited: tr('Ограниченный'), moderate: tr('Средний'), high: tr('Высокий') };
  const data = facts([
    [tr('Страна рождения'), countryLabel(life.birth.countryOfBirth)],
    [tr('Достаток'), tr`${wealthLabel(life.development.funds)} · ${life.development.funds} ед.`],
    [tr('Образование'), educationLabels[life.development.education]],
    [tr('Занятость'), employmentLabels[life.development.employment]],
    ...(life.development.career ? [[tr('Карьерная траектория'), tr`${careerLabels[life.development.career]} · уровень ${life.development.careerLevel}`] as const] : []),
    ...(life.development.project ? [[tr('Большой проект'), tr`${projectLabels[life.development.project]} · уровень ${life.development.projectLevel}`] as const] : []),
  ]);
  const birth = el('details', '', el('summary', '', tr('Условия при рождении')), facts([
    [tr('Людей в доме при рождении'), family.olderSiblings + (family.caregivers === 'two-parents' ? 3 : 2)],
    [tr('Семья'), caregivers[family.caregivers]],
    [tr('Старшие братья и сёстры'), family.olderSiblings],
    [tr('Достаток семьи'), householdMeans[family.means]],
    [tr('Здоровье'), startingHealth === 'typical' ? tr('Обычное') : tr('Требовалась поддержка')],
  ]));
  const wellbeing = wellbeingPanel(life, handlers.commit);
  const indicators = el('aside', 'indicators', el('div', 'indicator-grid',
    wellbeing, ...development(life),
    indicatorPanel(tr('О герое'), 'profile', data, metric(tr('Привлекательность'), life.development.appearance), birth)),
    socialCircle(life, handlers.commit));
  indicators.setAttribute('aria-label', tr('Показатели героя'));
  indicators.tabIndex = -1;
  const recent = life.chronicle.slice(-12).reverse().find((event) => event.type === 'world');
  const spotlight = recent?.type === 'world' && life.ageInMonths - recent.ageInMonths <= 2
    ? [el('section', 'panel world-spotlight', el('p', 'world-kicker', tr`Вокруг героя · ${ageLabel(recent.ageInMonths)}`),
      el('h2', '', eventLabel(recent)), worldDetails(recent, life))]
    : [];
  const turn = controls(life, selected, handlers);
  const workspace = el('section', 'workspace stack', turn);
  workspace.setAttribute('aria-label', tr('Управление жизнью'));
  workspace.tabIndex = 0;
  const timeline = el('section', 'timeline stack', ...spotlight, chronicle(life, limit, handlers.more));
  timeline.setAttribute('aria-label', tr('Журнал жизни'));
  timeline.tabIndex = 0;
  const grid = el('div', 'dashboard-grid', workspace, timeline, indicators);
  const sections = [
    ['turns', tr('Ходы'), workspace],
    ['journal', tr('Журнал жизни'), timeline],
    ['stats', tr('Показатели'), indicators],
  ] as const;
  const tabs = el('div', 'dashboard-tabs');
  tabs.setAttribute('role', 'group');
  tabs.setAttribute('aria-label', tr('Разделы игры'));
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
  return el('div', 'dashboard', profile, el('div', 'dashboard-content', tabs, grid), goals, achievementsModal);
}
