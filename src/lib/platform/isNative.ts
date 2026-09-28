import { Capacitor } from '@capacitor/core';

/** Running inside the Android app (Capacitor's WebView) rather than a browser. */
export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}
