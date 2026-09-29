// The Android app's update check: the latest GitHub release, compared with this build's version.
// Releases are published by .github/workflows/release.yml, each with its signed APK attached.

const LATEST = 'https://api.github.com/repos/rvyyv-n/bookcook/releases/latest';

export interface Release {
  version: string;
  /** Where the APK downloads from. */
  url: string;
}

/** "v1.2.0" or "1.2.0" → [1, 2, 0]. Anything unparseable counts as 0. */
function parts(v: string): number[] {
  return v
    .replace(/^v/i, '')
    .split('-')[0]!
    .split('.')
    .map((n) => Number.parseInt(n, 10) || 0);
}

/** True when `candidate` is a later version than `current`. */
export function isNewer(candidate: string, current: string): boolean {
  const a = parts(candidate);
  const b = parts(current);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d !== 0) return d > 0;
  }
  return false;
}

interface GitHubRelease {
  tag_name?: string;
  html_url?: string;
  assets?: { name?: string; browser_download_url?: string }[];
}

/** The latest published release, or null when there is none yet. Throws when offline or rate-limited. */
export async function latestRelease(fetchImpl: typeof fetch = fetch): Promise<Release | null> {
  const res = await fetchImpl(LATEST, { headers: { Accept: 'application/vnd.github+json' } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub answered ${res.status}`);
  const body = (await res.json()) as GitHubRelease;
  if (!body.tag_name) return null;
  const apk = body.assets?.find((a) => a.name?.endsWith('.apk'))?.browser_download_url;
  const url = apk ?? body.html_url;
  return url ? { version: body.tag_name.replace(/^v/i, ''), url } : null;
}

/** The newer release to offer, or null when this build is the latest. */
export async function checkApkUpdate(current: string, fetchImpl: typeof fetch = fetch): Promise<Release | null> {
  const latest = await latestRelease(fetchImpl);
  return latest && isNewer(latest.version, current) ? latest : null;
}
