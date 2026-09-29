import { segmentStep } from '../../src/lib/parse/segments';
import { formatClock, spokenDuration } from '../../src/lib/parse/timers';
import { ingredients, steps } from '../src/biryani';
import { chime, drawIcons, followDeviceTheme, getbar, icon, makeRecognition, say } from '../src/site';

drawIcons();
followDeviceTheme();
getbar(document.getElementById('getbar')!, [document.querySelector('.get-open')!]);

const stepEl = document.getElementById('step')!;
const countEl = document.getElementById('step-count')!;
const progress = document.getElementById('progress')!;
const timersEl = document.getElementById('timers')!;
const backBtn = document.getElementById('back') as HTMLButtonElement;
const nextBtn = document.getElementById('next') as HTMLButtonElement;
const readBtn = document.getElementById('read') as HTMLButtonElement;
const readLabel = document.getElementById('read-label')!;

const names = ingredients.map((i) => ({ id: i.id, name: i.name }));
const segments = steps.map((s) => segmentStep(s, names));

progress.innerHTML = steps.map(() => '<span></span>').join('');

let current = 0;

function escape(s: string) {
  return s.replace(/[&<>"]/g, (c) => `&${{ '&': 'amp', '<': 'lt', '>': 'gt', '"': 'quot' }[c]};`);
}

// ---------- Timers: several at once, each named after the step's first ingredient ----------

interface Timer {
  step: number;
  seconds: number;
  ends: number;
  name: string;
  el: HTMLLIElement;
  done: boolean;
}
const timers = new Map<number, Timer>();

function timerName(step: number) {
  const first = segments[step]!.find((s) => s.ingredientId);
  const word = first?.text ?? `Step ${step + 1}`;
  return word[0]!.toUpperCase() + word.slice(1);
}

function startTimer(step: number) {
  if (timers.has(step)) return;
  const seg = segments[step]!.find((s) => s.duration);
  if (!seg?.duration) return;
  const seconds = seg.duration.seconds;
  const el = document.createElement('li');
  el.className = 'timer';
  const t: Timer = { step, seconds, ends: Date.now() + seconds * 1000, name: timerName(step), el, done: false };
  el.innerHTML =
    `<span class="timer-ring">${icon('timer')}</span>` +
    `<span class="timer-text"><span class="timer-name">${escape(t.name)}</span><span class="timer-clock" role="timer"></span></span>` +
    `<button type="button" class="timer-stop">Stop</button>`;
  el.querySelector('button')!.addEventListener('click', () => stopTimer(step));
  timers.set(step, t);
  timersEl.append(el);
  tick();
  render(current, null);
}

function stopTimer(step: number) {
  timers.get(step)?.el.remove();
  timers.delete(step);
  render(current, null);
}

function tick() {
  const now = Date.now();
  for (const t of timers.values()) {
    const left = Math.max(0, (t.ends - now) / 1000);
    t.el.querySelector<HTMLElement>('.timer-clock')!.textContent = t.done ? 'Done' : formatClock(left);
    t.el.querySelector<HTMLElement>('.timer-ring')!.style.setProperty('--p', String(((t.seconds - left) / t.seconds) * 100));
    if (!t.done && left <= 0) {
      t.done = true;
      t.el.classList.add('is-done');
      t.el.querySelector<HTMLElement>('.timer-ring')!.innerHTML = icon('alarm');
      t.el.querySelector('button')!.textContent = 'Dismiss';
      chime();
      void say(`Your ${spokenDuration(t.seconds)} timer is done.`);
    }
  }
  // The chip in the step shows the time left while its timer runs.
  stepEl.querySelectorAll<HTMLElement>('.time-left').forEach((el) => {
    const t = timers.get(current);
    if (t) el.textContent = t.done ? 'done' : `${formatClock((t.ends - now) / 1000)} left`;
  });
}
setInterval(tick, 250);

// ---------- The step ----------

function render(i: number, direction: 'next' | 'back' | null) {
  current = i;
  countEl.textContent = `Step ${i + 1} of ${steps.length}`;
  [...progress.children].forEach((bar, n) => bar.classList.toggle('is-done', n <= i));
  const running = timers.get(i);
  stepEl.innerHTML = segments[i]!.map((seg) => {
    if (seg.duration) {
      const label = running ? `<span class="time-left"></span>` : escape(seg.text);
      const aria = running ? 'Timer running' : `Start a ${escape(seg.text)} timer`;
      return `<button type="button" class="time" aria-pressed="${!!running}" aria-label="${aria}">${icon('timer')}${label}</button>`;
    }
    if (seg.ingredientId) return `<span class="mention">${escape(seg.text)}</span>`;
    return escape(seg.text);
  }).join('');
  stepEl.querySelector('.time')?.addEventListener('click', () => startTimer(current));
  if (direction) {
    stepEl.classList.remove('is-next', 'is-back');
    void stepEl.offsetWidth;
    stepEl.classList.add(`is-${direction}`);
  }
  backBtn.disabled = i === 0;
  nextBtn.disabled = i === steps.length - 1;
  tick();
}

function go(delta: 1 | -1) {
  const i = current + delta;
  if (i < 0 || i >= steps.length) return;
  stopReading();
  render(i, delta === 1 ? 'next' : 'back');
  if (listening) void read();
}

// ---------- Read ----------

let reading = false;
function stopReading() {
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  setReading(false);
}
function setReading(on: boolean) {
  reading = on;
  readLabel.textContent = on ? 'Stop' : 'Read';
}
async function read() {
  setReading(true);
  await say(steps[current]!);
  setReading(false);
}

backBtn.addEventListener('click', () => go(-1));
nextBtn.addEventListener('click', () => go(1));
readBtn.addEventListener('click', () => (reading ? stopReading() : void read()));
if (!('speechSynthesis' in window)) readBtn.hidden = true;

render(0, null);

// ---------- Listen for "next" ----------

const listenBtn = document.getElementById('listen') as HTMLButtonElement;
const listenLabel = document.getElementById('listen-label')!;
const note = document.getElementById('cook-note')!;
const recognition = makeRecognition();
let listening = false;

if (!recognition) {
  note.textContent = 'In Chrome and Edge, Bookcook also listens for “next” while you cook.';
} else {
  listenBtn.hidden = false;
  recognition.continuous = true;
  recognition.interimResults = false;
  const setListening = (on: boolean) => {
    listening = on;
    listenBtn.setAttribute('aria-pressed', String(on));
    listenLabel.textContent = on ? 'Listening' : 'Listen';
  };
  recognition.onresult = (e) => {
    const heard = e.results[e.resultIndex]![0].transcript.toLowerCase();
    const word = /\b(next|back|repeat|timer|stop)\b/.exec(heard)?.[1];
    if (word === 'next') go(1);
    else if (word === 'back') go(-1);
    else if (word === 'repeat') void read();
    else if (word === 'timer') startTimer(current);
    else if (word === 'stop') stopReading();
  };
  // Browsers end a recognition session after a while; keep listening until it's turned off.
  recognition.onend = () => {
    if (listening) recognition.start();
  };
  recognition.onerror = (e) => {
    if (e.error === 'no-speech' || e.error === 'aborted') return;
    setListening(false);
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed')
      note.textContent = 'Allow the microphone and Bookcook can hear “next”.';
  };
  listenBtn.addEventListener('click', () => {
    if (listening) {
      setListening(false);
      recognition.stop();
    } else {
      setListening(true);
      recognition.start();
    }
  });
}
