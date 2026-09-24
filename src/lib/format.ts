import { formatDuration } from './parse/timers';

/** 105 → "1 hr 45 min". */
export function formatMinutes(min: number | undefined): string | undefined {
  if (!min) return undefined;
  return formatDuration(min * 60);
}

export function totalMinutes(r: { prepMinutes?: number; cookMinutes?: number }): number | undefined {
  const t = (r.prepMinutes ?? 0) + (r.cookMinutes ?? 0);
  return t || undefined;
}

/** "2 days ago", "yesterday", "just now". */
export function relativeTime(ts: number, now = Date.now(), lang = 'en'): string {
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
  const diff = (ts - now) / 1000;
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(0, 'second');
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
  if (abs < 86_400) return rtf.format(Math.round(diff / 3600), 'hour');
  if (abs < 86_400 * 30) return rtf.format(Math.round(diff / 86_400), 'day');
  if (abs < 86_400 * 365) return rtf.format(Math.round(diff / (86_400 * 30)), 'month');
  return rtf.format(Math.round(diff / (86_400 * 365)), 'year');
}

export function formatDate(ts: number, lang = 'en'): string {
  return new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'long', year: 'numeric' }).format(ts);
}
