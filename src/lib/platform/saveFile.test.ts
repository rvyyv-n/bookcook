import { afterEach, describe, expect, it, vi } from 'vitest';

const native = vi.hoisted(() => ({ value: false }));
const writeFile = vi.hoisted(() => vi.fn());
const share = vi.hoisted(() => vi.fn());
vi.mock('./isNative', () => ({ isNative: () => native.value }));
vi.mock('@capacitor/filesystem', () => ({ Directory: { Cache: 'CACHE' }, Filesystem: { writeFile } }));
vi.mock('@capacitor/share', () => ({ Share: { share } }));

import { saveFile } from './saveFile';

afterEach(() => {
  native.value = false;
  writeFile.mockReset();
  share.mockReset();
  vi.restoreAllMocks();
});

describe('saveFile', () => {
  it('downloads through a link in the browser', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    expect(await saveFile(new Blob(['a']), 'book.bookcook')).toBe(true);
    expect(click).toHaveBeenCalled();
    expect(writeFile).not.toHaveBeenCalled();
  });

  it('writes to the cache and shares it in the app', async () => {
    native.value = true;
    writeFile.mockResolvedValue({ uri: 'file:///cache/book.bookcook' });
    share.mockResolvedValue({});
    expect(await saveFile(new Blob(['hello']), 'book.bookcook')).toBe(true);
    expect(writeFile).toHaveBeenCalledWith({ path: 'book.bookcook', data: btoa('hello'), directory: 'CACHE' });
    expect(share).toHaveBeenCalledWith({ title: 'book.bookcook', files: ['file:///cache/book.bookcook'] });
  });

  it('returns false when the share sheet is dismissed', async () => {
    native.value = true;
    writeFile.mockResolvedValue({ uri: 'file:///cache/a' });
    share.mockRejectedValue(new Error('canceled'));
    expect(await saveFile(new Blob(['x']), 'a')).toBe(false);
  });
});
