import { checkApkUpdate, isNewer, latestRelease } from './apkUpdate';

const answer = (status: number, body: unknown) => (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

describe('isNewer', () => {
  it('compares each part as a number', () => {
    expect(isNewer('1.10.0', '1.9.3')).toBe(true);
    expect(isNewer('v2.0.0', '1.99.99')).toBe(true);
    expect(isNewer('1.0.0', '1.0.0')).toBe(false);
    expect(isNewer('1.0', '1.0.1')).toBe(false);
    expect(isNewer('1.0.1', '1.0')).toBe(true);
  });
});

describe('latestRelease', () => {
  it('picks the APK from the release', async () => {
    const r = await latestRelease(
      answer(200, {
        tag_name: 'v1.1.0',
        html_url: 'https://github.com/x/y/releases/tag/v1.1.0',
        assets: [
          { name: 'notes.txt', browser_download_url: 'n' },
          { name: 'bookcook-1.1.0.apk', browser_download_url: 'https://x/apk' },
        ],
      }),
    );
    expect(r).toEqual({ version: '1.1.0', url: 'https://x/apk' });
  });
  it('falls back to the release page when there is no APK', async () => {
    expect(await latestRelease(answer(200, { tag_name: 'v1.1.0', html_url: 'https://page', assets: [] }))).toEqual({
      version: '1.1.0',
      url: 'https://page',
    });
  });
  it('is null before the first release', async () => {
    expect(await latestRelease(answer(404, { message: 'Not Found' }))).toBeNull();
  });
  it('throws when GitHub refuses', async () => {
    await expect(latestRelease(answer(403, { message: 'rate limit' }))).rejects.toThrow();
  });
});

describe('checkApkUpdate', () => {
  const release = answer(200, { tag_name: 'v1.2.0', assets: [{ name: 'a.apk', browser_download_url: 'https://x/a.apk' }] });
  it('offers a later release', async () => {
    expect(await checkApkUpdate('1.1.0', release)).toEqual({ version: '1.2.0', url: 'https://x/a.apk' });
  });
  it('offers nothing when this build is the latest', async () => {
    expect(await checkApkUpdate('1.2.0', release)).toBeNull();
  });
});
