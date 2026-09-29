/**
 * The opening: the headline is heard word by word, then Mom's recipe card writes itself from what she
 * says. Her words are the real transcript of the example recipe (src/features/library/examples.ts), and
 * each ingredient is read by the app's own parser.
 */
import { parseIngredient } from '../../src/lib/parse/ingredient';
import { findDurations, formatDuration } from '../../src/lib/parse/timers';
import { columns, escape } from './recipe-view';
import { reducedMotion } from './site';

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ---------- The headline ----------

export async function hearHeadline(): Promise<void> {
  const heard = document.getElementById('heard')!;
  const title = document.getElementById('hero-title')!;
  if (reducedMotion()) {
    heard.classList.add('is-written');
    return;
  }
  const words = title.textContent!.trim().split(/\s+/);
  title.innerHTML = words.map((w) => `<span class="tw is-waiting">${w}</span>`).join(' ');
  const spans = [...title.querySelectorAll<HTMLElement>('.tw')];
  const caret = document.createElement('span');
  caret.className = 'caret';
  caret.setAttribute('aria-hidden', 'true');

  await wait(450);
  for (const [i, span] of spans.entries()) {
    span.classList.replace('is-waiting', 'is-heard');
    span.after(caret);
    // Words settle a beat behind, as a recogniser firms up its guess.
    spans[i - 2]?.classList.remove('is-heard');
    await wait(240);
  }
  await wait(380);
  spans.forEach((s) => s.classList.remove('is-heard'));
  caret.remove();
  heard.classList.add('is-written');
}

// ---------- Mom's card ----------

type Mark = 'chicken' | 'yogurt' | 'chilli' | 'haldi' | 'salt' | 'timer';

/** What she says, and which parts Bookcook picks out. */
const SAID: [string, Mark?][] = [
  ['okay so first you take'],
  ['the chicken, about a kilo,', 'chicken'],
  ['and put'],
  ['the yogurt, maybe a cup,', 'yogurt'],
  ['and then the masala, you know,'],
  ['the red chilli,', 'chilli'],
  ['haldi,', 'haldi'],
  ['a little salt…', 'salt'],
  ['and leave it,'],
  ['at least half an hour.', 'timer'],
];

/** How the app reads each part once it has sorted her words. */
const ROWS: Record<Exclude<Mark, 'timer'>, { line: string; check?: string }> = {
  chicken: { line: 'about a kilo of chicken' },
  yogurt: { line: 'maybe a cup of yogurt' },
  chilli: { line: 'the red chilli' },
  haldi: { line: 'haldi', check: 'Check this · heard “haldi”' },
  salt: { line: 'a little salt' },
};

function rowHtml(mark: Exclude<Mark, 'timer'>) {
  const { line, check } = ROWS[mark];
  const { amount, name, note } = columns(parseIngredient(line));
  const checkTag = check ? `<span class="check">${escape(check)}</span>` : '';
  return `<span class="amount">${escape(amount)}</span><span>${escape(name)}${note ? `, ${escape(note)}` : ''}${checkTag}</span>`;
}

export function momsCard() {
  const deck = document.querySelector<HTMLElement>('.deck')!;
  const transcript = document.getElementById('transcript')!;
  const rows = document.getElementById('hero-rows')!;
  const timer = document.getElementById('hero-timer')!;
  const status = document.getElementById('rc-status')!;
  const wave = document.getElementById('wave')!;
  const replay = document.getElementById('replay') as HTMLButtonElement;

  const halfHour = findDurations('at least half an hour')[0]!;
  timer.lastChild!.textContent = formatDuration(halfHour.seconds);

  wave.innerHTML = Array.from({ length: 18 }, (_, i) => `<i style="--i:${i};--h:${(0.35 + ((i * 37) % 60) / 100).toFixed(2)}"></i>`).join(
    '',
  );

  // Every word is laid out from the start, so the card never jumps as she talks.
  transcript.innerHTML = SAID.map(([text, mark]) => {
    const words = text
      .split(' ')
      .map((w) => `<span class="tw">${escape(w)}</span>`)
      .join(' ');
    return mark ? `<span class="hl" data-mark="${mark}">${words}</span>` : words;
  }).join(' ');
  const words = [...transcript.querySelectorAll<HTMLElement>('.tw')];

  const finish = () => {
    words.forEach((w) => w.classList.add('is-said'));
    transcript.querySelectorAll('.hl').forEach((h) => h.classList.add('is-lit'));
    rows.innerHTML = (Object.keys(ROWS) as (keyof typeof ROWS)[]).map((m) => `<li>${rowHtml(m)}</li>`).join('');
    rows.querySelectorAll('li').forEach((li) => (li.style.animation = 'none'));
    timer.classList.add('is-on');
    wave.classList.remove('is-speaking');
    status.textContent = 'Written down. Check it next.';
  };

  let run = 0;
  const play = async () => {
    const me = ++run;
    const alive = () => me === run;
    replay.hidden = true;
    rows.innerHTML = '';
    timer.classList.remove('is-on');
    words.forEach((w) => w.classList.remove('is-said'));
    transcript.querySelectorAll('.hl').forEach((h) => h.classList.remove('is-lit'));
    status.textContent = 'Mom is telling it';
    wave.classList.add('is-speaking');

    for (const w of words) {
      if (!alive()) return;
      w.classList.add('is-said');
      const hl = w.parentElement!.classList.contains('hl') ? w.parentElement! : null;
      const lastOfMark = hl && hl.lastElementChild === w;
      await wait(/[,….]$/.test(w.textContent!) ? 260 : 105);
      if (lastOfMark && alive()) {
        hl.classList.add('is-lit');
        const mark = hl.dataset.mark as Mark;
        await wait(260);
        if (mark === 'timer') timer.classList.add('is-on');
        else rows.insertAdjacentHTML('beforeend', `<li>${rowHtml(mark)}</li>`);
      }
    }
    if (!alive()) return;
    wave.classList.remove('is-speaking');
    await wait(500);
    status.textContent = 'Written down. Check it next.';
    replay.hidden = false;
  };

  replay.addEventListener('click', () => void play());

  return {
    deal() {
      deck.classList.remove('is-waiting');
    },
    start() {
      if (reducedMotion()) return finish();
      void play();
    },
  };
}
