import { getSetting, setSetting } from '../../db/settings';

/**
 * Ask the browser to keep our storage (these recipes are irreplaceable).
 * Called on the first save; harmless to call again.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  if (await navigator.storage.persisted?.()) return true;
  const asked = await getSetting('persistRequested');
  const granted = await navigator.storage.persist();
  if (!asked) await setSetting('persistRequested', true);
  return granted;
}
