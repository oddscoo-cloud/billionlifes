import { birthShare, demographics, sexes } from '../data/demographics';
import type { Sex } from '../data/demographics';
import type { LifeSnapshot } from '../sim/life';
import { parentLabels } from '../sim/family';
import { button, el, facts, heading } from './elements';
import { ageLabel, wealthLabel } from './labels';

function intro(...content: Node[]): HTMLElement {
  return el('section', 'intro', el('div', 'intro-copy', ...content), el('div', 'intro-art'));
}

function randomnessGuide(): HTMLDialogElement {
  const title = el('h2', '', 'Как устроена случайность');
  title.id = 'randomness-guide-title';
  const dialog = el('dialog', 'randomness-guide',
    title,
    el('p', 'helper', 'Игра сочетает реальные демографические данные с детерминированным случайным генератором. Решения меняют вероятности, но не устраняют случайность полностью.'),
    el('div', 'odds-grid',
      el('article', 'odds-card',
        el('strong', '', 'Начало жизни'),
        el('p', '', 'Страна выбирается по доле рождений среди 193 стран. Семья и достаток выпадают независимо от имени.'),
        el('dl', 'odds-facts',
          el('div', '', el('dt', '', 'Двое опекунов'), el('dd', '', '~72%')),
          el('div', '', el('dt', '', 'Обычный достаток'), el('dd', '', '~65%')),
          el('div', '', el('dt', '', 'Нужна поддержка со здоровьем'), el('dd', '', '~10%')))),
      el('article', 'odds-card',
        el('strong', '', 'Смертность'),
        el('p', '', 'Ежемесячный риск берётся из таблиц ООН для страны, пола и возраста. В дальнейшие годы решение мало изменить этот базовый риск прямыми действиями.'),
        el('dl', 'odds-facts',
          el('div', '', el('dt', '', 'Умереть до 5 лет'), el('dd', '', '~3.7%')),
          el('div', '', el('dt', '', 'Умереть до 18 лет'), el('dd', '', '~5%')),
          el('div', '', el('dt', '', 'Дожить до 65 лет'), el('dd', '', '~72.7%')))),
      el('article', 'odds-card',
        el('strong', '', 'Серьёзное здоровье'),
        el('p', '', 'Без обращения риск смертности у героя с тяжёлым состоянием начинается с ×2.5. Каждый полный год без помощи увеличивает множитель на 0.5, максимум — ×5.5.'),
        el('p', 'helper', 'Восстановление и медицинская помощь могут вернуть состояние к поддерживаемому лечению.')),
      el('article', 'odds-card',
        el('strong', '', 'Психическое состояние'),
        el('p', '', 'Тревога появляется после накопленного стресса и слабой поддержки. Потери, перегрузка, одиночество и повторяющиеся трудные события увеличивают накопленный стресс.'),
        el('p', 'helper', 'Помощь близких, обращение за профессиональной поддержкой и снижение нагрузки могут ускорить восстановление.')),
      el('article', 'odds-card',
        el('strong', '', 'Решения и навыки'),
        el('p', '', 'Учёба, общение и практика ежемесячно развивают навыки по выбранному плану. Трудные решения дают черты с конкретными бонусами к поступлению, работе и будущим шансам.'),
        el('p', 'helper', 'План изменяет жизнь, но не гарантирует успех действия.')),
      el('article', 'odds-card',
        el('strong', '', 'Обычные и редкие события'),
        el('p', '', 'Редкие встречи и воспоминания имеют шанс около 0.15% за подходящий месяц. Большинство обычных событий выбираются по возрасту, плану, окружению и недавней хронике.'),
        el('p', 'helper', 'Повторные события блокируются на несколько месяцев, чтобы жизнь не превращалась в бесконечный повтор.'))),
    el('section', 'odds-source',
      el('h3', '', 'Источники и границы модели'),
      el('p', '', `Демографическая база — UN World Population Prospects 2024, snapshot ${demographics.version}, базовый год ${demographics.year}. Это статистическая модель, а не медицинский или официальный прогноз конкретного человека.`),
      el('p', '', 'Одни и те же имя и seed создают одинаковую последовательность случайных бросков. Новая жизнь с другим seed получает другой набор событий, хотя шансы остаются такими же.')),
    el('div', 'turns', button('Закрыть', () => dialog.close(), 'quiet'))) as HTMLDialogElement;
  dialog.setAttribute('aria-labelledby', title.id);
  dialog.addEventListener('cancel', () => dialog.close());
  return dialog;
}

