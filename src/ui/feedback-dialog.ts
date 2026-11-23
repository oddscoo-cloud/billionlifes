import { button, el } from './elements';
import { feedbackAccessKey, sendFeedback } from './feedback-mail';
import { translate, tr } from './i18n';

export function feedbackDialog(): HTMLDialogElement {
  const accessKey = feedbackAccessKey(import.meta.env.VITE_WEB3FORMS_ACCESS_KEY);
  const title = el('h2', '', translate('feedback-title', 'Предложить или сообщить'));
  title.id = 'feedback-title';

  const category = el('select');
  category.id = 'feedback-category';
  category.append(
    new Option(translate('feedback-suggestion', 'Предложение'), 'suggestion'),
    new Option(translate('feedback-bug', 'Ошибка или баг'), 'bug'),
    new Option(translate('feedback-question', 'Вопрос'), 'question'),
    new Option(translate('feedback-other', 'Другое'), 'other'),
  );

  const name = el('input');
  name.id = 'feedback-name';
  name.autocomplete = 'name';
  name.maxLength = 80;
  name.placeholder = translate('feedback-optional', 'Необязательно');

  const contact = el('input');
  contact.id = 'feedback-contact';
  contact.type = 'email';
  contact.autocomplete = 'email';
  contact.maxLength = 120;
  contact.placeholder = translate('feedback-optional', 'Необязательно');
  contact.addEventListener('input', () => contact.setCustomValidity(''));

  const message = el('textarea');
  message.id = 'feedback-message';
  message.required = true;
  message.minLength = 10;
  message.maxLength = 3000;
  message.rows = 7;
  message.placeholder = translate('feedback-placeholder', 'Опишите предложение, шаги воспроизведения бага или возникшую проблему…');
  message.addEventListener('input', () => message.setCustomValidity(''));

  const botcheck = el('input');
  botcheck.type = 'checkbox';
  botcheck.hidden = true;
  botcheck.tabIndex = -1;
  botcheck.name = 'botcheck';

  const status = el('p', 'feedback-status');
  status.setAttribute('role', 'status');
  const cancel = button(translate('feedback-cancel', 'Отмена'), () => dialog.close(), 'quiet');
  const submit = el('button', 'primary', tr('Отправить сообщение'));
  submit.id = 'submit-feedback';
  submit.type = 'submit';

  const fields = el('fieldset', 'feedback-entry-fields',
    el('label', 'field', translate('feedback-category', 'Тип обращения'), category),
    el('div', 'feedback-fields',
      el('label', 'field', translate('feedback-name', 'Имя'), name),
      el('label', 'field', translate('feedback-contact', 'Почта для ответа'), contact)),
    el('label', 'field', translate('feedback-message', 'Сообщение'), message),
    botcheck,
    el('p', 'helper', tr('Сообщение уйдёт разработчику. Почту можно оставить, если хотите получить ответ.')));
  const form = el('form', 'feedback-form', fields, status, el('div', 'turns', cancel, submit));
  form.noValidate = true;
  fields.disabled = !accessKey;
  submit.disabled = !accessKey;
  if (!accessKey) status.textContent = tr('Отправка пока недоступна.');

  const dialog = el('dialog', 'feedback-dialog', title,
    el('p', 'lede', tr('Помогите улучшить игру: предложение, баг или заметка о том, что не работает.')), form);
  dialog.setAttribute('aria-labelledby', title.id);
  let sending = false;
  dialog.addEventListener('cancel', (event) => { if (sending) event.preventDefault(); });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    void submitFeedback();
  });

  async function submitFeedback(): Promise<void> {
    if (sending || !accessKey || botcheck.checked) return;
    const text = message.value.trim();
    if (text.length < 10 || text.length > message.maxLength) {
      message.setCustomValidity(tr('Введите сообщение длиной от 10 до 3000 символов.'));
      message.reportValidity();
      return;
    }
    if (contact.value && !contact.checkValidity()) {
      contact.setCustomValidity(tr('Введите корректный адрес электронной почты.'));
      contact.reportValidity();
      return;
    }

    sending = true;
    fields.disabled = cancel.disabled = submit.disabled = true;
    status.textContent = tr('Отправляем сообщение…');
    const result = await sendFeedback(accessKey, {
      category: category.selectedOptions[0]?.label ?? category.value,
      name: name.value.trim(),
      email: contact.value.trim(),
      message: text,
    });
    sending = false;
    fields.disabled = cancel.disabled = submit.disabled = false;
    if (result === 'sent') {
      form.reset();
      status.textContent = tr('Сообщение отправлено. Спасибо!');
    } else if (result === 'rate-limited') {
      status.textContent = tr('Слишком много запросов. Попробуйте отправить сообщение позже.');
    } else if (result === 'rejected') {
      status.textContent = tr('Сообщение не отправлено. Попробуйте ещё раз позже.');
    } else {
      status.textContent = tr('Не удалось подтвердить отправку. Текст сообщения сохранён в форме.');
    }
  }

  return dialog;
}
