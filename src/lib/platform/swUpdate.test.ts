import { checkForUpdate } from './swUpdate';

/** A stand-in registration: `update()` optionally finds a worker that installs after a tick. */
function fakeReg(found: 'none' | 'installs' | 'fails') {
  const listeners: (() => void)[] = [];
  const worker = {
    state: 'installing' as ServiceWorkerState,
    addEventListener: (_: string, fn: () => void) => listeners.push(fn),
    removeEventListener: () => {},
  };
  const reg = {
    installing: null as unknown,
    waiting: null as unknown,
    update: async () => {
      if (found === 'none') return;
      reg.installing = worker;
      setTimeout(() => {
        worker.state = found === 'installs' ? 'installed' : 'redundant';
        reg.installing = null;
        if (found === 'installs') reg.waiting = worker;
        listeners.forEach((l) => l());
      }, 5);
    },
  };
  return reg as unknown as ServiceWorkerRegistration;
}

describe('checkForUpdate', () => {
  it('is false when there is nothing new', async () => {
    expect(await checkForUpdate(fakeReg('none'))).toBe(false);
  });
  it('waits for a new version to install, then is true', async () => {
    expect(await checkForUpdate(fakeReg('installs'))).toBe(true);
  });
  it('is false when the new version fails to install', async () => {
    expect(await checkForUpdate(fakeReg('fails'))).toBe(false);
  });
});
