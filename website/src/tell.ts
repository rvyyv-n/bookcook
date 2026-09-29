/**
 * Tell it: say or type an ingredient and watch the app's parser split it into amount, ingredient and
 * note as you go, then add it to Mom's recipe.
 */
import { parseIngredient } from '../../src/lib/parse/ingredient';
import type { ParsedIngredient } from '../../src/lib/parse/types';
import { ingredients } from './biryani';
import { columns, escape } from './recipe-view';
import { makeRecognition, reducedMotion } from './site';

export function tellIt() {
  const form = document.getElementById('say') as HTMLFormElement;
  const input = document.getElementById('say-input') as HTMLInputElement;
  const rows = document.getElementById('rows')!;
  const tries = [...document.querySelectorAll<HTMLButtonElement>('.try')];
  const tiles = {
    amount: document.getElementById('hear-amount')!,
    name: document.getElementById('hear-name')!,
    note: document.getElementById('hear-note')!,
  };

  // ---------- What Bookcook hears, live ----------

  // A tile warms while its value is changing and cools once it settles, so typing never makes it flicker.
  const cooling = new WeakMap<HTMLElement, number>();
  const glow = (tile: HTMLElement) => {
    tile.classList.add('is-changed');
    clearTimeout(cooling.get(tile));
    cooling.set(
      tile,
      window.setTimeout(() => tile.classList.remove('is-changed'), 650),
    );
  };

  const hear = () => {
    const typed = input.value.trim();
    const parsed = columns(parseIngredient(typed || input.placeholder));
    for (const key of ['amount', 'name', 'note'] as const) {
      const el = tiles[key];
      const value = parsed[key] || '—';
      el.classList.toggle('is-empty', !typed || !parsed[key]);
      if (el.textContent === value) continue;
      el.textContent = value;
      if (typed) glow(el.parentElement!);
    }
  };
  input.addEventListener('input', hear);
  hear();

  // ---------- Mom's recipe, so far ----------

  const MAX_ROWS = 6;
  const addRow = (ing: ParsedIngredient, isNew: boolean) => {
    const { amount, name, note } = columns(ing);
    rows.querySelector('.is-new')?.classList.remove('is-new');
    const li = document.createElement('li');
    if (isNew) li.className = 'is-new';
    li.innerHTML =
      `<span class="amount">${escape(amount)}</span>` +
      `<span>${escape(name)}${note ? `<span class="note">, ${escape(note)}</span>` : ''}</span>`;
    rows.append(li);
    while (rows.children.length > MAX_ROWS) rows.firstElementChild!.remove();
  };
  ingredients.slice(0, 2).forEach((ing) => addRow(ing, false));

  const add = (text: string) => {
    const said = text.trim();
    if (!said) return;
    const ing = parseIngredient(said);
    if (!ing.name) return;
    addRow(ing, true);
    input.value = '';
    input.classList.remove('is-interim');
    hear();
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    add(input.value);
  });

  // The examples are "said" into the line a few letters at a time, then written down.
  tries.forEach((btn) =>
    btn.addEventListener('click', () => {
      const text = btn.textContent!.trim();
      if (reducedMotion()) {
        input.value = text;
        hear();
        return add(text);
      }
      tries.forEach((b) => (b.disabled = true));
      input.value = '';
      input.classList.add('is-interim');
      let i = 0;
      const tick = setInterval(() => {
        i += 2;
        input.value = text.slice(0, i);
        hear();
        if (i < text.length) return;
        clearInterval(tick);
        input.classList.remove('is-interim');
        setTimeout(() => {
          add(text);
          tries.forEach((b) => (b.disabled = false));
        }, 700);
      }, 50);
    }),
  );

  // ---------- Speak, where the browser can hear ----------

  const mic = document.getElementById('mic') as HTMLButtonElement;
  const micLabel = document.getElementById('mic-label')!;
  const noSpeech = document.getElementById('no-speech')!;
  const recognition = makeRecognition();
  if (!recognition) {
    noSpeech.hidden = false;
    return;
  }
  mic.hidden = false;
  recognition.interimResults = true;
  recognition.continuous = false;
  let listening = false;
  const setListening = (on: boolean) => {
    listening = on;
    mic.setAttribute('aria-pressed', String(on));
    micLabel.textContent = on ? 'Listening… tap to stop' : 'Speak';
  };
  recognition.onresult = (e) => {
    const r = e.results[e.resultIndex]!;
    input.value = r[0].transcript;
    input.classList.toggle('is-interim', !r.isFinal);
    hear();
    if (r.isFinal) setTimeout(() => add(r[0].transcript), 600);
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
