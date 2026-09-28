import { getSetting, setSetting } from '../../db/settings';

/**
 * Ask the browser to keep our storage under pressure (these recipes are irreplaceable). Saving a
 * recipe asks once, as Firefox shows a prompt each time. A backup asks again (`again`): Chrome
 * grants it silently once the site is used more or installed, so an early no isn't final.
 */
export async function requestPersistentStorage({ again = false } = {}): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  if (await navigator.storage.persisted?.()) return true;
  if (!again && (await getSetting('persistRequested'))) return false;
  await setSetting('persistRequested', true);
  return navigator.storage.persist();
}
