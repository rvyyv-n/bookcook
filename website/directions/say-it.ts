import { ingredientParts, parseIngredient } from '../../src/lib/parse/ingredient';
import { getUnit } from '../../src/lib/parse/units';
import type { ParsedIngredient } from '../../src/lib/parse/types';
import { ingredients } from '../src/biryani';
import { drawIcons, followDeviceTheme, getbar, makeRecognition, reducedMotion } from '../src/site';

drawIcons();
followDeviceTheme();
getbar(document.getElementById('getbar')!, [document.querySelector('.get-open')!]);

// ---------- The headline, heard as it's said ----------

const heard = document.querySelector<HTMLElement>('.heard')!;
const title = document.getElementById('hero-title')!;

function transcribe() {
  if (reducedMotion()) {
    heard.classList.add('is-written');
    return;
  }
  const words = title.textContent!.trim().split(/\s+/);
  title.innerHTML = words.map((w) => `<span class="w is-waiting">${w}</span>`).join(' ');
  const spans = [...title.querySelectorAll<HTMLElement>('.w')];
  const caret = document.createElement('span');
  caret.className = 'caret';
  caret.setAttribute('aria-hidden', 'true');

  spans.forEach((span, i) => {
    setTimeout(
      () => {
        span.classList.replace('is-waiting', 'is-heard');
        span.after(caret);
        // Words settle a beat behind, as a recogniser firms up its guess.
        spans[i - 2]?.classList.remove('is-heard');
      },
      600 + i * 260,
    );
  });
  setTimeout(
    () => {
      spans.forEach((s) => s.classList.remove('is-heard'));
      caret.remove();
      heard.classList.add('is-written');
    },
    600 + spans.length * 260 + 500,
  );
}
transcribe();

// ---------- Tell it ----------

const rows = document.getElementById('rows')!;
const count = document.getElementById('count')!;
const heardLine = document.getElementById('heard-line')!;
const form = document.getElementById('say') as HTMLFormElement;
const input = document.getElementById('say-input') as HTMLInputElement;
const tries = [...document.querySelectorAll<HTMLButtonElement>('.try')];

let total = 0;
const MAX_ROWS = 6;

function escape(s: string) {
  return s.replace(/[&<>"]/g, (c) => `&${{ '&': 'amp', '<': 'lt', '>': 'gt', '"': 'quot' }[c]};`);
}

/** Amount and ingredient as the app lays them out: "3 cups | basmati rice, washed", "to taste | salt". */
function columns(ing: ParsedIngredient) {
  const unit = getUnit(ing.unit);
  if (unit?.trailing) return { amount: unit.singular, name: ing.name, note: ing.note ?? '' };
  const p = ingredientParts(ing);
  return { amount: [p.quantity, p.unit].filter(Boolean).join(' '), name: p.name, note: p.note };
}

function addRow(ing: ParsedIngredient, isNew: boolean) {
  const { amount, name, note } = columns(ing);
  rows.querySelector('.is-new')?.classList.remove('is-new');
  const li = document.createElement('li');
  if (isNew) li.className = 'is-new';
  li.innerHTML =
    `<span class="amount">${escape(amount)}</span>` +
    `<span><span class="name">${escape(name)}</span>${note ? `<span class="note">, ${escape(note)}</span>` : ''}</span>`;
  rows.append(li);
  while (rows.children.length > MAX_ROWS) rows.firstElementChild!.remove();
  total += 1;
  count.textContent = String(total);
}

ingredients.slice(0, 2).forEach((ing) => addRow(ing, false));

function add(text: string) {
  const said = text.trim();
  if (!said) return;
  const ing = parseIngredient(said);
  if (!ing.name) {
    heardLine.innerHTML = `I didn’t catch an ingredient in “${escape(said)}”. Try “two onions, chopped”.`;
    return;
  }
  addRow(ing, true);
  heardLine.innerHTML = `Heard <span class="handwritten">“${escape(said)}”</span>`;
  input.value = '';
  input.classList.remove('is-interim');
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  add(input.value);
});

// The examples are "said" into the field a few letters at a time, then written down.
tries.forEach((btn) =>
  btn.addEventListener('click', () => {
    const text = btn.textContent!.trim();
    if (reducedMotion()) return add(text);
    tries.forEach((b) => (b.disabled = true));
    input.value = '';
    input.classList.add('is-interim');
    let i = 0;
    const tick = setInterval(() => {
      i += 2;
      input.value = text.slice(0, i);
      if (i < text.length) return;
      clearInterval(tick);
      input.classList.remove('is-interim');
      setTimeout(() => {
        add(text);
        tries.forEach((b) => (b.disabled = false));
      }, 350);
    }, 45);
  }),
);

// ---------- Speak, where the browser can hear ----------

const mic = document.getElementById('mic') as HTMLButtonElement;
const micLabel = document.getElementById('mic-label')!;
const noSpeech = document.getElementById('no-speech')!;
const recognition = makeRecognition();

if (!recognition) {
  noSpeech.hidden = false;
} else {
  mic.hidden = false;
  recognition.interimResults = true;
  recognition.continuous = false;
  let listening = false;
  const setListening = (on: boolean) => {
    listening = on;
    mic.classList.toggle('is-listening', on);
    micLabel.textContent = on ? 'Listening… tap to stop' : 'Speak';
  };
  recognition.onresult = (e) => {
    const r = e.results[e.resultIndex]!;
    input.value = r[0].transcript;
    input.classList.toggle('is-interim', !r.isFinal);
    if (r.isFinal) add(r[0].transcript);
  };
  recognition.onend = () => setListening(false);
  recognition.onerror = (e) => {
    setListening(false);
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
      noSpeech.textContent = 'Allow the microphone to speak an ingredient. Typing works too.';
      noSpeech.hidden = false;
    }
  };
  mic.addEventListener('click', () => {
    if (listening) return recognition.stop();
    noSpeech.hidden = true;
    setListening(true);
    recognition.start();
  });
}
