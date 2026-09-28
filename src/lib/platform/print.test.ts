import { afterEach, describe, expect, it, vi } from 'vitest';

const native = vi.hoisted(() => ({ value: false }));
const printWebView = vi.hoisted(() => vi.fn(() => Promise.resolve()));
vi.mock('./isNative', () => ({ isNative: () => native.value }));
vi.mock('@capgo/capacitor-printer', () => ({ Printer: { printWebView } }));

import { printPage } from './print';

afterEach(() => {
  native.value = false;
  printWebView.mockClear();
  vi.unstubAllGlobals();
});

describe('printPage', () => {
  it('opens the browser print dialog', () => {
    const print = vi.fn();
    vi.stubGlobal('print', print);
    printPage('Soup');
    expect(print).toHaveBeenCalled();
    expect(printWebView).not.toHaveBeenCalled();
  });

  it('opens Android print in the app', () => {
    native.value = true;
    printPage('Soup');
    expect(printWebView).toHaveBeenCalledWith({ name: 'Soup' });
  });
});
