import { demographics, sexes } from '../data/demographics';
import type { Sex } from '../data/demographics';
import type { LifeSnapshot } from '../sim/life';
import { button, el, heading } from './elements';
import { ageLabel } from './labels';

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
  life: LifeSnapshot | null, cancel: () => void, start: (name: string, sex: Sex) => void,
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
  const submit = el('button', 'primary', 'Начать жизнь');
  submit.type = 'submit';
  const form = el('form', 'birth-form',
    el('label', 'field', 'Имя героя', name), el('label', 'field', 'Пол', sex));
  if (life) {
    const confirmation = el('input');
    confirmation.type = 'checkbox';
    confirmation.required = true;
    form.append(el('label', 'confirm', confirmation,
      `Заменить сохранённую жизнь героя «${life.birth.name}»`));
  }
  form.append(el('div', 'turns', button('Назад', cancel, 'quiet', 'back'), submit));
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!name.value.trim()) {
      name.setCustomValidity('Введите имя героя.');
      name.reportValidity();
      return;
    }
    start(name.value, sex.value as Sex);
  });
  return intro(heading('Начало жизни'),
    el('p', 'lede', `Страна рождения выпадет среди шести стран по данным ООН за ${demographics.year} год. Семья и стартовые условия определяются отдельно.`), form);
}
