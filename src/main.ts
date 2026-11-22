import { readAutoplayDelay, writeAutoplayDelay } from './ui/autoplay-delay';
import type { AutoplayDelay } from './ui/autoplay-delay';
import { addDiaryEntry } from './sim/diary';
import { diary } from './ui/journal';
import { createLife } from './sim/birth';
import type { ActionOption } from './sim/actions';
import type { LifeSnapshot } from './sim/life';
import { advanceAuto, startLife } from './sim/life';
import { InvalidSaveError } from './storage/schema';
import { openSaves, SaveConflictError } from './storage/saves';
import { LifeSession } from './storage/session';
import { button, el, panel } from './ui/elements';
import { turnFeedback } from './ui/feedback';
import { play } from './ui/play';
import { birthScreen, startScreen } from './ui/start';
import { summary } from './ui/summary';
import './ui/styles.css';

const app = document.querySelector<HTMLElement>('#app')!;
const notice = el('div', 'notice');
notice.setAttribute('role', 'status');
app.before(notice);

async function initialize(): Promise<void> {
  try {
    const store = await openSaves();
    const session = new LifeSession(store);
    await session.reload();
    mount(session);
  } catch (error) {
    const damaged = error instanceof InvalidSaveError;
    const description = damaged ? {
      corrupt: 'Сохранение повреждено.',
      version: 'Эта версия игры не может открыть сохранение. Попробуйте версию игры, создавшую его.',
      data: 'Сохранение использует другой набор демографических данных.',
    }[error.reason] : 'Хранилище браузера недоступно. Проверьте настройки браузера и повторите попытку.';
    const actions = el('div', 'turns', button('Повторить загрузку', () => location.reload(), 'primary'));
    if (damaged) actions.append(button('Скачать копию сохранения', () => {
      const seen = new WeakSet<object>();
      const json = JSON.stringify(error.raw, (_key, value: unknown) => {
        if (typeof value === 'bigint') return String(value);
        if (value && typeof value === 'object') {
          if (seen.has(value)) return '[Повторная ссылка]';
          seen.add(value);
        }
        return value;
      }, 2);
      const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      const link = el('a');
      link.href = url;
      link.download = 'billionlifes-save.json';
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, 'quiet'));
    app.replaceChildren(panel('Загрузка жизни', el('p', '', description), actions));
  }
}

function mount(session: LifeSession): void {
  let screen: 'home' | 'birth' | 'play' | 'diary' = 'home';
  let selected: ActionOption | null = null;
  let previewButton = '';
  let limit = 50;
  let busy = false;
  let autoplay = false;
  let autoplayDelay = readAutoplayDelay();
  let timer: number | undefined;

  function stopAutoplay(): void {
    autoplay = false;
    window.clearTimeout(timer);
  }

  function scheduleAutoplay(): void {
    window.clearTimeout(timer);
    if (!autoplay) return;
    timer = window.setTimeout(() => {
      const life = session.current?.life;
      if (autoplay && screen === 'play' && life?.status.type === 'active') {
        void commit(advanceAuto(life), 'play', true);
      }
    }, autoplayDelay * 1000);
  }

  function changeAutoplayDelay(delay: AutoplayDelay): void {
    autoplayDelay = delay;
    writeAutoplayDelay(delay);
    scheduleAutoplay();
  }

  function toggleAutoplay(): void {
    if (busy || session.current?.life.status.type !== 'active') return;
    if (autoplay) stopAutoplay();
    else { autoplay = true; scheduleAutoplay(); }
    render('autoplay');
  }

  function setScreen(next: typeof screen, focus = 'screen-title'): void {
    if (busy) return;
    stopAutoplay();
    screen = next;
    selected = null;
    limit = 50;
    notice.replaceChildren();
    render(focus);
  }

  function preview(option: ActionOption | null): void {
    if (busy) return;
    stopAutoplay();
    if (option) previewButton = document.activeElement?.id ?? '';
    selected = option;
    render(option ? 'action-preview' : previewButton);
  }

  async function commit(next: LifeSnapshot, destination: 'play' | 'diary' = 'play', automatic = false): Promise<void> {
    if (busy) return;
    if (!automatic) stopAutoplay();
    const previous = session.current?.life;
    if (next === previous) return;
    const previousFocus = document.activeElement?.id ?? '';
    busy = true;
    app.inert = true;
    notice.classList.remove('result');
    notice.replaceChildren('Сохранение…');
    try {
      await session.commit(next);
      selected = null;
      screen = destination;
      if (next.status.type !== 'active') stopAutoplay();
      const result = el('p', 'turn-result', destination === 'diary' ? 'Запись добавлена в дневник.' : turnFeedback(previous, next));
      notice.replaceChildren(result);
      notice.classList.add('result');
      const focus = destination === 'diary' ? 'diary-text' : next.status.type === 'decision' ? 'turn-title'
        : previous?.status.type === 'active' && next.status.type === 'active' ? previousFocus : '';
      app.inert = false;
      render(focus === 'apply-plan' ? 'life-plan' : focus || (autoplay ? undefined : 'screen-title'), autoplay);
      scheduleAutoplay();
    } catch (error) {
      stopAutoplay();
      const autoButton = document.getElementById('autoplay');
      if (autoButton) autoButton.textContent = 'Включить автоход';
      if (error instanceof SaveConflictError) {
        const reload = button('Загрузить актуальную жизнь', () => location.reload(), 'quiet');
        notice.replaceChildren('Другая вкладка обновила сохранение. ', reload);
        reload.focus();
      } else {
        const retry = button('Повторить запись', () => void commit(next, destination), 'quiet');
        notice.replaceChildren('Не удалось сохранить ход. Текущая жизнь сохранена в прежнем состоянии. ', retry);
        retry.focus();
      }
    } finally {
      busy = false;
      app.inert = false;
    }
  }

  function render(focus?: string, quiet = false): void {
    const life = session.current?.life ?? null;
    if (screen === 'birth') {
      app.replaceChildren(birthScreen(life, () => setScreen('home'), (name, sex) => {
        const seed = crypto.getRandomValues(new Uint32Array(1))[0]!;
        void commit(startLife(createLife({ name, sex, seed })));
      }));
    } else if (screen === 'diary' && life) {
      app.replaceChildren(diary(life, () => setScreen('play', 'open-diary'),
        (text) => void commit(addDiaryEntry(life, text), 'diary')));
    } else if (screen === 'play' && life) {
      const stats = quiet && app.querySelector('.show-indicators') !== null;
      const panels = ['.workspace', '.timeline', '.indicators'];
      const scroll = quiet ? panels.map((selector) => app.querySelector(selector)?.scrollTop ?? 0) : [];
      const expanded = quiet && app.querySelector('.social-details[open]') !== null;
      const home = () => setScreen('home');
      const more = () => { limit += 50; render('older-events'); };
      const openDiary = () => setScreen('diary');
      app.replaceChildren(life.status.type === 'dead' ? summary(life, limit, { home, more, openDiary })
        : play(life, selected, limit, {
          commit: (next) => void commit(next), preview, home, more, diary: openDiary, auto: autoplay, toggleAuto: toggleAutoplay,
          delay: autoplayDelay, changeDelay: changeAutoplayDelay,
        }));
      if (stats) app.querySelector<HTMLButtonElement>('#stats-tab')?.click();
      if (expanded) app.querySelector('.social-details')?.setAttribute('open', '');
      for (const [index, top] of scroll.entries()) app.querySelector(panels[index]!)?.scrollTo(0, top);
    } else {
      app.replaceChildren(startScreen(life, () => setScreen('play'), () => setScreen('birth', 'birth-name')));
    }
    if (focus) (document.getElementById(focus) ?? document.getElementById('screen-title'))?.focus({ preventScroll: quiet });
  }

  render();
}

void initialize();
