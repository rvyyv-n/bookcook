import type { SVGProps } from 'react';

/** Stroke icons drawn on a 24px grid. Icons are always paired with a visible text label. */
const PATHS = {
  mic: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z M5 11a7 7 0 0 0 14 0 M12 18v3 M8.5 21h7',
  keyboard:
    'M3 7.5A1.5 1.5 0 0 1 4.5 6h15A1.5 1.5 0 0 1 21 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 16.5Z M7 10h.01 M11 10h.01 M15 10h.01 M7 14h10',
  clipboard:
    'M9 4h6v3H9Z M9 5.5H6.5A1.5 1.5 0 0 0 5 7v12.5A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V7a1.5 1.5 0 0 0-1.5-1.5H15 M9 12h6 M9 16h4',
  link: 'M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1 M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1',
  plus: 'M12 5v14 M5 12h14',
  minus: 'M5 12h14',
  book: 'M12 6.5C10.5 5 8 4.5 4 4.5v13c4 0 6.5.5 8 2 1.5-1.5 4-2 8-2v-13c-4 0-6.5.5-8 2Z M12 6.5v13',
  basket: 'M4 9h16l-1.6 9.1A1.5 1.5 0 0 1 16.9 19.5H7.1a1.5 1.5 0 0 1-1.5-1.4Z M8 9l3-5 M16 9l-3-5 M9.5 13v3 M14.5 13v3',
  wish: 'M12 20s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 10c0 5.65-7 10-7 10Z',
  settings: 'M4 7h9 M17 7h3 M4 17h3 M11 17h9 M15 5v4 M9 15v4',
  search: 'M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13Z M15.5 15.5 20 20',
  back: 'M19 12H5 M11 6l-6 6 6 6',
  forward: 'M5 12h14 M13 6l6 6-6 6',
  chevronRight: 'M9 6l6 6-6 6',
  chevronDown: 'M6 9l6 6 6-6',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M12 7v5l3 2',
  users: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z M3 20a6 6 0 0 1 12 0 M16 4.5a3.5 3.5 0 0 1 0 6.5 M18 14.5A6 6 0 0 1 21 20',
  timer: 'M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z M12 9v4l2.5 1.5 M9.5 2.5h5',
  play: 'M7 4.5v15l12-7.5Z',
  pause: 'M8 5v14 M16 5v14',
  stop: 'M6 6h12v12H6Z',
  check: 'M5 12.5l4.5 4.5L19 7',
  close: 'M6 6l12 12 M18 6 6 18',
  trash: 'M4 7h16 M9 7V4.5h6V7 M6.5 7l1 13h9l1-13 M10 11v5 M14 11v5',
  edit: 'M4 20h4L19 9l-4-4L4 16Z M13.5 6.5l4 4',
  share: 'M12 15V3 M8 7l4-4 4 4 M5 12v7.5A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V12',
  print: 'M7 9V3h10v6 M7 18H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2 M7 14h10v7H7Z',
  fork: 'M6 3v6a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V3 M12 12v9',
  cartAdd: 'M3 4h2l2.2 10.5a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.2L20 8H6 M9 20.5h.01 M17 20.5h.01 M13 9.5v4 M11 11.5h4',
  camera:
    'M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.5-2.5h6L16.5 7h2A1.5 1.5 0 0 1 20 8.5v10a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5Z M12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z',
  image:
    'M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5Z M4 16l4.5-4.5 4 4 2.5-2.5L20 17 M15.5 9h.01',
  grip: 'M9 6h.01 M15 6h.01 M9 12h.01 M15 12h.01 M9 18h.01 M15 18h.01',
  undo: 'M9 14 4 9l5-5 M4 9h10.5a5.5 5.5 0 0 1 0 11H11',
  speaker: 'M4 9.5v5h3.5L12 19V5L7.5 9.5Z M16 9a4 4 0 0 1 0 6 M18.5 6.5a7.5 7.5 0 0 1 0 11',
  speakerOff: 'M4 9.5v5h3.5L12 19V5L7.5 9.5Z M16 9.5l5 5 M21 9.5l-5 5',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z M12 2v2 M12 20v2 M4.9 4.9l1.4 1.4 M17.7 17.7l1.4 1.4 M2 12h2 M20 12h2 M4.9 19.1l1.4-1.4 M17.7 6.3l1.4-1.4',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z',
  list: 'M9 6h11 M9 12h11 M9 18h11 M4.5 6h.01 M4.5 12h.01 M4.5 18h.01',
  flame:
    'M12 21c3.9 0 7-2.8 7-6.7 0-3.3-2.2-5.3-3.6-7.3-.4 1.8-1.4 3-2.9 3.5.3-3-1.2-5.8-3.5-7.5.1 3-1.6 5.3-3.1 7.1A7 7 0 0 0 5 14.3C5 18.2 8.1 21 12 21Z',
  star: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8 6.8 19.6l1-5.8-4.3-4.1 5.9-.9Z',
  download: 'M12 3v12 M7 10l5 5 5-5 M5 21h14',
  upload: 'M12 21V9 M7 14l5-5 5 5 M5 3h14',
  tag: 'M3.5 12.3V4.5a1 1 0 0 1 1-1h7.8l8.2 8.2a1.5 1.5 0 0 1 0 2.1l-6.2 6.2a1.5 1.5 0 0 1-2.1 0Z M8 8h.01',
  folder: 'M3 7a1.5 1.5 0 0 1 1.5-1.5h4.3l2 2h8.7A1.5 1.5 0 0 1 21 9v9.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5Z',
  quote:
    'M9.5 8H6a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h3v1.5A2.5 2.5 0 0 1 6.5 18 M19.5 8H16a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h3v1.5a2.5 2.5 0 0 1-2.5 2.5',
  sparkle: 'M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6Z M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8Z',
  help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6 M12 17h.01',
  more: 'M5 12h.01 M12 12h.01 M19 12h.01',
  sort: 'M7 4v16 M4 7l3-3 3 3 M17 20V4 M14 17l3 3 3-3',
  lock: 'M6 11h12v9H6Z M8.5 11V8a3.5 3.5 0 0 1 7 0v3',
  wave: 'M3 12h2 M7 8v8 M11 5v14 M15 9v6 M19 11v2',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  size = 24,
  strokeWidth = 1.9,
  ...rest
}: { name: IconName; size?: number | string; strokeWidth?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
