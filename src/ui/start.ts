import { birthShare, demographics, sexes } from '../data/demographics';
import type { Sex } from '../data/demographics';
import type { LifeSnapshot } from '../sim/life';
import { parentLabels } from '../sim/family';
import { button, el, facts, heading } from './elements';
import { ageLabel, countryLabel, wealthLabel } from './labels';
import { getLanguage, translate, tr } from './i18n';

function intro(...content: Node[]): HTMLElement {
  return el('section', 'intro', el('div', 'intro-copy', ...content), el('div', 'intro-art'));
}

function randomnessGuide(): HTMLDialogElement {
  const title = el('h2', '', tr('Как устроена случайность'));
  title.id = 'randomness-guide-title';
  const dialog = el('dialog', 'randomness-guide',
    title,
    el('p', 'helper', tr('Игра сочетает реальные демографические данные с детерминированным случайным генератором. Решения меняют вероятности, но не устраняют случайность полностью.')),
    el('div', 'odds-grid',
      el('article', 'odds-card',
        el('strong', '', tr('Начало жизни')),
        el('p', '', tr('Страна выбирается по доле рождений среди 193 стран. Семья и достаток выпадают независимо от имени.')),
        el('dl', 'odds-facts',
          el('div', '', el('dt', '', tr('Двое опекунов')), el('dd', '', '~72%')),
          el('div', '', el('dt', '', tr('Обычный достаток')), el('dd', '', '~65%')),
          el('div', '', el('dt', '', tr('Нужна поддержка со здоровьем')), el('dd', '', '~10%')))),
      el('article', 'odds-card',
        el('strong', '', tr('Смертность')),
        el('p', '', tr('Ежемесячный риск берётся из таблиц ООН для страны, пола и возраста. В дальнейшие годы решение мало изменить этот базовый риск прямыми действиями.')),
        el('dl', 'odds-facts',
          el('div', '', el('dt', '', tr('Умереть до 5 лет')), el('dd', '', '~3.7%')),
          el('div', '', el('dt', '', tr('Умереть до 18 лет')), el('dd', '', '~5%')),
          el('div', '', el('dt', '', tr('Дожить до 65 лет')), el('dd', '', '~72.7%')))),
      el('article', 'odds-card',
        el('strong', '', tr('Серьёзное здоровье')),
        el('p', '', tr('Без обращения риск смертности у героя с тяжёлым состоянием начинается с ×2.5. Каждый полный год без помощи увеличивает множитель на 0.5, максимум — ×5.5.')),
        el('p', 'helper', tr('Восстановление и медицинская помощь могут вернуть состояние к поддерживаемому лечению.'))),
      el('article', 'odds-card',
        el('strong', '', tr('Психическое состояние')),
        el('p', '', tr('Тревога появляется после накопленного стресса и слабой поддержки. Потери, перегрузка, одиночество и повторяющиеся трудные события увеличивают накопленный стресс.')),
        el('p', 'helper', tr('Помощь близких, обращение за профессиональной поддержкой и снижение нагрузки могут ускорить восстановление.'))),
      el('article', 'odds-card',
        el('strong', '', tr('Решения и навыки')),
        el('p', '', tr('Учёба, общение и практика ежемесячно развивают навыки по выбранному плану. Трудные решения дают черты с конкретными бонусами к поступлению, работе и будущим шансам.')),
        el('p', 'helper', tr('План изменяет жизнь, но не гарантирует успех действия.'))),
      el('article', 'odds-card',
        el('strong', '', tr('Обычные и редкие события')),
        el('p', '', tr('Редкие встречи и воспоминания имеют шанс около 0.15% за подходящий месяц. Большинство обычных событий выбираются по возрасту, плану, окружению и недавней хронике.')),
        el('p', 'helper', tr('Повторные события блокируются на несколько месяцев, чтобы жизнь не превращалась в бесконечный повтор.')))),
    el('section', 'odds-source',
      el('h3', '', tr('Источники и границы модели')),
      el('p', '', tr`Демографическая база — UN World Population Prospects 2024, snapshot ${demographics.version}, базовый год ${demographics.year}. Это статистическая модель, а не медицинский или официальный прогноз конкретного человека.`),
      el('p', '', tr('Одни и те же имя и seed создают одинаковую последовательность случайных бросков. Новая жизнь с другим seed получает другой набор событий, хотя шансы остаются такими же.'))),
    el('div', 'turns', button(tr('Закрыть'), () => dialog.close(), 'quiet'))) as HTMLDialogElement;
  dialog.setAttribute('aria-labelledby', title.id);
  dialog.addEventListener('cancel', () => dialog.close());
  return dialog;
}

