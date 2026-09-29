import { Capacitor } from '@capacitor/core';

/** Running inside the Android app (Capacitor's WebView) rather than a browser. */
export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

/** Running inside the Windows app (Tauri's window) rather than a browser. */
export function isDesktopApp(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/** Either installed app, which updates by downloading a new installer from GitHub Releases. */
export function isInstalledApp(): boolean {
  return isNative() || isDesktopApp();
}
