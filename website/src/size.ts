/**
 * Text size for the whole website, as the app has it: Normal, Large and Huge. The nav button steps
 * through them and the choice in the Looks section sets one; both stay in step. The part of the page
 * you were reading stays where it was while everything reflows around it.
 */
import { reducedMotion } from './site';

export type Size = 'normal' | 'large' | 'huge';
const SIZES: Size[] = ['normal', 'large', 'huge'];
const LABEL: Record<Size, string> = { normal: 'Normal', large: 'Large', huge: 'Huge' };
const KEY = 'bookcook-site-size';

const root = document.documentElement;
const listeners: ((s: Size) => void)[] = [];

export const currentSize = (): Size => (SIZES.includes(root.dataset.size as Size) ? (root.dataset.size as Size) : 'normal');

export function onSize(fn: (s: Size) => void) {
  listeners.push(fn);
  fn(currentSize());
}

export function setSize(size: Size, keep?: Element | null) {
  if (size === currentSize()) return;
  const anchor = keep ?? document.elementFromPoint(innerWidth / 2, innerHeight / 2);
  const before = anchor?.getBoundingClientRect().top ?? 0;
  const apply = () => {
    root.dataset.size = size;
    listeners.forEach((fn) => fn(size));
    if (anchor) scrollBy({ top: anchor.getBoundingClientRect().top - before, behavior: 'instant' });
  };
  try {
    localStorage.setItem(KEY, size);
  } catch {
    // Private windows can refuse storage; the size still applies for this visit.
  }
  if (document.startViewTransition && !reducedMotion()) document.startViewTransition(apply);
  else apply();
}

export function sizeControls() {
  const navBtn = document.getElementById('nav-size')!;
  const navValue = document.getElementById('nav-size-value')!;
  navBtn.addEventListener('click', () => {
    const next = SIZES[(SIZES.indexOf(currentSize()) + 1) % SIZES.length]!;
    setSize(next);
  });
  onSize((s) => {
    navValue.textContent = LABEL[s];
    navBtn.setAttribute('aria-label', `Text size: ${LABEL[s]}. Change text size`);
  });
}
