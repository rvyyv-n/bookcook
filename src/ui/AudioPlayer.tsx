import { useEffect, useRef, useState } from 'react';
import { Button as AriaButton } from 'react-aria-components';
import { useMediaUrl } from '../db/hooks';
import { formatClock } from '../lib/parse/timers';
import { cx } from './cx';
import { Icon } from './Icon';

/** A voice-note player: one big labelled play/pause button with progress. */
export function AudioPlayer({ id, label, className }: { id: string; label: string; className?: string }) {
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
  return (
    <div className={cx('flex items-center gap-3', className)}>
      <audio ref={audio} src={url} preload="metadata" />
      <AriaButton
        isDisabled={!url}
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
        className="inline-flex min-h-14 items-center gap-3 rounded-full bg-ink py-2 pr-5 pl-2 font-bold text-paper outline-none data-[focus-visible]:outline-3 data-[focus-visible]:outline-offset-2 data-[focus-visible]:outline-(--focus)"
      >
        <span className="grid size-10 place-items-center rounded-full bg-accent text-accent-ink">
          <Icon name={playing ? 'pause' : 'play'} size={20} strokeWidth={2.4} />
        </span>
        {label}
      </AriaButton>
      <div className="flex min-w-24 flex-1 items-center gap-3" aria-hidden>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-ink transition-[width] duration-200" style={{ width: `${progress * 100}%` }} />
        </div>
        <span className="text-sm text-ink-muted tabular-nums">{formatClock(duration ? duration - time : 0)}</span>
      </div>
    </div>
  );
}
