/**
 * The page's motion: headings that rise word by word, the page colour that follows the section in view,
 * and a few scroll-linked moments (the quote lighting up, the "No" lines coming into focus, the devices
 * drifting apart). With reduced motion on, every one of them shows its finished state straight away.
 */
import { reducedMotion } from './site';

const root = document.documentElement;
const clamp = (n: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));

/** Wrap each word so it can rise from behind its line. */
function splitWords(el: HTMLElement) {
  const words = el.textContent!.trim().split(/\s+/);
  el.innerHTML = words.map((w, i) => `<span class="w"><span style="--i:${i}">${w}</span></span>`).join(' ');
}

export function risingHeadings() {
  const headings = [...document.querySelectorAll<HTMLElement>('[data-words]')];
  if (reducedMotion()) return headings.forEach((h) => h.classList.add('is-in'));
  headings.forEach(splitWords);
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      }
    },
    { threshold: 0.3, rootMargin: '0px 0px -8% 0px' },
  );
  headings.forEach((h) => io.observe(h));
}

/** The page wears the colour of whichever section is in the middle of the screen. */
export function pageColour() {
  const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  const links = [...document.querySelectorAll<HTMLAnchorElement>('.nav-links a')];
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const el = e.target as HTMLElement;
        root.dataset.bg = el.dataset.bg ?? 'paper';
        requestAnimationFrame(() => themeColor?.setAttribute('content', getComputedStyle(document.body).backgroundColor));
        links.forEach((a) => a.setAttribute('aria-current', String(a.hash === `#${el.id}`)));
      }
    },
    { rootMargin: '-50% 0px -50% 0px' },
  );
  document.querySelectorAll('[data-bg]:not(html)').forEach((s) => io.observe(s));
}

export function stickyNav() {
  const nav = document.getElementById('nav')!;
  const update = () => nav.classList.toggle('is-stuck', scrollY > 8);
  addEventListener('scroll', update, { passive: true });
  update();
}

/** Primary buttons fill from where the pointer comes in. */
export function pointerFills() {
  document.addEventListener('pointerover', (e) => {
    const btn = (e.target as Element).closest?.<HTMLElement>('.btn-primary');
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    btn.style.setProperty('--mx', `${e.clientX - r.left}px`);
    btn.style.setProperty('--my', `${e.clientY - r.top}px`);
  });
}

/** The recipe deck leans a little towards the pointer. */
export function deckTilt() {
  const stage = document.querySelector<HTMLElement>('.hero-stage');
  const deck = document.querySelector<HTMLElement>('.deck');
  if (!stage || !deck || reducedMotion() || !matchMedia('(pointer: fine)').matches) return;
  stage.addEventListener('pointermove', (e) => {
    const r = stage.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    deck.style.setProperty('--ty', `${x * 7}deg`);
    deck.style.setProperty('--tx', `${-y * 5}deg`);
  });
  stage.addEventListener('pointerleave', () => {
    deck.style.setProperty('--ty', '0deg');
    deck.style.setProperty('--tx', '0deg');
  });
}

/** Scroll-linked moments, measured once per frame while the page is scrolling. */
export function scrollMoments() {
  const quote = document.getElementById('quote');
  const quoteWords: HTMLElement[] = [];
  if (quote) {
    const p = quote.querySelector('p')!;
    const words = p.textContent!.trim().split(/\s+/);
    p.innerHTML = words.map((w) => `<span class="qw">${w}</span>`).join(' ');
    quoteWords.push(...p.querySelectorAll<HTMLElement>('.qw'));
  }
  const nos = [...document.querySelectorAll<HTMLElement>('#nos li')];
  const devices = document.getElementById('devices');
  const deviceEls = devices ? [...devices.querySelectorAll<HTMLElement>('.device')] : [];

  if (reducedMotion()) {
    quoteWords.forEach((w) => w.classList.add('is-lit'));
    return;
  }

  let queued = false;
  const update = () => {
    queued = false;
    const vh = innerHeight;
    if (quote) {
      const r = quote.getBoundingClientRect();
      const p = clamp((vh * 0.82 - r.top) / (r.height + vh * 0.25));
      const lit = Math.round(p * quoteWords.length * 1.15);
      quoteWords.forEach((w, i) => w.classList.toggle('is-lit', i < lit));
    }
    for (const li of nos) {
      const r = li.getBoundingClientRect();
      const d = Math.abs(r.top + r.height / 2 - vh * 0.5) / (vh * 0.5);
      li.style.setProperty('--o', String(clamp(1.15 - d, 0.18, 1)));
    }
    if (devices) {
      const r = devices.getBoundingClientRect();
      const p = clamp((vh - r.top) / (vh + r.height));
      for (const d of deviceEls) d.style.setProperty('--shift', `${(p - 0.5) * Number(d.dataset.speed) * 140}px`);
    }
  };
  const queue = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  };
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue);
  update();
}

/** On phones, the Get Bookcook bar shows whenever none of the page's own Open the app buttons are on screen. */
export function getbar() {
  const bar = document.getElementById('getbar');
  if (!bar) return;
  const visible = new Set<Element>();
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) visible.add(e.target);
      else visible.delete(e.target);
    }
    bar.classList.toggle('is-shown', visible.size === 0);
  });
  document.querySelectorAll('.get-open').forEach((el) => io.observe(el));
}
