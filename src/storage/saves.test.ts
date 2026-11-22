import { IDBFactory, IDBObjectStore } from 'fake-indexeddb';
import { expect, it, vi } from 'vitest';
import { resolveAction } from '../sim/actions';
import { createLife } from '../sim/birth';
import { advanceMonth, startLife } from '../sim/life';
import { drawRandom } from '../sim/random';
import { decodeSave, InvalidSaveError } from './schema';
import { openSaves, SaveConflictError } from './saves';
import { LifeSession } from './session';

const newborn = () => startLife(createLife({ name: 'Саша', sex: 'female', seed: 42 }));

it('restores a pending decision, the committed result and the exact next random draw', async () => {
  const factory = new IDBFactory();
  const store = await openSaves(factory);
  const paused = advanceMonth({ ...newborn(), ageInMonths: 215, countryOfResidence: 'AU' });
  expect(paused.status.type).toBe('decision');
  const saved = await store.write(paused, null);
  store.close();
  const reopened = await openSaves(factory);
  expect(await reopened.read()).toEqual(saved);
  const action = { id: 'apply-university' } as const;
  const before = (await reopened.read())!.life;
  const resolved = resolveAction(before, action);
  await reopened.write(resolved, saved.revision);
  reopened.close();

  const restored = await openSaves(factory);
  const result = (await restored.read())!.life;
  expect(result).toEqual(resolved);
  expect(result.randomState).toBe(drawRandom(before.randomState).state);
  expect(advanceMonth(result)).toEqual(advanceMonth(resolved));
  restored.close();
});

it('lets only one concurrent revision commit across separate connections', async () => {
  const factory = new IDBFactory();
  const first = await openSaves(factory);
  const second = await openSaves(factory);
  const original = await first.write(newborn(), null);
  const candidates = [advanceMonth(original.life), startLife(createLife({ name: 'Мира', sex: 'female', seed: 77 }))];
  const results = await Promise.allSettled([
    first.write(candidates[0]!, original.revision), second.write(candidates[1]!, original.revision),
  ]);
  const winner = results.find((result) => result.status === 'fulfilled');
  const loser = results.find((result) => result.status === 'rejected');
  expect(loser?.reason).toBeInstanceOf(SaveConflictError);
  expect(await second.read()).toEqual(winner?.value);
  expect(winner?.value.revision).toBe(2);
  first.close();
  second.close();
});

it('preserves the stored and displayed state after a write error and can retry', async () => {
  const store = await openSaves(new IDBFactory());
  const session = new LifeSession(store);
  await session.reload();
  expect(session.current).toBeNull();
  await session.commit(newborn());
  const previous = session.current!;
  const next = advanceMonth(previous.life);
  const put = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementationOnce(() => {
    throw new DOMException('Quota exceeded', 'QuotaExceededError');
  });
  try {
    await expect(session.commit(next)).rejects.toMatchObject({ name: 'QuotaExceededError' });
    expect(session.current).toBe(previous);
    expect(await store.read()).toEqual(previous);
    await session.commit(next);
    expect(session.current?.life).toEqual(next);
  } finally {
    put.mockRestore();
    store.close();
  }
});

it.each([
  [{ schemaVersion: 99, revision: 1, life: newborn() }, 'version'],
  [{ schemaVersion: 1, revision: 1, life: { ...newborn(), development: {} } }, 'corrupt'],
  [{ schemaVersion: 1, revision: 1, life: { ...newborn(), demographicsVersion: 'other' } }, 'data'],
] as const)('rejects invalid data and preserves it for recovery (%s)', async (raw, reason) => {
  const factory = new IDBFactory();
  const store = await openSaves(factory);
  await new Promise<void>((resolve, reject) => {
    const request = factory.open('billionlifes', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('lives', 'readwrite');
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onabort = () => { db.close(); reject(tx.error); };
      tx.objectStore('lives').put(raw, 'current');
    };
  });
  await expect(store.read()).rejects.toBeInstanceOf(InvalidSaveError);
  await expect(store.write(newborn(), 1)).rejects.toMatchObject({ raw, reason });
  await expect(store.read()).rejects.toMatchObject({ raw, reason });
  store.close();
});

it('round-trips a final snapshot without allowing any further time advancement', async () => {
  const life = newborn();
  let randomState = 0;
  while (advanceMonth({ ...life, countryOfResidence: 'NG', randomState }).status.type !== 'dead') {
    randomState += 1;
  }
  const dead = advanceMonth({ ...life, countryOfResidence: 'NG', randomState });
  const store = await openSaves(new IDBFactory());
  const final = await store.write(dead, null);
  expect(decodeSave(final)).toEqual(final);
  const loaded = (await store.read())!.life;
  expect(advanceMonth(loaded)).toBe(loaded);
  store.close();
});

it('opens a version-one snapshot with an empty diary and commits world events and notes in version three', async () => {
  const factory = new IDBFactory();
  const store = await openSaves(factory);
  const { diary: _diary, parents: _parents, ...oldLife } = newborn();
  await new Promise<void>((resolve, reject) => {
    const request = factory.open('billionlifes', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('lives', 'readwrite');
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onabort = () => { db.close(); reject(tx.error); };
      tx.objectStore('lives').put({ schemaVersion: 1, revision: 9, life: oldLife }, 'current');
    };
  });
  const restored = await store.read();
  expect(restored).toEqual({ schemaVersion: 3, revision: 9, life: newborn() });
  const life = advanceMonth(restored!.life);
  const noted = { ...life, diary: [{ ageInMonths: life.ageInMonths, text: 'Первый месяц.' }] };
  expect(await store.write(noted, 9)).toEqual({ schemaVersion: 3, revision: 10, life: noted });
  expect((await store.read())?.life).toEqual(noted);
  store.close();
});
