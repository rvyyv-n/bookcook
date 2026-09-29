/**
 * Asks the server for a newer service worker and waits for it to finish installing.
 * Resolves true when a new version is installed and waiting.
 */
export async function checkForUpdate(reg: ServiceWorkerRegistration): Promise<boolean> {
  await reg.update();
  const worker = reg.installing;
  if (worker)
    await new Promise<void>((resolve) => {
      const done = () => {
        if (worker.state === 'installing') return;
        worker.removeEventListener('statechange', done);
        resolve();
      };
      worker.addEventListener('statechange', done);
      done();
    });
  return !!reg.waiting;
}