export function startScreen(
  life: LifeSnapshot | null, resume: () => void, birth: () => void,
): HTMLElement {
  const title = heading(translate('home-title', 'Целая жизнь впереди'));
  const guide = randomnessGuide();
  const guideAction = button(translate('odds', 'Как работают шансы'), () => guide.showModal(), 'guide-entry', 'open-randomness-guide');

  const story = el('section', 'home-story',
    el('p', 'eyebrow', life ? translate('home-eyebrow', 'Сохранённая история') : translate('home-eyebrow-new', 'Новая история')),
    title,
    el('p', 'lede', life
      ? translate('home-lede-saved', 'Каждый выбор оставляет след. Вернитесь к жизни героя или начните другую историю с чистого листа.')
      : translate('home-lede', 'Создайте героя, проживайте месяцы или годы и принимайте решения по мере взросления. Игра сохраняет каждый ход.')));

  const status = life
    ? el('div', 'saved-life',
      el('p', 'saved-life-label', translate('home-eyebrow', 'Сохранённая жизнь')),
      el('p', 'saved-life-name', life.birth.name),
      el('p', 'saved-life-meta', `${ageLabel(life.ageInMonths)} · ${life.status.type === 'dead' ? tr('Жизнь завершена') : tr('История продолжается')}`))
    : el('div', 'saved-life saved-life-empty',
      el('p', 'saved-life-label', translate('home-eyebrow', 'Сохранённая жизнь')),
        el('p', 'saved-life-name', translate('saved-none', 'Пока нет')),
      el('p', 'saved-life-meta', tr('Запустите первую жизнь')));

  const actions = el('div', 'home-actions-list');
  if (life) actions.append(button(life.status.type === 'dead'
    ? translate('open-summary', 'Открыть итог жизни') : translate('continue', 'Продолжить'),
    resume, 'primary', 'resume'));
  actions.append(button(translate('new-life', 'Новая жизнь'), birth, life ? 'secondary' : 'primary', 'new-life'));

  const actionCard = el('aside', 'home-action-card',
    el('p', 'home-card-kicker', tr('Продолжение')),
    status,
    actions,
    el('div', 'odds-guide', el('span', '', tr('Случайность')), guideAction));

  if (life) {
    const hint = el('p', 'helper', tr('Новая жизнь откроет анкету. Чтобы заменить сохранение, нужно подтвердить замену.'));
    actionCard.append(hint);
  }
  const dashboard = el('section', 'home-dashboard', story, actionCard);
  return el('div', 'start-screen', dashboard, guide);
}

export function birthScreen(
  life: LifeSnapshot | null, cancel: () => void,
  generate: (name: string, sex: Sex) => LifeSnapshot, start: (life: LifeSnapshot) => void,
): HTMLElement {
  const name = el('input');
  name.id = 'birth-name';
  name.name = 'name';
  name.required = true;
  name.maxLength = 60;
  name.autocomplete = 'off';
  name.addEventListener('input', () => name.setCustomValidity(''));
  const sex = el('select');
  sex.name = 'sex';
  sex.append(new Option(tr('Женский'), sexes[0]), new Option(tr('Мужской'), sexes[1]));
  const submit = el('button', 'primary', tr('Показать стартовые условия'));
  submit.type = 'submit';
  const form = el('form', 'birth-form',
    el('label', 'field', tr('Имя героя'), name), el('label', 'field', tr('Пол'), sex));
  form.noValidate = true;
  let replaceConfirmation: HTMLInputElement | null = null;
  if (life) {
    const confirmation = el('input');
    confirmation.type = 'checkbox';
    confirmation.required = true;
    confirmation.id = 'replace-confirmation';
    confirmation.addEventListener('change', () => confirmation.setCustomValidity(''));
    replaceConfirmation = confirmation;
    form.append(el('label', 'confirm', confirmation,
      tr`Заменить сохранённую жизнь героя «${life.birth.name}»`));
  }
  form.append(el('div', 'turns', button(tr('Назад'), cancel, 'quiet', 'back'), submit));
  const title = el('h2', '', tr('Стартовые условия'));
  title.id = 'birth-preview-title';
  const info = el('div', 'birth-preview-info');
  info.setAttribute('aria-live', 'polite');
  const dialog = el('dialog', 'birth-preview', title, info);
  dialog.setAttribute('aria-labelledby', title.id);
  dialog.addEventListener('cancel', () => dialog.close());
  let draft: LifeSnapshot;
  function roll(): void {
    draft = generate(name.value, sex.value as Sex);
    const { birth, parents, development } = draft;
    const family = birth.family;
    const adults = family.caregivers === 'two-parents' ? 2 : 1;
    const adultsDescription = parents.length ? parents.map((parent) =>
      `${tr(parentLabels[parent.role])} · ${ageLabel(parent.ageAtBirth)}`).join(', ') : tr('Другие опекуны');
    info.replaceChildren(facts([
      [tr('Герой'), birth.name],
      [tr('Страна рождения'), countryLabel(birth.countryOfBirth)],
      [tr('Шанс выпадения страны'), new Intl.NumberFormat(getLanguage(), {
        style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2,
      }).format(birthShare(birth.countryOfBirth))],
      [tr('Людей в семье'), adults + family.olderSiblings + 1],
      [tr('Взрослые в семье'), adultsDescription],
      [tr('Старшие братья и сёстры'), family.olderSiblings],
      [tr('Достаток'), wealthLabel(development.funds)],
      [tr('Стартовое здоровье'), birth.startingHealth === 'typical' ? tr('Обычное') : tr('Требуется поддержка')],
    ]));
  }
  const back = button(tr('К анкете'), () => dialog.close(), 'quiet');
  back.autofocus = true;
  dialog.append(el('p', 'helper', tr('Шанс страны рассчитан по доле рождений в статистике ООН за базовый 2023 год. При перебросе имя и пол сохранятся.')),
    el('div', 'turns', back, button(tr('Перебросить'), roll, 'quiet'),
      button(tr('Начать жизнь'), () => { dialog.close(); start(draft); }, 'primary')));
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!name.value.trim()) {
      name.setCustomValidity(tr('Введите имя героя.'));
      name.reportValidity();
      return;
    }
    if (replaceConfirmation && !replaceConfirmation.checked) {
      replaceConfirmation.setCustomValidity(tr('Подтвердите замену сохранённой жизни.'));
      replaceConfirmation.reportValidity();
      return;
    }
    roll();
    dialog.showModal();
  });
  return intro(heading(tr('Начало жизни')),
    el('p', 'lede', tr`Страна рождения выпадет среди 193 стран по данным ООН за ${demographics.year} год. Семью и стартовые условия можно будет посмотреть и перебросить.`), form, dialog);
}
