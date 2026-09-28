import { afterEach, describe, expect, it, vi } from 'vitest';

const native = vi.hoisted(() => ({ value: false }));
const setStyle = vi.hoisted(() => vi.fn(() => Promise.resolve()));
vi.mock('./isNative', () => ({ isNative: () => native.value }));
vi.mock('@capacitor/core', () => ({ SystemBars: { setStyle }, SystemBarsStyle: { Dark: 'DARK', Light: 'LIGHT' } }));

import { matchSystemBars } from './systemBars';

afterEach(() => {
  native.value = false;
  setStyle.mockClear();
});

describe('matchSystemBars', () => {
  it('leaves the bars alone in the browser', () => {
    matchSystemBars(true);
    expect(setStyle).not.toHaveBeenCalled();
  });

  it('follows the app theme in the app', () => {
    native.value = true;
    matchSystemBars(true);
    expect(setStyle).toHaveBeenLastCalledWith({ style: 'DARK' });
    matchSystemBars(false);
    expect(setStyle).toHaveBeenLastCalledWith({ style: 'LIGHT' });
  });
});
