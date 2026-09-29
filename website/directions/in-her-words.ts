import { ingredientParts } from '../../src/lib/parse/ingredient';
import { scaleIngredient } from '../../src/lib/parse/scale';
import { getUnit } from '../../src/lib/parse/units';
import type { ParsedIngredient } from '../../src/lib/parse/types';
import { sections, servings as baseServings } from '../src/biryani';
import { drawIcons, followDeviceTheme, getbar, reducedMotion } from '../src/site';

drawIcons();
followDeviceTheme();
getbar(document.getElementById('getbar')!, [document.querySelector('.get-open')!]);

// ---------- Text size: the whole page grows, as the app does ----------

document.querySelectorAll<HTMLInputElement>('input[name="size"]').forEach((radio) =>
  radio.addEventListener('change', () => {
    document.documentElement.dataset.textSize = radio.value;
    // Keep the switch where the reader's eyes are after the page reflows.
    radio.closest('.sizes')!.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' });
  }),
);

// ---------- Ingredients, scaled ----------

const list = document.getElementById('ingredients')!;
const MIN = 1;
const MAX = 12;
let serves = baseServings;

function escape(s: string) {
  return s.replace(/[&<>"]/g, (c) => `&${{ '&': 'amp', '<': 'lt', '>': 'gt', '"': 'quot' }[c]};`);
}

function columns(ing: ParsedIngredient) {
  const unit = getUnit(ing.unit);
  if (unit?.trailing) return { amount: unit.singular, name: ing.name, note: ing.note ?? '' };
  const p = ingredientParts(ing);
  return { amount: [p.quantity, p.unit].filter(Boolean).join(' '), name: p.name, note: p.note };
}

list.innerHTML = sections
  .map(
    (s) =>
      `<div class="ingredients-section"><h3>${escape(s.name)}</h3><ul>${s.items
        .map((ing) => {
          const { name, note } = columns(ing);
          return `<li><span class="amount" data-id="${ing.id}"></span><span>${escape(name)}${note ? `<span class="note">, ${escape(note)}</span>` : ''}</span></li>`;
        })
        .join('')}</ul></div>`,
  )
  .join('');

function renderAmounts() {
  for (const s of sections) {
    for (const ing of s.items) {
      const el = list.querySelector<HTMLElement>(`[data-id="${ing.id}"]`)!;
      const amount = columns(scaleIngredient(ing, serves / baseServings)).amount;
      if (el.textContent && el.textContent !== amount) {
        el.classList.remove('is-changed');
        void el.offsetWidth;
        el.classList.add('is-changed');
      }
      el.textContent = amount;
    }
  }
}

// ---------- Servings: a ruler to drag, and Fewer / More ----------

const ruler = document.getElementById('ruler')!;
const track = document.getElementById('ruler-track')!;
const servesN = document.getElementById('serves-n')!;
const fewer = document.getElementById('fewer') as HTMLButtonElement;
const more = document.getElementById('more') as HTMLButtonElement;

track.innerHTML = Array.from({ length: MAX - MIN + 1 }, (_, i) => `<span class="tick" data-n="${i + MIN}">${i + MIN}</span>`).join('');
const ticks = [...track.querySelectorAll<HTMLElement>('.tick')];
const tickWidth = () => ticks[0]!.getBoundingClientRect().width;

function setServes(n: number) {
  n = Math.min(MAX, Math.max(MIN, n));
  if (n === serves && list.dataset.ready) return;
  list.dataset.ready = 'true';
  serves = n;
  servesN.textContent = String(n);
  ruler.setAttribute('aria-valuenow', String(n));
  ruler.setAttribute('aria-valuetext', `Serves ${n}`);
  ticks.forEach((t) => t.classList.toggle('is-current', Number(t.dataset.n) === n));
  fewer.disabled = n === MIN;
  more.disabled = n === MAX;
  renderAmounts();
}

function scrollToServes(n: number, smooth = true) {
  ruler.scrollTo({ left: (n - MIN) * tickWidth(), behavior: smooth && !reducedMotion() ? 'smooth' : 'auto' });
}

let frame = 0;
ruler.addEventListener('scroll', () => {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(() => setServes(MIN + Math.round(ruler.scrollLeft / tickWidth())));
});

ruler.addEventListener('keydown', (e) => {
  const step = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
  if (e.key === 'Home' || e.key === 'End' || step) {
    e.preventDefault();
    const n = e.key === 'Home' ? MIN : e.key === 'End' ? MAX : serves + step!;
    setServes(n);
    scrollToServes(serves);
  }
});

// Mouse users can drag the tape too; touch scrolls it natively.
let drag: { x: number; left: number } | null = null;
ruler.addEventListener('pointerdown', (e) => {
  if (e.pointerType !== 'mouse') return;
  drag = { x: e.clientX, left: ruler.scrollLeft };
  ruler.style.scrollSnapType = 'none';
  ruler.setPointerCapture(e.pointerId);
});
ruler.addEventListener('pointermove', (e) => {
  if (drag) ruler.scrollLeft = drag.left - (e.clientX - drag.x);
});
ruler.addEventListener('pointerup', () => {
  if (!drag) return;
  drag = null;
  ruler.style.scrollSnapType = '';
  scrollToServes(serves);
});

fewer.addEventListener('click', () => {
  setServes(serves - 1);
  scrollToServes(serves);
});
more.addEventListener('click', () => {
  setServes(serves + 1);
  scrollToServes(serves);
});

setServes(baseServings);
requestAnimationFrame(() => scrollToServes(baseServings, false));
