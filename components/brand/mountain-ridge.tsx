/**
 * Layered Himalayan ridge silhouette — the section separator used to move
 * between light and dark bands of the interface, echoing the overlapping
 * mountain shapes on the Sherpa Sips packaging artwork.
 *
 * `flip` points the ridge downward so it can cap a section from above.
 */
export function MountainRidge({
  className = '',
  flip = false,
  layers = 'double',
}: {
  className?: string
  flip?: boolean
  layers?: 'single' | 'double'
}) {
  return (
    <svg
      viewBox="0 0 1440 120"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={`block w-full ${flip ? 'rotate-180' : ''} ${className}`}
    >
      {/* Far range: fewer, taller summits with uneven spacing so the skyline
          reads as Himalaya rather than a uniform sawtooth. */}
      {layers === 'double' && (
        <path
          d="M0 120 L0 82 L96 54 L168 68 L286 18 L372 58 L468 44 L604 76 L742 26 L836 62 L946 50 L1084 80 L1198 38 L1288 64 L1372 52 L1440 72 L1440 120 Z"
          fill="currentColor"
          opacity="0.3"
        />
      )}
      {/* Near range: lower and broader, so the two layers read as depth. */}
      <path
        d="M0 120 L0 104 L128 86 L242 100 L360 72 L470 96 L578 84 L706 106 L842 78 L960 100 L1092 90 L1214 108 L1330 92 L1440 102 L1440 120 Z"
        fill="currentColor"
      />
    </svg>
  )
}
