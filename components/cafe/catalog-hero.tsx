import { MountainRidge } from '@/components/brand/mountain-ridge'
import { BeanScatter } from '@/components/brand/bean-scatter'

/**
 * Catalog masthead. Carries the brand statement from the packaging into the
 * ordering surface, then hands off to the cream catalog below via the ridge
 * — the bean → hills → Himalaya journey the brand guide describes.
 */
export function CatalogHero({ cafeName }: { cafeName?: string }) {
  return (
    <section className="relative overflow-hidden bg-brand-900 text-cream-200">
      <BeanScatter className="text-cream-50/6" count={4} />

      <div className="relative mx-auto max-w-6xl px-4 pb-14 pt-10 sm:px-6 sm:pb-20 sm:pt-14">
        <p className="eyebrow text-brand-400">
          {cafeName ? `Welcome back, ${cafeName}` : 'Sherpa Sips Supply'}
        </p>

        <h1 className="display-lg mt-4 max-w-2xl text-cream-50">
          Guiding you to the <span className="text-brand-400">perfect</span> brew
        </h1>

        <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-cream-200/70">
          Altitude-grown beans, roasted in small batches in Kathmandu. Build your
          order below — your café’s pricing is already applied.
        </p>
      </div>

      {/* Ridgeline handing off to the catalog. */}
      <MountainRidge className="h-12 text-cream-100 sm:h-16" />
    </section>
  )
}
