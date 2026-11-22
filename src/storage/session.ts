import type { LifeSnapshot } from '../sim/life';
import type { SaveRecord } from './schema';
import type { SaveStore } from './saves';

/** The UI reads only the last committed session. */
export class LifeSession {
  private committed: SaveRecord | null = null;

  constructor(private readonly store: SaveStore) {}

  get current(): SaveRecord | null {
    return this.committed;
  }

  async reload(): Promise<void> {
    this.committed = await this.store.read();
  }

  async commit(next: LifeSnapshot): Promise<void> {
    if (next === this.committed?.life) return;
    this.committed = await this.store.write(next, this.committed?.revision ?? null);
  }
}
