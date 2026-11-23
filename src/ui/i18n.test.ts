import { afterEach, expect, it } from 'vitest';
import { languages, loadTranslations, tr } from './i18n';

const catalogs = import.meta.glob<Record<string, string>>('./locales/*.json', {
  eager: true, import: 'default',
});
const slots = (text: string) => [...text.matchAll(/\{(\d+)\}/g)].map((match) => match[1]).sort();

afterEach(() => loadTranslations('ru'));

it('provides the same messages and template slots in every translated locale', () => {
  const english = catalogs['./locales/en.json']!;
  const messages = Object.keys(english).sort();
  for (const [code] of languages) {
    if (code === 'ru') continue;
    const catalog = catalogs[`./locales/${code}.json`]!;
    expect(Object.keys(catalog).sort()).toEqual(messages);
    const broken = messages.filter((key) =>
      !catalog[key]?.trim() || slots(catalog[key]!).join() !== slots(key).join());
    expect(broken, code).toEqual([]);
  }
});

it('translates templates while preserving user-entered text verbatim', async () => {
  await loadTranslations('en');
  const name = 'Мария {1}';
  expect(tr('Задержка автохода')).toBe('Autoplay delay');
  expect(tr`Заменить сохранённую жизнь героя «${name}»`).toContain(name);
  await loadTranslations('ru');
  expect(tr('Задержка автохода')).toBe('Задержка автохода');
});
