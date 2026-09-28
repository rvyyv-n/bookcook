import { afterEach, describe, expect, it, vi } from 'vitest';

const native = vi.hoisted(() => ({ value: false }));
const read = vi.hoisted(() => vi.fn());
vi.mock('./isNative', () => ({ isNative: () => native.value }));
vi.mock('@capacitor/clipboard', () => ({ Clipboard: { read } }));

import { readClipboard } from './clipboard';

afterEach(() => {
  native.value = false;
  read.mockReset();
  vi.unstubAllGlobals();
});

describe('readClipboard', () => {
  it('reads the web clipboard in the browser', async () => {
    vi.stubGlobal('navigator', { clipboard: { readText: () => Promise.resolve('web text') } });
    expect(await readClipboard()).toBe('web text');
    expect(read).not.toHaveBeenCalled();
  });

  it('asks Android in the app', async () => {
    native.value = true;
    read.mockResolvedValue({ type: 'text/plain', value: 'native text' });
    expect(await readClipboard()).toBe('native text');
  });

  it('returns nothing when the copied item is not text', async () => {
    native.value = true;
    read.mockResolvedValue({ type: 'image/png', value: 'data:...' });
    expect(await readClipboard()).toBe('');
  });
});
