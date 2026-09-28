let ctx: AudioContext | undefined;

/** A soft two-note chime for a finished timer, made on the fly (no sound file to load). */
export function chime(): void {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') {
      void ctx.resume();
      // After a reload the browser holds sound back until the page is touched; start it then.
      const audio = ctx;
      const wake = () => void audio.resume();
      window.addEventListener('pointerdown', wake, { once: true });
      window.addEventListener('keydown', wake, { once: true });
    }
    const start = ctx.currentTime;
    for (const [freq, delay] of [
      [659.25, 0],
      [880, 0.22],
    ] as const) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = start + delay;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 1.2);
    }
  } catch {
    // No Web Audio: the alert is still shown and spoken.
  }
}
