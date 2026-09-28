import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const settings = vi.hoisted(() => new Map<string, unknown>());
vi.mock('../../db/settings', () => ({
  getSetting: (key: string) => Promise.resolve(settings.get(key)),
  setSetting: (key: string, value: unknown) => Promise.resolve(void settings.set(key, value)),
}));

import { requestPersistentStorage } from './storagePersist';

function storage(persisted: boolean, grant = true) {
  const persist = vi.fn(() => Promise.resolve(grant));
  vi.stubGlobal('navigator', { storage: { persisted: () => Promise.resolve(persisted), persist } });
  return persist;
}

beforeEach(() => settings.clear());
afterEach(() => vi.unstubAllGlobals());

describe('requestPersistentStorage', () => {
  it('is false where the browser cannot persist', async () => {
    vi.stubGlobal('navigator', {});
    expect(await requestPersistentStorage()).toBe(false);
  });

  it('does not ask again when already persistent', async () => {
    const persist = storage(true);
    expect(await requestPersistentStorage()).toBe(true);
    expect(persist).not.toHaveBeenCalled();
  });

  it('asks once, then only when asked to ask again', async () => {
    const persist = storage(false, false);
    expect(await requestPersistentStorage()).toBe(false);
    expect(persist).toHaveBeenCalledTimes(1);
    expect(await requestPersistentStorage()).toBe(false);
    expect(persist).toHaveBeenCalledTimes(1);
    await requestPersistentStorage({ again: true });
    expect(persist).toHaveBeenCalledTimes(2);
  });
});
