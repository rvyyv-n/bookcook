import { isNative } from './isNative';

/** The published web app. The Android app runs from https://localhost, which means nothing on anyone else's phone. */
const PUBLIC_URL = 'https://rvyyv-n.github.io/bookcook/';

/** Origin and base path for links that leave this device (share links). */
export function appLinkBase(): { origin: string; base: string } {
  if (!isNative()) return { origin: location.origin, base: import.meta.env.BASE_URL };
  const url = new URL(import.meta.env.VITE_PUBLIC_URL || PUBLIC_URL);
  return { origin: url.origin, base: url.pathname };
}
