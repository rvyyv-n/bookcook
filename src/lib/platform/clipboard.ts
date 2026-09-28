import { Clipboard } from '@capacitor/clipboard';
import { isNative } from './isNative';

/** The copied text. The Android WebView refuses the web clipboard API, so the app asks Android. */
export async function readClipboard(): Promise<string> {
  if (!isNative()) return navigator.clipboard.readText();
  const { type, value } = await Clipboard.read();
  return type.startsWith('text') ? value : '';
}
