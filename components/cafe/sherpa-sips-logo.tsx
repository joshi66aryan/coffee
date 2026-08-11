import { useId } from 'react'

/**
 * Sherpa Sips brand mark.
 *
 * Per the brand guide the mark is a coffee bean containing the Everest
 * silhouette: a curved Sherpa trail splits the bean, connecting the fertile
 * green hills (lower land) to the snowy peak. Geometry below is fixed — the
 * mark must never be redrawn, stretched or recoloured outside these tones.
 *
 * Lockups follow the guide's variations page:
 *   icon        — brand mark alone (min 10mm / 35px tall)
 *   horizontal  — primary logo: mark + wordmark + tagline
 *   stacked     — secondary logo, for narrow spaces
 */

const BEAN = 'M100 4C152 4 186 56 186 130C186 204 152 256 100 256C48 256 14 204 14 130C14 56 48 4 100 4Z'
// The Sherpa trail: an S-curve crease running the height of the bean.
const TRAIL = 'M129 10C97 56 147 92 104 132C64 170 109 208 78 250'
// Fertile lower land — the 61.8% horizontal golden division of the mark.
const LAND = 'M8 152C58 182 88 174 122 196C150 214 172 208 192 192L192 264L8 264Z'
// Everest, flanked by lesser peaks.
const RANGE = 'M26 186L56 130L72 152L98 84L122 140L136 124L174 186Z'

type Variant = 'icon' | 'horizontal' | 'stacked'
type Tone = 'color' | 'mono' | 'inverse'

export function SherpaSipsLogo({
  variant = 'icon',
  tone = 'color',
  tagline = false,
  className = '',
}: {
  variant?: Variant
  tone?: Tone
  tagline?: boolean
  className?: string
}) {
  const uid = useId()
  const clipId = `ss-bean-${uid}`
  const maskId = `ss-mask-${uid}`

  // In `icon` mode the caller sizes the svg directly; in a lockup the svg
  // fills the lockup's height so mark and wordmark stay optically locked.
  const svgClass = variant === 'icon' ? className : 'h-full w-auto shrink-0'

  const mark =
    tone === 'color' ? (
      <svg viewBox="0 0 200 260" className={svgClass} aria-hidden="true">
        <clipPath id={clipId}>
          <path d={BEAN} />
        </clipPath>
        <g clipPath={`url(#${clipId})`}>
          <rect x="0" y="0" width="200" height="260" fill="#5C2D11" />
          <path d={LAND} fill="#3C3B1F" />
          <path d={TRAIL} fill="none" stroke="#FDFBF5" strokeWidth="5" strokeLinecap="round" />
          <path d={RANGE} fill="#FDFBF5" />
        </g>
      </svg>
    ) : (
      // Single-colour lockup for print, embossing and low-ink contexts. The
      // mountain is knocked out as negative space so the mark survives at
      // the guide's 10mm minimum.
      <svg viewBox="0 0 200 260" className={svgClass} aria-hidden="true">
        <mask id={maskId}>
          <rect x="0" y="0" width="200" height="260" fill="white" />
          <path d={RANGE} fill="black" />
          <path d={TRAIL} fill="none" stroke="black" strokeWidth="5" strokeLinecap="round" />
        </mask>
        <path d={BEAN} fill="currentColor" mask={`url(#${maskId})`} />
      </svg>
    )

  if (variant === 'icon') return mark

  if (variant === 'stacked') {
    return (
      <span className={`inline-flex flex-col items-center ${className}`}>
        <span className="h-[58%] flex items-center">{mark}</span>
        <span className="font-display leading-none tracking-[0.02em] text-[1.4em] mt-[0.18em]">
          Sherpa Sips
        </span>
        {tagline && (
          <span className="tagline mt-[0.35em] opacity-70">Guiding you to the perfect brew</span>
        )}
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center gap-[0.45em] ${className}`}>
      {mark}
      <span className="flex flex-col justify-center leading-none">
        <span className="font-display text-[1.55em] leading-[0.85] tracking-[0.015em]">
          Sherpa Sips
        </span>
        {tagline && (
          <span className="tagline mt-[0.3em] opacity-70">Guiding you to the perfect brew</span>
        )}
      </span>
    </span>
  )
}
