import { afterEach, describe, expect, it, vi } from 'vitest';

const native = vi.hoisted(() => ({ value: false }));
const share = vi.hoisted(() => vi.fn());
vi.mock('./isNative', () => ({ isNative: () => native.value }));
vi.mock('@capacitor/share', () => ({ Share: { share } }));

import { shareLink } from './share';

const data = { title: 'Soup', text: 'Try this', url: 'https://x.test/a' };

afterEach(() => {
  native.value = false;
  share.mockReset();
  vi.unstubAllGlobals();
});

describe('shareLink', () => {
  it('uses the Android share sheet in the app', async () => {
    native.value = true;
    share.mockResolvedValue({});
    expect(await shareLink(data)).toBe('shared');
    expect(share).toHaveBeenCalledWith({ ...data, dialogTitle: 'Soup' });
  });

  it('reports a dismissed Android share sheet as cancelled', async () => {
    native.value = true;
    share.mockRejectedValue(new Error('Share canceled'));
    expect(await shareLink(data)).toBe('cancelled');
  });

  it('uses the browser share sheet where there is one', async () => {
    const webShare = vi.fn(() => Promise.resolve());
    vi.stubGlobal('navigator', { share: webShare });
    expect(await shareLink(data)).toBe('shared');
    expect(webShare).toHaveBeenCalledWith(data);
  });

  it('reports an aborted browser share as cancelled', async () => {
    vi.stubGlobal('navigator', { share: () => Promise.reject(new DOMException('no', 'AbortError')) });
    expect(await shareLink(data)).toBe('cancelled');
  });

  it('copies the text and link when there is no share sheet', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    expect(await shareLink(data)).toBe('copied');
    expect(writeText).toHaveBeenCalledWith('Try this https://x.test/a');
  });
});
