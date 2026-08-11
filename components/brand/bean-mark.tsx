/**
 * Plain coffee-bean silhouette with the centre crease knocked out.
 *
 * Used as the image placeholder wherever a product has no photograph, so an
 * unphotographed catalog still reads as Sherpa Sips rather than falling back
 * to a generic icon. Takes its colour from `currentColor`.
 *
 * The mask id is fixed rather than generated: several marks on one page all
 * reference an identical mask, so the collision is harmless and this stays
 * usable from server components.
 */
export function BeanMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 124 192" className={className} aria-hidden="true">
      <mask id="ss-bean-mark-crease">
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
        mask="url(#ss-bean-mark-crease)"
      />
    </svg>
  )
}
