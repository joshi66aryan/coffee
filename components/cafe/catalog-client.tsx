'use client'

import { useState, useMemo, useEffect } from 'react'
import { Search, X, Minus, Plus } from 'lucide-react'
import { BeanMark } from '@/components/brand/bean-mark'
import type { Product, CatalogProduct } from '@/lib/types'

export type { CatalogProduct }

const DESC_LIMIT = 60

function formatPrice(amount: number) {
  return amount.toLocaleString('en-IN')
}

const STOCK_STYLES: Record<Product['stock_status'], { label: string; className: string; dot: string }> = {
  in_stock: {
    label: 'In Stock',
    className: 'bg-olive-600 text-cream-100',
    dot: 'bg-brand-400',
  },
  low: {
    label: 'Low Stock',
    className: 'bg-brand-400 text-brand-950',
    dot: 'bg-brand-900',
  },
  out_of_stock: {
    label: 'Out of Stock',
    className: 'bg-cream-300 text-brand-900',
    dot: 'bg-brand-700',
  },
}

function StockBadge({ status }: { status: Product['stock_status'] }) {
  const { label, className, dot } = STOCK_STYLES[status]
  return (
    <span className={`pill ${className}`}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
      {label}
    </span>
  )
}

/**
 * Product imagery sits inside the arch. When a product has no photograph the
 * arch falls back to the brand's bean silhouette rather than an emoji, so an
 * unphotographed catalog still reads as Sherpa Sips.
 */
function ProductImage({ src, alt }: { src: string | null; alt: string }) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return <BeanMark className="h-1/2 w-auto text-brand-900/20" />
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
      onError={() => setFailed(true)}
    />
  )
}

