import { getSetting, setSetting } from '../../db/settings';

/**
 * Ask the browser to keep our storage under pressure (these recipes are irreplaceable). Called on
 * the first saved recipe and the first backup; asks only once, as some browsers show a prompt.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  if (await navigator.storage.persisted?.()) return true;
  if (await getSetting('persistRequested')) return false;
  await setSetting('persistRequested', true);
  return navigator.storage.persist();
}
