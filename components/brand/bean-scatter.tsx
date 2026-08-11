/**
 * Scattered coffee-bean motif. The brand document floats beans around every
 * spread; here they are used sparingly as brand artwork on large dark panels.
 *
 * Each bean is its own fixed-size SVG positioned as a percentage of the
 * container, rather than one stretched viewBox — a single scaled viewBox
 * distorts badly on tall or wide panels and blows the bean's centre crease
 * up into a thick smear. Purely presentational; ignores pointer events.
 */

interface BeanSpec {
  /** Position as a percentage of the container. */
  x: number
  y: number
  /** Rendered height in px. */
  size: number
  rotate: number
  opacity: number
}

const BEANS: BeanSpec[] = [
  { x: 14, y: 16, size: 44, rotate: -24, opacity: 0.9 },
  { x: 74, y: 9, size: 30, rotate: 16, opacity: 0.7 },
  { x: 88, y: 47, size: 52, rotate: -9, opacity: 0.8 },
  { x: 31, y: 63, size: 34, rotate: 38, opacity: 0.6 },
  { x: 62, y: 84, size: 40, rotate: -34, opacity: 0.7 },
  { x: 6, y: 88, size: 28, rotate: 52, opacity: 0.55 },
]

export function BeanScatter({
  className = '',
  count = BEANS.length,
}: {
  className?: string
  count?: number
}) {
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {BEANS.slice(0, count).map((bean, i) => (
        <svg
          key={i}
          viewBox="0 0 124 192"
          style={{
            position: 'absolute',
            left: `${bean.x}%`,
            top: `${bean.y}%`,
            height: bean.size,
            width: 'auto',
            opacity: bean.opacity,
            transform: `translate(-50%, -50%) rotate(${bean.rotate}deg)`,
          }}
        >
          {/* The crease is knocked out as negative space, exactly as it is in
              the brand mark — a stroked line on top would not read against a
              translucent bean body. Ids are stable per index; a second
              scatter on the same page would reuse an identical mask. */}
          <mask id={`ss-bean-crease-${i}`}>
            <rect x="0" y="0" width="124" height="192" fill="white" />
            <path
              d="M80 14C56 44 84 66 58 92C34 116 60 138 40 176"
              fill="none"
              stroke="black"
              strokeWidth="9"
              strokeLinecap="round"
            />
          </mask>
          <path
            d="M62 2C96 2 122 42 122 96C122 150 96 190 62 190C28 190 2 150 2 96C2 42 28 2 62 2Z"
            fill="currentColor"
            mask={`url(#ss-bean-crease-${i})`}
          />
        </svg>
      ))}
    </div>
  )
}
