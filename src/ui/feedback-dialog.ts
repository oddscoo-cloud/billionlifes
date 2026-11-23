import { button, el } from './elements';
import { translate } from './i18n';

export const feedbackEmail = 'ivanmlanar16@gmail.com';

export function feedbackDialog(): HTMLDialogElement {
  const title = el('h2', '', translate('feedback-title', 'Предложить или сообщить'));
  title.id = 'feedback-title';

  const category = el('select');
  category.id = 'feedback-category';
  category.append(
    new Option(translate('feedback-suggestion', 'Предложение'), 'Предложение'),
    new Option(translate('feedback-bug', 'Ошибка или баг'), 'Ошибка'),
    new Option(translate('feedback-question', 'Вопрос'), 'Вопрос'),
    new Option(translate('feedback-other', 'Другое'), 'Другое'),
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

  const message = el('textarea');
  message.id = 'feedback-message';
  message.required = true;
  message.minLength = 10;
  message.maxLength = 3000;
  message.rows = 7;
  message.placeholder = translate('feedback-placeholder', 'Опишите предложение, шаги воспроизведения бага или возникшую проблему…');
  message.addEventListener('input', () => message.setCustomValidity(''));

  const status = el('p', 'feedback-status');
  status.setAttribute('aria-live', 'polite');

  const form = el('form', 'feedback-form',
    el('label', 'field', translate('feedback-category', 'Тип обращения'), category),
    el('div', 'feedback-fields',
      el('label', 'field', translate('feedback-name', 'Имя'), name),
      el('label', 'field', translate('feedback-contact', 'Почта для ответа'), contact)),
    el('label', 'field', translate('feedback-message', 'Сообщение'), message),
    el('p', 'helper', `${translate('feedback-hint', 'Сообщение откроется в вашем почтовом приложении и отправится вручную')} на ${feedbackEmail}. Мы не получаем данные до отправки письма.`));

  form.noValidate = true;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
  });

  const dialog = el('dialog', 'feedback-dialog',
    title,
    el('p', 'lede', 'Помогите улучшить игру: предложение, баг или заметка о том, что не работает.'),
    form,
    status,
    el('div', 'turns',
      button(translate('feedback-cancel', 'Отмена'), () => dialog.close(), 'quiet'),
      button(translate('feedback-submit', 'Открыть письмо'), submitFeedback, 'primary', 'submit-feedback'))) as HTMLDialogElement;

  function submitFeedback(): void {
    const text = message.value.trim();
    if (text.length < 10) {
      message.setCustomValidity('Опишите обращение минимум 10 символами.');
      message.reportValidity();
      return;
    }
    if (contact.value && !contact.checkValidity()) {
      contact.setCustomValidity('Введите корректный адрес электронной почты.');
      contact.reportValidity();
      return;
    }
    contact.setCustomValidity('');
    const author = name.value.trim();
    const email = contact.value.trim();
    const subject = `[Billionlifes] ${category.value}${author ? ` · ${author}` : ''}`;
    const body = [
      `Тип: ${category.value}`,
      author ? `Имя: ${author}` : '',
      email ? `Почта для ответа: ${email}` : '',
      '',
      text,
      '',
      `Страница: ${location.href}`,
      `Платформа: ${navigator.platform}`,
      `Браузер: ${navigator.userAgent}`,
    ].filter(Boolean).join('\n');
    status.textContent = 'Письмо готово. Проверьте адресата в почтовом приложении.';
    location.href = `mailto:${feedbackEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  dialog.setAttribute('aria-labelledby', title.id);
  dialog.addEventListener('cancel', () => dialog.close());
  return dialog;
}

