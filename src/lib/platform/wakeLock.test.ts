import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

const native = vi.hoisted(() => ({ value: false }));
const keepAwake = vi.hoisted(() => vi.fn(() => Promise.resolve()));
const allowSleep = vi.hoisted(() => vi.fn(() => Promise.resolve()));
vi.mock('./isNative', () => ({ isNative: () => native.value }));
vi.mock('@capacitor-community/keep-awake', () => ({ KeepAwake: { keepAwake, allowSleep } }));

import { useWakeLock } from './wakeLock';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function renderHook(hook: () => void) {
  function Probe() {
    hook();
    return null;
  }
  const root = createRoot(document.createElement('div'));
  act(() => root.render(createElement(Probe)));
  return { unmount: () => act(() => root.unmount()) };
}

afterEach(() => {
  native.value = false;
  keepAwake.mockClear();
  allowSleep.mockClear();
  vi.unstubAllGlobals();
});

describe('useWakeLock', () => {
  it('keeps Android awake while active and lets it sleep after', () => {
    native.value = true;
    const { unmount } = renderHook(() => useWakeLock());
    expect(keepAwake).toHaveBeenCalledTimes(1);
    unmount();
    expect(allowSleep).toHaveBeenCalledTimes(1);
  });

  it('does nothing in the app while inactive', () => {
    native.value = true;
    renderHook(() => useWakeLock(false));
    expect(keepAwake).not.toHaveBeenCalled();
  });

  it('takes and releases the screen wake lock in the browser', async () => {
    const release = vi.fn(() => Promise.resolve());
    const request = vi.fn(() => Promise.resolve({ release }));
    vi.stubGlobal('navigator', { wakeLock: { request } });
    const { unmount } = renderHook(() => useWakeLock());
    await vi.waitFor(() => expect(request).toHaveBeenCalledWith('screen'));
    unmount();
    expect(release).toHaveBeenCalled();
    expect(keepAwake).not.toHaveBeenCalled();
  });
});
