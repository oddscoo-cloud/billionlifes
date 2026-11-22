import type { LifeSnapshot } from '../sim/life';
import { decodeSave, schemaVersion } from './schema';
import type { SaveRecord } from './schema';

const storeName = 'lives';
const saveKey = 'current';

export class SaveConflictError extends Error {
  constructor() {
    super('Save revision changed');
  }
}

export class SaveStore {
  constructor(private readonly database: IDBDatabase) {}

  close(): void {
    this.database.close();
  }

  read(): Promise<SaveRecord | null> {
    return this.transaction('readonly', (store, done) => {
      const request = store.get(saveKey);
      request.onsuccess = () => done(() => request.result === undefined ? null : decodeSave(request.result));
    });
  }

  write(life: LifeSnapshot, expectedRevision: number | null): Promise<SaveRecord> {
    return this.transaction('readwrite', (store, done) => {
      const request = store.get(saveKey);
      request.onsuccess = () => done(() => {
        const previous = request.result === undefined ? null : decodeSave(request.result);
        if ((previous?.revision ?? null) !== expectedRevision) throw new SaveConflictError();
        const record = decodeSave({ schemaVersion, revision: (previous?.revision ?? 0) + 1, life });
        store.put(record, saveKey);
        return record;
      });
    });
  }

  private transaction<T>(
    mode: IDBTransactionMode,
    run: (store: IDBObjectStore, done: (read: () => T) => void) => void,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const tx = this.database.transaction(storeName, mode);
      let result: T;
      let failure: unknown;
      tx.oncomplete = () => resolve(result);
      tx.onabort = () => reject(failure ?? tx.error ?? new Error('IndexedDB transaction aborted'));
      run(tx.objectStore(storeName), (read) => {
        try {
          result = read();
        } catch (error) {
          failure = error;
          tx.abort();
        }
      });
    });
  }
}

export function openSaves(factory = indexedDB, name = 'billionlifes'): Promise<SaveStore> {
  return new Promise((resolve, reject) => {
    const request = factory.open(name, 1);
    let blocked = false;
    request.onupgradeneeded = () => request.result.createObjectStore(storeName);
    request.onerror = () => reject(request.error);
    request.onblocked = () => {
      blocked = true;
      reject(new Error('IndexedDB upgrade blocked'));
    };
    request.onsuccess = () => {
      const database = request.result;
      if (blocked) {
        database.close();
        return;
      }
      database.onversionchange = () => database.close();
      resolve(new SaveStore(database));
    };
  });
}
