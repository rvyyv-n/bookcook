import { Printer } from '@capgo/capacitor-printer';
import { isNative } from './isNative';

/** The browser's print dialog, or Android's print service in the app (the WebView ignores `window.print()`). */
export function printPage(name: string): void {
  if (isNative()) void Printer.printWebView({ name }).catch(() => {});
  else window.print();
}
