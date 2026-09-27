import { useEffect, useRef, useState } from 'react';
import { Button as AriaButton } from 'react-aria-components';
import { useMediaUrl } from '../db/hooks';
import { formatClock } from '../lib/parse/timers';
import { cx } from './cx';
import { Icon } from './Icon';

/**
 * The voice-note player: a pill with an accent play disc. Idle it reads "Play · 0:48"; playing, it
 * reads "Pause" with a progress bar and "0:12 / 0:48". The labels always stay.
 */
export function AudioPlayer({
  id,
  playLabel,
  pauseLabel,
  label,
  compact = false,
  className,
}: {
  id: string;
  playLabel: string;
  pauseLabel: string;
  /** Accessible name, e.g. "Voice note 1". */
  label: string;
  /** Just the length ("0:48") while idle, for the desktop story card. */
  compact?: boolean;
  className?: string;
}) {
  const url = useMediaUrl(id);
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    const onTime = () => setTime(a.currentTime);
    const onMeta = () => Number.isFinite(a.duration) && setDuration(a.duration);
    const onEnd = () => setPlaying(false);
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('loadedmetadata', onMeta);
    a.addEventListener('durationchange', onMeta);
    a.addEventListener('ended', onEnd);
    return () => {
      a.removeEventListener('timeupdate', onTime);
      a.removeEventListener('loadedmetadata', onMeta);
      a.removeEventListener('durationchange', onMeta);
      a.removeEventListener('ended', onEnd);
    };
  }, [url]);

  const progress = duration ? Math.min(1, time / duration) : 0;
  const length = duration ? formatClock(duration) : '';
  const word = playing ? pauseLabel : playLabel;
  return (
    <div className={cx('flex flex-wrap items-center gap-3', className)}>
      <audio ref={audio} src={url} preload="metadata" />
      <AriaButton
        isDisabled={!url}
        aria-label={`${word}: ${label}`}
        onPress={() => {
          const a = audio.current;
          if (!a) return;
          if (playing) {
            a.pause();
            setPlaying(false);
          } else {
            void a.play();
            setPlaying(true);
          }
        }}
        className={cx(
          'inline-flex min-h-14 items-center gap-2.5 rounded-full bg-(--control-fill) py-1.5 pr-[1.2rem] pl-[.5rem] font-bold text-ink',
          'shadow-[inset_0_0_0_var(--control-border)_var(--line-strong)] transition-colors duration-(--dur) data-[hovered]:bg-(--control-fill-hover)',
        )}
      >
        <span className="grid size-[2.3rem] shrink-0 place-items-center rounded-full bg-accent text-accent-ink">
          <Icon name={playing ? 'pause' : 'play'} size="1.1rem" filled />
        </span>
        {playing ? word : compact ? length || word : [word, length].filter(Boolean).join(' · ')}
      </AriaButton>
      {playing && (
        <div className="flex min-w-32 flex-1 items-center gap-3" aria-hidden>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-accent-mark transition-[width] duration-200" style={{ width: `${progress * 100}%` }} />
          </div>
          <span className="text-sm text-ink-muted tabular-nums">
            {formatClock(time)} / {length}
          </span>
        </div>
      )}
    </div>
  );
}