export function startScreen(
  life: LifeSnapshot | null, resume: () => void, birth: () => void,
): HTMLElement {
  const title = heading('Целая жизнь впереди');
  const actions = el('div', 'turns');
  if (life) actions.append(button(life.status.type === 'dead' ? 'Открыть итог жизни' : 'Продолжить жизнь',
    resume, 'primary', 'resume'));
  actions.append(button('Новая жизнь', birth, life ? 'quiet' : 'primary', 'new-life'));
  const guide = randomnessGuide();
  actions.append(button('Как работают шансы', () => guide.showModal(), 'quiet', 'open-randomness-guide'));
  if (life) {
    const hint = el('p', 'helper', 'Новая жизнь откроет анкету. Чтобы заменить сохранение, нужно подтвердить замену.');
    const saved = el('p', 'saved', `Сохранено · ${life.birth.name} · ${ageLabel(life.ageInMonths)}`);
    return el('div', 'start-screen', intro(title, saved, actions, hint), guide);
  }
  return el('div', 'start-screen', intro(title,
    el('p', 'lede', 'Создайте героя, проживайте месяцы или годы и принимайте решения по мере взросления. Игра сохраняет каждый ход.'),
    actions), guide);
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
  sex.append(new Option('Женский', sexes[0]), new Option('Мужской', sexes[1]));
  const submit = el('button', 'primary', 'Показать стартовые условия');
  submit.type = 'submit';
  const form = el('form', 'birth-form',
    el('label', 'field', 'Имя героя', name), el('label', 'field', 'Пол', sex));
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
      `Заменить сохранённую жизнь героя «${life.birth.name}»`));
  }
  form.append(el('div', 'turns', button('Назад', cancel, 'quiet', 'back'), submit));
  const title = el('h2', '', 'Стартовые условия');
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
      `${parentLabels[parent.role]} · ${ageLabel(parent.ageAtBirth)}`).join(', ') : 'Другие опекуны';
    info.replaceChildren(facts([
      ['Герой', birth.name],
      ['Страна рождения', demographics.countries[birth.countryOfBirth].name],
      ['Шанс выпадения страны', `${(birthShare(birth.countryOfBirth) * 100).toLocaleString('ru-RU', {
        minimumFractionDigits: 2, maximumFractionDigits: 2,
      })}% по доле рождений`],
      ['Людей в семье', adults + family.olderSiblings + 1],
      ['Взрослые в семье', adultsDescription],
      ['Старшие братья и сёстры', family.olderSiblings],
      ['Достаток', wealthLabel(development.funds)],
      ['Стартовое здоровье', birth.startingHealth === 'typical' ? 'Обычное' : 'Требуется поддержка'],
    ]));
  }
  const back = button('К анкете', () => dialog.close(), 'quiet');
  back.autofocus = true;
  dialog.append(el('p', 'helper', 'Шанс страны рассчитан по доле рождений в статистике ООН за базовый 2023 год. При перебросе имя и пол сохранятся.'),
    el('div', 'turns', back, button('Перебросить', roll, 'quiet'),
      button('Начать жизнь', () => { dialog.close(); start(draft); }, 'primary')));
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!name.value.trim()) {
      name.setCustomValidity('Введите имя героя.');
      name.reportValidity();
      return;
    }
    if (replaceConfirmation && !replaceConfirmation.checked) {
      replaceConfirmation.setCustomValidity('Подтвердите замену сохранённой жизни.');
      replaceConfirmation.reportValidity();
      return;
    }
    roll();
    dialog.showModal();
  });
  return intro(heading('Начало жизни'),
    el('p', 'lede', `Страна рождения выпадет среди 193 стран по данным ООН за ${demographics.year} год. Семью и стартовые условия можно будет посмотреть и перебросить.`), form, dialog);
}
