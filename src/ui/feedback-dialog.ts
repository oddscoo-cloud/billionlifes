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
  let preparedSubject = '';
  let preparedBody = '';

  const form = el('form', 'feedback-form',
    el('label', 'field', translate('feedback-category', 'Тип обращения'), category),
    el('div', 'feedback-fields',
      el('label', 'field', translate('feedback-name', 'Имя'), name),
      el('label', 'field', translate('feedback-contact', 'Почта для ответа'), contact)),
    el('label', 'field', translate('feedback-message', 'Сообщение'), message),
    el('p', 'helper', `${translate('feedback-hint', 'Мы сформируем письмо в вашем почтовом приложении')} для ${feedbackEmail}. Письмо не отправляется автоматически: откройте приложение и нажмите «Отправить».`));

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
      button('Скопировать текст', copyPreparedFeedback, 'quiet', 'copy-feedback'),
      button(translate('feedback-submit', 'Открыть письмо'), submitFeedback, 'primary', 'submit-feedback'))) as HTMLDialogElement;

  async function copyPreparedFeedback(): Promise<void> {
    const text = message.value.trim();
    if (text.length < 10) {
      message.setCustomValidity('Опишите обращение минимум 10 символами.');
      message.reportValidity();
      return;
    }
    preparedSubject = `[Billionlifes] ${category.value}${name.value.trim() ? ` · ${name.value.trim()}` : ''}`;
    preparedBody = [
      `Тип: ${category.value}`,
      name.value.trim() ? `Имя: ${name.value.trim()}` : '',
      contact.value.trim() ? `Почта для ответа: ${contact.value.trim()}` : '',
      '',
      text,
      '',
      `Страница: ${location.href}`,
      `Платформа: ${navigator.platform}`,
    ].filter(Boolean).join('\n');
    try {
      await navigator.clipboard.writeText(`Кому: ${feedbackEmail}\nТема: ${preparedSubject}\n\n${preparedBody}`);
      status.textContent = 'Адрес, тема и текст скопированы. Вставьте их в любое почтовое приложение.';
    } catch {
      status.textContent = `Скопируйте вручную. Адрес: ${feedbackEmail}`;
    }
  }

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
    status.textContent = 'Почтовое приложение открыто для черновика. Нажмите «Отправить» в приложении; если окна не появилось, используйте «Скопировать текст».';
    location.href = `mailto:${feedbackEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  dialog.setAttribute('aria-labelledby', title.id);
  dialog.addEventListener('cancel', () => dialog.close());
  return dialog;
}