function ProductCard({
  product,
  quantity,
  onSetQty,
}: {
  product: CatalogProduct
  quantity: number
  onSetQty: (id: string, qty: number) => void
}) {
  const [showDetails, setShowDetails] = useState(false)
  const orderable = product.stock_status !== 'out_of_stock'
  const hasLongDesc = (product.description?.length ?? 0) > DESC_LIMIT

  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-t-[4rem] rounded-b-xl border bg-white transition-all duration-300 ${
        quantity > 0
          ? 'border-brand-600 shadow-md'
          : 'border-cream-300 hover:border-brand-400 hover:shadow-md'
      } ${!orderable ? 'opacity-65' : ''}`}
    >
      {/* ---- Arched product area, straight off the pouch artwork -------- */}
      <div className="relative flex h-40 shrink-0 items-end justify-center overflow-hidden bg-cream-200 sm:h-48">
        {/* Layered hills behind the product. */}
        <svg
          viewBox="0 0 200 80"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-2/5 w-full text-olive-600/15"
        >
          <path d="M0 80 L0 46 L44 20 L86 44 L124 14 L162 40 L200 22 L200 80 Z" fill="currentColor" />
        </svg>

        <div className="absolute inset-0 flex items-center justify-center">
          <ProductImage src={product.image_url} alt={product.name} />
        </div>

        <div className="absolute left-2.5 top-2.5">
          <StockBadge status={product.stock_status} />
        </div>

        {quantity > 0 && (
          <span className="absolute right-2.5 top-2.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-brand-900 px-1.5 font-display text-xs leading-none text-cream-50">
            {quantity}
          </span>
        )}
      </div>

      {/* ---- Label ------------------------------------------------------ */}
      <div className="flex flex-1 flex-col gap-2 px-3.5 pb-3.5 pt-3">
        <p className="eyebrow-sm text-brand-600">{product.category}</p>

        <h3 className="display-sm line-clamp-2 text-brand-900">{product.name}</h3>

        {product.description && (
          <p className="line-clamp-2 text-xs leading-relaxed text-gray-500">
            {product.description}
            {hasLongDesc && (
              <button
                onClick={(e) => { e.stopPropagation(); setShowDetails(true) }}
                className="ml-1 font-semibold text-brand-600 underline underline-offset-2 hover:text-brand-900"
              >
                more
              </button>
            )}
          </p>
        )}

        {/* Price + stepper sit on a printed rule at the base of the label. */}
        <div className="mt-auto flex items-end justify-between gap-2 border-t border-cream-300 pt-3">
          <div className="min-w-0">
            <p className="font-display text-xl leading-none text-brand-900">
              <span className="text-[0.65em] align-baseline text-brand-600">Rs.</span>{' '}
              {formatPrice(product.effective_price)}
            </p>
            <p className="eyebrow-sm mt-1.5 text-gray-400">Per {product.unit}</p>
          </div>

          {orderable && (
            quantity > 0 ? (
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => onSetQty(product.id, quantity - 1)}
                  className="step-btn"
                  aria-label={`Decrease ${product.name}`}
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-6 text-center font-display text-base tabular-nums text-brand-900">
                  {quantity}
                </span>
                <button
                  onClick={() => onSetQty(product.id, quantity + 1)}
                  className="step-btn step-btn-solid"
                  aria-label={`Increase ${product.name}`}
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => onSetQty(product.id, 1)}
                className="btn btn-primary btn-sm shrink-0"
              >
                Add
              </button>
            )
          )}
        </div>
      </div>

      {/* ---- Detail sheet ----------------------------------------------- */}
      {showDetails && (
        <div
          className="animate-fade-in fixed inset-0 z-50 flex items-end justify-center bg-brand-950/55 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
          onClick={() => setShowDetails(false)}
          role="dialog"
          aria-modal="true"
          aria-label={product.name}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative flex h-44 items-center justify-center overflow-hidden bg-cream-200">
              <ProductImage src={product.image_url} alt={product.name} />
              <button
                onClick={() => setShowDetails(false)}
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-brand-900 text-cream-50 transition-colors hover:bg-brand-950"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="absolute bottom-3 left-3">
                <StockBadge status={product.stock_status} />
              </div>
            </div>

            <div className="space-y-3 p-5">
              <p className="eyebrow">{product.category}</p>
              <h2 className="display-md text-brand-900">{product.name}</h2>
              <p className="text-sm leading-relaxed text-gray-600">{product.description}</p>
              <div className="flex items-baseline justify-between border-t border-cream-300 pt-3">
                <span className="eyebrow-sm text-gray-400">Per {product.unit}</span>
                <span className="font-display text-2xl text-brand-900">
                  <span className="text-[0.6em] text-brand-600">Rs.</span>{' '}
                  {formatPrice(product.effective_price)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </article>
  )
}

export function CatalogClient({
  products,
  categories,
}: {
  products: CatalogProduct[]
  categories: string[]
}) {
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [cartLoaded, setCartLoaded] = useState(false)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  // Load cart after hydration — keeps server/client HTML in sync
  useEffect(() => {
    try {
      const stored = localStorage.getItem('sherpa-cart')
      if (stored) setQuantities(JSON.parse(stored))
    } catch {}
    setCartLoaded(true)
  }, [])

  // Only persist after the initial load to avoid wiping the cart
  useEffect(() => {
    if (!cartLoaded) return
    try { localStorage.setItem('sherpa-cart', JSON.stringify(quantities)) } catch {}
  }, [quantities, cartLoaded])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return products.filter(p => {
      const matchesSearch = !q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
      const matchesCategory = !activeCategory || p.category === activeCategory
      return matchesSearch && matchesCategory
    })
  }, [products, search, activeCategory])

  function setQty(productId: string, value: number) {
    setQuantities(prev => {
      if (value <= 0) {
        const next = { ...prev }
        delete next[productId]
        return next
      }
      return { ...prev, [productId]: value }
    })
  }

  return (
    <div className="flex flex-col">
      {/* ---- Filter bar. Sticks under the 64px header. ------------------ */}
      <div className="sticky top-16 z-10 border-b border-cream-300 bg-cream-100/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          {categories.length > 1 && (
            <div
              className="scrollbar-hide flex min-w-0 flex-1 gap-2 overflow-x-auto"
              // Fade the trailing edge so a long category list reads as
              // scrollable instead of looking cut off.
              style={{
                WebkitMaskImage: 'linear-gradient(to right, black 88%, transparent 100%)',
                maskImage: 'linear-gradient(to right, black 88%, transparent 100%)',
              }}
            >
              <button
                onClick={() => setActiveCategory(null)}
                data-active={!activeCategory}
                className="chip shrink-0"
              >
                All
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                  data-active={activeCategory === cat}
                  className="chip shrink-0"
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          <div className={`relative shrink-0 ${categories.length > 1 ? 'w-32 sm:w-56' : 'flex-1'}`}>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search"
              aria-label="Search products"
              className="field rounded-full! py-2! pl-8.5! pr-8! text-sm!"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-900"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ---- Grid -------------------------------------------------------- */}
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-8 py-24 text-center">
            <Search className="mb-4 h-8 w-8 text-cream-400" />
            <p className="display-md text-brand-900">Nothing on this trail</p>
            <p className="mt-2 text-sm text-gray-500">Try a different search or category.</p>
          </div>
        ) : (
          <>
            <div className="mb-5 flex items-baseline justify-between gap-4">
              <h2 className="display-md text-brand-900">
                {activeCategory ?? 'The Collection'}
              </h2>
              <span className="eyebrow-sm shrink-0 text-gray-400">
                {filtered.length} {filtered.length === 1 ? 'Product' : 'Products'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  quantity={quantities[product.id] ?? 0}
                  onSetQty={setQty}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
