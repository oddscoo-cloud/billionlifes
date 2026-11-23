import { getLanguage, loadTranslations, setLanguage, tr } from './ui/i18n';

async function start(): Promise<void> {
  const language = getLanguage();
  setLanguage(language);
  await loadTranslations(language).catch(() => {
    // A failed optional locale download still leaves the base language available.
    document.documentElement.lang = 'ru';
    document.documentElement.dir = 'ltr';
  });
  const loading = document.querySelector('#app p');
  if (loading) loading.textContent = tr('Загрузка…');
  document.querySelector('meta[name="description"]')?.setAttribute(
    'content', tr('Beyond Birth — браузерный симулятор жизни.'));
  await import('./main');
}

void start();
