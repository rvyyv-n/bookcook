/**
 * Cook mode, for real: Mom's five steps with ingredient mentions and durations found by the app's
 * parser. Tap a time to start a timer (several can run at once), Read says the step aloud, and in
 * Chrome and Edge it listens for "next", "back", "repeat", "timer" and "stop".
 */
import { segmentStep } from '../../src/lib/parse/segments';
import { formatClock, spokenDuration } from '../../src/lib/parse/timers';
import { ingredients, steps } from './biryani';
import { escape } from './recipe-view';
import { chime, icon, makeRecognition, say } from './site';

type Command = 'next' | 'back' | 'repeat' | 'timer' | 'stop';

export function cookMode() {
  const stepEl = document.getElementById('step')!;
  const countEl = document.getElementById('step-count')!;
  const progress = document.getElementById('progress')!;
  const timersEl = document.getElementById('timers')!;
  const backBtn = document.getElementById('back') as HTMLButtonElement;
  const nextBtn = document.getElementById('next') as HTMLButtonElement;
  const readBtn = document.getElementById('read') as HTMLButtonElement;
  const readLabel = document.getElementById('read-label')!;

  const segments = steps.map((s) => segmentStep(s, ingredients));
  progress.innerHTML = steps.map(() => '<span></span>').join('');
  let current = 0;

  // ---------- Timers, each named after its step's first ingredient ----------

  interface Timer {
    seconds: number;
    ends: number;
    el: HTMLLIElement;
    done: boolean;
  }
  const timers = new Map<number, Timer>();

  const timerName = (step: number) => {
    const word = segments[step]!.find((s) => s.ingredientId)?.text ?? `Step ${step + 1}`;
    return word[0]!.toUpperCase() + word.slice(1);
  };

  const startTimer = (step: number) => {
    const seconds = segments[step]!.find((s) => s.duration)?.duration?.seconds;
    if (!seconds || timers.has(step)) return;
    const el = document.createElement('li');
    el.className = 'timer';
    el.innerHTML =
      `<span class="timer-ring">${icon('timer')}</span>` +
      `<span class="timer-text"><span class="timer-name">${escape(timerName(step))}</span><span class="timer-clock" role="timer"></span></span>` +
      `<button type="button" class="timer-stop">Stop</button>`;
    el.querySelector('button')!.addEventListener('click', () => stopTimer(step));
    timers.set(step, { seconds, ends: Date.now() + seconds * 1000, el, done: false });
    timersEl.append(el);
    render(current, null);
  };

  const stopTimer = (step: number) => {
    timers.get(step)?.el.remove();
    timers.delete(step);
    render(current, null);
  };

  const tick = () => {
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
    // While its timer runs, the time in the step counts down too, as it does in the app.
    const t = timers.get(current);
    stepEl.querySelectorAll<HTMLElement>('.time-left').forEach((el) => {
      if (t) el.textContent = t.done ? 'done' : `${formatClock((t.ends - now) / 1000)} left`;
    });
  };
  setInterval(tick, 250);

  // ---------- The step ----------

  const render = (i: number, direction: 'next' | 'back' | null) => {
    current = i;
    countEl.textContent = `Step ${i + 1} of ${steps.length}`;
    [...progress.children].forEach((bar, n) => bar.classList.toggle('is-done', n <= i));
    const running = timers.has(i);
    stepEl.innerHTML = segments[i]!.map((seg) => {
      if (seg.duration) {
        const label = running ? '<span class="time-left"></span>' : escape(seg.text);
        const aria = running ? 'Timer running' : `Start a ${escape(seg.text)} timer`;
        return `<button type="button" class="time" aria-pressed="${running}" aria-label="${aria}">${icon('timer')}${label}</button>`;
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
  };

  // ---------- Read ----------

  let reading = false;
  const setReading = (on: boolean) => {
    reading = on;
    readLabel.textContent = on ? 'Stop' : 'Read';
  };
  const stopReading = () => {
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    setReading(false);
  };
  const read = async () => {
    setReading(true);
    await say(steps[current]!);
    setReading(false);
  };
  if (!('speechSynthesis' in window)) readBtn.hidden = true;

  const go = (delta: 1 | -1) => {
    const i = current + delta;
    if (i < 0 || i >= steps.length) return;
    stopReading();
    render(i, delta === 1 ? 'next' : 'back');
    if (listening) void read();
  };

  // ---------- Commands, tapped or said ----------

  const cmdButtons = [...document.querySelectorAll<HTMLButtonElement>('.cmd')];
  const run = (cmd: Command) => {
    const btn = cmdButtons.find((b) => b.dataset.cmd === cmd);
    if (btn) {
      btn.classList.add('is-heard');
      setTimeout(() => btn.classList.remove('is-heard'), 650);
    }
    if (cmd === 'next') go(1);
    else if (cmd === 'back') go(-1);
    else if (cmd === 'repeat') void read();
    else if (cmd === 'timer') startTimer(current);
    else stopReading();
  };
  cmdButtons.forEach((b) => b.addEventListener('click', () => run(b.dataset.cmd as Command)));

  backBtn.addEventListener('click', () => go(-1));
  nextBtn.addEventListener('click', () => go(1));
  readBtn.addEventListener('click', () => (reading ? stopReading() : void read()));

  // Arrow keys step through while cook mode fills the screen.
  document.addEventListener('keydown', (e) => {
    if (document.documentElement.dataset.bg !== 'field' || e.altKey || e.ctrlKey || e.metaKey) return;
    if ((e.target as HTMLElement).closest('input, textarea')) return;
    if (e.key === 'ArrowRight') go(1);
    else if (e.key === 'ArrowLeft') go(-1);
    else return;
    e.preventDefault();
  });

  render(0, null);

  // ---------- Listening ----------

  const listenBtn = document.getElementById('listen') as HTMLButtonElement;
  const listenLabel = document.getElementById('listen-label')!;
  const note = document.getElementById('cook-note')!;
  const recognition = makeRecognition();
  let listening = false;
  if (!recognition) {
    note.hidden = false;
    return;
  }
  listenBtn.hidden = false;
  recognition.continuous = true;
  recognition.interimResults = false;
  const setListening = (on: boolean) => {
    listening = on;
    listenBtn.setAttribute('aria-pressed', String(on));
    listenLabel.textContent = on ? 'Listening. Tap to stop' : 'Turn on listening';
  };
  recognition.onresult = (e) => {
    const heard = e.results[e.resultIndex]![0].transcript.toLowerCase();
    const word = /\b(next|back|repeat|timer|stop)\b/.exec(heard)?.[1] as Command | undefined;
    if (word) run(word);
  };
  // Browsers end a session after a while; keep listening until it's turned off.
  recognition.onend = () => {
    if (listening) recognition.start();
  };
  recognition.onerror = (e) => {
    if (e.error === 'no-speech' || e.error === 'aborted') return;
    setListening(false);
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
      note.textContent = 'Allow the microphone and Bookcook can hear these words.';
      note.hidden = false;
    }
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
