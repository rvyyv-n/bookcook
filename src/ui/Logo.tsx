import { BOX, MARKS, PAD, pixels, type LogoVariant } from './logoMarks';

/** The mark, decorative (it always sits next to the wordmark). */
export function Logo({ variant, className }: { variant: LogoVariant; className?: string }) {
  return (
    <svg viewBox={`${-PAD} ${-PAD} ${BOX} ${BOX}`} shapeRendering="crispEdges" aria-hidden="true" focusable="false" className={className}>
      <rect x={-PAD} y={-PAD} width={BOX} height={BOX} rx={BOX * 0.24} fill={MARKS[variant].tile} shapeRendering="geometricPrecision" />
      {pixels(variant).map((p) => (
        <rect key={`${p.x},${p.y}`} x={p.x} y={p.y} width={1.03} height={1.03} fill={p.fill} />
      ))}
    </svg>
  );
}
