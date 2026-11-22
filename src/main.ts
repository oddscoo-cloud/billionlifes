import { createLife } from './sim/birth';
import type { ActionOption } from './sim/actions';
import type { LifeSnapshot } from './sim/life';
import { startLife } from './sim/life';
import { InvalidSaveError } from './storage/schema';
import { openSaves, SaveConflictError } from './storage/saves';
import { LifeSession } from './storage/session';
import { button, el, panel } from './ui/elements';
import { play } from './ui/play';
import { birthScreen, startScreen } from './ui/start';
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
  let screen: 'home' | 'birth' | 'play' = 'home';
  let selected: ActionOption | null = null;
  let previewButton = '';
  let limit = 50;
  let busy = false;

  function setScreen(next: typeof screen, focus = 'screen-title'): void {
    if (busy) return;
    screen = next;
    selected = null;
    limit = 50;
    notice.replaceChildren();
    render(focus);
  }

  function preview(option: ActionOption | null): void {
    if (busy) return;
    if (option) previewButton = document.activeElement?.id ?? '';
    selected = option;
    render(option ? 'action-preview' : previewButton);
  }

  async function commit(next: LifeSnapshot): Promise<void> {
    if (busy) return;
    const previous = session.current?.life;
    const previousFocus = document.activeElement?.id ?? '';
    busy = true;
    app.inert = true;
    notice.replaceChildren('Сохранение…');
    try {
      await session.commit(next);
      selected = null;
      screen = 'play';
      notice.replaceChildren('Сохранено');
      const focus = previous?.status.type === 'active' && next.status.type === 'active' ? previousFocus : '';
      app.inert = false;
      render(focus || 'screen-title');
    } catch (error) {
      const plan = app.querySelector<HTMLSelectElement>('#life-plan');
      if (plan) plan.value = previous?.development.plan ?? '';
      if (error instanceof SaveConflictError) {
        const reload = button('Загрузить актуальную жизнь', () => location.reload(), 'quiet');
        notice.replaceChildren('Другая вкладка обновила сохранение. ', reload);
        reload.focus();
      } else {
        const retry = button('Повторить запись', () => void commit(next), 'quiet');
        notice.replaceChildren('Не удалось сохранить ход. Текущая жизнь сохранена в прежнем состоянии. ', retry);
        retry.focus();
      }
    } finally {
      busy = false;
      app.inert = false;
    }
  }

  function render(focus?: string): void {
    const life = session.current?.life ?? null;
    if (screen === 'birth') {
      app.replaceChildren(birthScreen(life, () => setScreen('home'), (name, sex) => {
        const seed = crypto.getRandomValues(new Uint32Array(1))[0]!;
        void commit(startLife(createLife({ name, sex, seed })));
      }));
    } else if (screen === 'play' && life) {
      app.replaceChildren(play(life, selected, limit, {
        commit: (next) => void commit(next), preview,
        home: () => setScreen('home'),
        more: () => { limit += 50; render('older-events'); },
      }));
    } else {
      app.replaceChildren(startScreen(life, () => setScreen('play'), () => setScreen('birth', 'birth-name')));
    }
    if (focus) (document.getElementById(focus) ?? document.getElementById('screen-title'))?.focus();
  }

  render();
}

void initialize();
