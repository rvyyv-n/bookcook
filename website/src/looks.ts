/**
 * Five looks, light or dark, three text sizes. The phone re-dresses itself with a circle that grows from
 * the look you picked; its rice timer keeps counting down whatever it wears.
 */
import { formatClock } from '../../src/lib/parse/timers';
import { reducedMotion } from './site';
import { onSize, setSize, type Size } from './size';

export function looks() {
  const phone = document.getElementById('phone')!;
  const screen = document.getElementById('phone-screen')!;

  const dress = (key: 'skin' | 'mode', value: string, from: Element) => {
    const apply = () => {
      phone.dataset[key] = value;
    };
    if (!document.startViewTransition || reducedMotion()) return apply();
    const s = screen.getBoundingClientRect();
    const f = from.getBoundingClientRect();
    const x = Math.min(Math.max(f.left + f.width / 2 - s.left, 0), s.width);
    const y = Math.min(Math.max(f.top + f.height / 2 - s.top, 0), s.height);
    const r = Math.hypot(Math.max(x, s.width - x), Math.max(y, s.height - y));
    const t = document.startViewTransition(apply);
    void t.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
        { duration: 900, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', pseudoElement: '::view-transition-new(phone-screen)' },
      );
    });
  };

  document
    .querySelectorAll<HTMLInputElement>('input[name="skin"]')
    .forEach((r) => r.addEventListener('change', () => dress('skin', r.value, r.closest('label')!)));
  document
    .querySelectorAll<HTMLInputElement>('input[name="mode"]')
    .forEach((r) => r.addEventListener('change', () => dress('mode', r.value, r.closest('label')!)));

  const sizeRadios = [...document.querySelectorAll<HTMLInputElement>('input[name="size"]')];
  sizeRadios.forEach((r) => r.addEventListener('change', () => setSize(r.value as Size, r.closest('fieldset'))));
  onSize((s) => sizeRadios.forEach((r) => (r.checked = r.value === s)));

  // The rice timer from the cook-mode screenshots, counting down from 6:58.
  const clock = document.getElementById('ps-clock')!;
  const left = document.getElementById('ps-left')!;
  const start = Date.now();
  setInterval(() => {
    const secs = 418 - (Math.floor((Date.now() - start) / 1000) % 418);
    clock.textContent = formatClock(secs);
    left.textContent = `${formatClock(secs)} left`;
  }, 1000);
}
