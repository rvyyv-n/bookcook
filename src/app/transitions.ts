import type { createBrowserRouter } from 'react-router';

type Router = ReturnType<typeof createBrowserRouter>;
export type NavDirection = 'forward' | 'back' | 'fade';

/** The tab bar's destinations: moving between them cross-fades instead of sliding. */
const TABS = /^\/(grocery|requests|settings|c|t)?\/?$/;

function setDirection(dir: NavDirection) {
  document.documentElement.dataset.nav = dir;
}

/**
 * Animates every in-app navigation with the browser's view transitions, the way a phone app moves
 * between screens: a screen opened from another slides in over it, going back slides it away, and
 * switching tabs cross-fades. motion.css draws the animations from the direction set here. Browsers
 * without view transitions, and Reduce Motion, get the plain instant change.
 */
export function withTransitions(router: Router): Router {
  if (typeof document === 'undefined' || !('startViewTransition' in document)) return router;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  // The phone's back gesture and the browser's back button arrive as popstate, before the router sees them.
  window.addEventListener('popstate', () => setDirection('back'), { capture: true });
  const navigate = router.navigate.bind(router);
  router.navigate = ((to: Parameters<Router['navigate']>[0], opts?: Parameters<Router['navigate']>[1]) => {
    if (reduce.matches) return navigate(to as never, opts);
    if (typeof to === 'number') {
      setDirection(to < 0 ? 'back' : 'forward');
      return navigate(to);
    }
    const path = (typeof to === 'string' ? to : (to?.pathname ?? '')).split(/[?#]/)[0] ?? '';
    setDirection(opts?.replace || TABS.test(path) ? 'fade' : 'forward');
    // Links pass viewTransition: undefined explicitly, so it's set after the spread.
    return navigate(to, { ...opts, viewTransition: opts?.viewTransition ?? true });
  }) as Router['navigate'];
  return router;
}
