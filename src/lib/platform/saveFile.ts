import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { isNative } from './isNative';

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function base64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).slice(String(reader.result).indexOf(',') + 1));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * Hands a file to the person: a download in the browser. The Android WebView can't download, so the
 * app writes it to its cache and opens the share sheet (Save to Drive, Files…). False when that was
 * cancelled; a browser download can't be told apart from one that was kept, so it's always true.
 */
export async function saveFile(blob: Blob, filename: string): Promise<boolean> {
  if (!isNative()) {
    download(blob, filename);
    return true;
  }
  const { uri } = await Filesystem.writeFile({ path: filename, data: await base64(blob), directory: Directory.Cache });
  try {
    await Share.share({ title: filename, files: [uri] });
    return true;
  } catch {
    return false;
  }
}
