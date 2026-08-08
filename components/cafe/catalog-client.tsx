'use client'

import { useState, useMemo, useEffect } from 'react'
import { Search, X } from 'lucide-react'
import type { Product, CatalogProduct } from '@/lib/types'

export type { CatalogProduct }

const DESC_LIMIT = 55

function formatPrice(amount: number) {
  return `Rs. ${amount.toLocaleString('en-IN')}`
}

function StockBadge({ status }: { status: Product['stock_status'] }) {
  if (status === 'in_stock') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-white/85 backdrop-blur-sm px-1.5 py-0.5 rounded-full shadow-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
        In Stock
      </span>
    )
  }
  if (status === 'low') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-white/85 backdrop-blur-sm px-1.5 py-0.5 rounded-full shadow-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
        Low Stock
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-500 bg-white/85 backdrop-blur-sm px-1.5 py-0.5 rounded-full shadow-sm">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
      Out of Stock
    </span>
  )
}

function ProductImage({ src, alt }: { src: string | null; alt: string }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) return <span className="text-4xl select-none">☕</span>
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className="w-full h-full object-cover" onError={() => setFailed(true)} />
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
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col transition-opacity ${!orderable ? 'opacity-50' : ''}`}>
      {/* Image */}
      <div className="relative w-full h-44 bg-amber-50 flex items-center justify-center overflow-hidden shrink-0">
        <ProductImage src={product.image_url} alt={product.name} />
        <div className="absolute bottom-2 left-2">
          <StockBadge status={product.stock_status} />
        </div>
        {quantity > 0 && (
          <div className="absolute top-2 right-2 min-w-5 h-5 bg-amber-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-md">
            {quantity}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="px-2.5 pt-2 pb-2.5 flex flex-col gap-1.5">
        <p className="font-semibold text-gray-900 text-xs leading-snug line-clamp-2">{product.name}</p>

        {product.description && (
          <div className="flex items-baseline gap-1 min-w-0">
            <p className="text-[10px] text-gray-400 truncate min-w-0 flex-1">{product.description}</p>
            {hasLongDesc && (
              <button
                onClick={e => { e.stopPropagation(); setShowDetails(true) }}
                className="text-[10px] text-amber-600 font-semibold shrink-0"
              >
                Read more
              </button>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-1 mt-auto">
          <div className="min-w-0">
            <p className="text-xs font-bold text-amber-900">{formatPrice(product.effective_price)}</p>
            <p className="text-[10px] text-gray-400">/ {product.unit}</p>
          </div>

          {orderable && (
            quantity > 0 ? (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => onSetQty(product.id, quantity - 1)}
                  className="w-6 h-6 rounded-full bg-gray-100 text-gray-700 font-bold text-base flex items-center justify-center hover:bg-gray-200 active:scale-95 transition-all leading-none"
                  aria-label="Decrease"
                >
                  −
                </button>
                <span className="w-4 text-center text-xs font-bold text-gray-900 tabular-nums">{quantity}</span>
                <button
                  onClick={() => onSetQty(product.id, quantity + 1)}
                  className="w-6 h-6 rounded-full bg-amber-600 text-white font-bold text-base flex items-center justify-center hover:bg-amber-700 active:scale-95 transition-all shadow-sm leading-none"
                  aria-label="Increase"
                >
                  +
                </button>
              </div>
            ) : (
              <button
                onClick={() => onSetQty(product.id, 1)}
                className="w-7 h-7 rounded-full bg-amber-600 text-white font-bold text-lg flex items-center justify-center hover:bg-amber-700 active:scale-95 transition-all shadow-sm leading-none shrink-0"
                aria-label="Add"
              >
                +
              </button>
            )
          )}
        </div>
      </div>

      {showDetails && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4"
          onClick={() => setShowDetails(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="relative w-full h-40 bg-amber-50 flex items-center justify-center overflow-hidden">
              <ProductImage src={product.image_url} alt={product.name} />
              <button
                onClick={() => setShowDetails(false)}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center text-gray-600 hover:bg-white shadow-sm"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-2">
              <p className="font-semibold text-gray-900 text-sm">{product.name}</p>
              <p className="text-xs text-gray-500 leading-relaxed">{product.description}</p>
              <p className="text-sm font-bold text-amber-900">
                {formatPrice(product.effective_price)}{' '}
                <span className="text-xs font-normal text-gray-400">/ {product.unit}</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
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
      {/* Sticky filter bar — stays below the header (h-14 = 56px) */}
      <div className="sticky top-14 z-10 px-3 pt-2.5 pb-2 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center gap-2">
          {categories.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide flex-1 min-w-0">
              <button
                onClick={() => setActiveCategory(null)}
                className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                  !activeCategory
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-amber-300'
                }`}
              >
                All
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                  className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all capitalize ${
                    activeCategory === cat
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-amber-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          <div className={`relative shrink-0 ${categories.length > 1 ? 'w-28 sm:w-44' : 'flex-1'}`}>
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter…"
              className="w-full pl-7 pr-6 py-1.5 bg-gray-100 rounded-full text-xs text-gray-900 placeholder-gray-400 outline-none focus:bg-white border border-transparent focus:ring-2 focus:ring-amber-200 focus:border-amber-200 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="Clear filter"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center px-8">
          <Search className="w-10 h-10 text-gray-300 mb-3" />
          <p className="font-semibold text-gray-600">No products found</p>
          <p className="text-sm text-gray-400 mt-1">Try a different search or category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 items-start">
          {filtered.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              quantity={quantities[product.id] ?? 0}
              onSetQty={setQty}
            />
          ))}
        </div>
      )}
    </div>
  )
}
