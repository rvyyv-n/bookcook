import { useCallback, useRef, useState, type CSSProperties, type PointerEvent } from 'react';

interface Drag {
  from: number;
  to: number;
  dy: number;
  height: number;
}

/** Movement (px) before a press on the handle becomes a drag rather than a tap. */
const SLOP = 6;

/**
 * Drag to reorder a vertical list by its handles. A tap on a handle stays a tap (it opens the Move
 * menu, so there's always a way without dragging). While dragging, the row follows the pointer and
 * the rows it passes slide out of its way; letting go calls `onMove(from, to)`.
 */
export function useReorder(onMove: (from: number, to: number) => void) {
  const rows = useRef<(HTMLElement | null)[]>([]);
  const [drag, setDrag] = useState<Drag | null>(null);
  const latest = useRef<Drag | null>(null);
  const press = useRef<{ index: number; y: number; rects: DOMRect[]; moved: boolean } | null>(null);
  const tapped = useRef(true);

  const set = (d: Drag | null) => {
    latest.current = d;
    setDrag(d);
  };

  const rowRef = useCallback(
    (index: number) => (el: HTMLElement | null) => {
      rows.current[index] = el;
    },
    [],
  );

  const handleProps = (index: number) => ({
    onPointerDown(e: PointerEvent<HTMLElement>) {
      if (e.button !== 0) return;
      tapped.current = true;
      press.current = { index, y: e.clientY, rects: rows.current.map((r) => r?.getBoundingClientRect() ?? new DOMRect()), moved: false };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerMove(e: PointerEvent<HTMLElement>) {
      const p = press.current;
      if (!p) return;
      const dy = e.clientY - p.y;
      if (!p.moved && Math.abs(dy) < SLOP) return;
      p.moved = true;
      tapped.current = false;
      const own = p.rects[p.index]!;
      const centre = own.top + own.height / 2 + dy;
      // The new position: how many of the other rows now sit above the dragged row's centre.
      let to = 0;
      p.rects.forEach((r, i) => {
        if (i !== p.index && r.top + r.height / 2 < centre) to++;
      });
      set({ from: p.index, to, dy, height: own.height });
    },
    onPointerUp() {
      const d = latest.current;
      press.current = null;
      set(null);
      if (d && d.to !== d.from) onMove(d.from, d.to);
    },
    onPointerCancel() {
      press.current = null;
      set(null);
    },
    style: { touchAction: 'none' } as CSSProperties,
  });

  /** Whether the click that ends a press was a tap (not the end of a drag). */
  const wasTap = () => tapped.current;

  /** Where each row sits while another is dragged past it. */
  const rowStyle = (index: number): CSSProperties | undefined => {
    if (!drag) return undefined;
    if (index === drag.from) return { transform: `translateY(${drag.dy}px) rotate(-0.6deg)`, position: 'relative', zIndex: 10 };
    const shift =
      drag.from < drag.to && index > drag.from && index <= drag.to
        ? -drag.height
        : drag.to < drag.from && index >= drag.to && index < drag.from
          ? drag.height
          : 0;
    return { transform: `translateY(${shift}px)`, transition: 'transform var(--dur) var(--ease-out)' };
  };

  return { rowRef, handleProps, rowStyle, dragging: drag?.from, wasTap };
}
