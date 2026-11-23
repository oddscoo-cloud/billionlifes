import { birthShare, demographics, sexes } from '../data/demographics';
import type { Sex } from '../data/demographics';
import type { LifeSnapshot } from '../sim/life';
import { parentLabels } from '../sim/family';
import { button, el, facts, heading } from './elements';
import { ageLabel, wealthLabel } from './labels';

function intro(...content: Node[]): HTMLElement {
  return el('section', 'intro', el('div', 'intro-copy', ...content), el('div', 'intro-art'));
}

export function startScreen(
  life: LifeSnapshot | null, resume: () => void, birth: () => void,
): HTMLElement {
  const title = heading('Целая жизнь впереди');
  const actions = el('div', 'turns');
  if (life) actions.append(button(life.status.type === 'dead' ? 'Открыть итог жизни' : 'Продолжить жизнь',
    resume, 'primary', 'resume'));
  actions.append(button('Новая жизнь', birth, life ? 'quiet' : 'primary', 'new-life'));
  if (life) {
    const hint = el('p', 'helper', 'Новая жизнь откроет анкету. Чтобы заменить сохранение, нужно подтвердить замену.');
    const saved = el('p', 'saved', `Сохранено · ${life.birth.name} · ${ageLabel(life.ageInMonths)}`);
    return intro(title, saved, actions, hint);
  }
  return intro(title,
    el('p', 'lede', 'Создайте героя, проживайте месяцы или годы и принимайте решения по мере взросления. Игра сохраняет каждый ход.'),
    actions);
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
