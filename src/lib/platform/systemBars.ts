import { SystemBars, SystemBarsStyle } from '@capacitor/core';
import { isNative } from './isNative';

/**
 * In the app, the status and navigation bar icons follow the app's theme rather than the phone's,
 * so they stay readable on the paper colour drawn behind them.
 */
export function matchSystemBars(dark: boolean): void {
  if (!isNative()) return;
  void SystemBars.setStyle({ style: dark ? SystemBarsStyle.Dark : SystemBarsStyle.Light }).catch(() => {});
}
