import Image from 'next/image'
import Link from 'next/link'
import { Suspense } from 'react'
import { getProducts } from '@/lib/admin/actions'
import { PAGE_SIZE } from '@/lib/admin/constants'
import { StockToggle, DeleteProductButton } from '@/components/admin/product-list-actions'
import { SearchInput } from '@/components/admin/search-input'
import { Pagination } from '@/components/ui/pagination'
import type { Product } from '@/lib/types'

export const metadata = { title: 'Products — Admin' }

function formatPrice(price: number) {
  return `NPR ${price.toLocaleString('en-NP', { minimumFractionDigits: 2 })}`
}

function ProductRow({ product }: { product: Product }) {
  return (
    <tr className="border-b border-gray-100 last:border-0">
      <td className="py-3 pr-4">
        <div className="flex items-center gap-3">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              width={36}
              height={36}
              unoptimized
              className="w-9 h-9 rounded-md object-cover border border-gray-200 shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-md bg-gray-100 border border-gray-200 shrink-0 flex items-center justify-center">
              <span className="text-gray-300 text-xs">—</span>
            </div>
          )}
          <div>
            <p className="font-medium text-gray-900">{product.name}</p>
            {product.description && (
              <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{product.description}</p>
            )}
          </div>
        </div>
      </td>
      <td className="py-3 pr-4 text-sm text-gray-600">{product.category}</td>
      <td className="py-3 pr-4 text-sm text-gray-600">{product.unit}</td>
      <td className="py-3 pr-4 text-sm text-gray-900 font-medium tabular-nums">
        {formatPrice(product.base_price)}
      </td>
      <td className="py-3 pr-4">
        <StockToggle id={product.id} status={product.stock_status} />
      </td>
      <td className="py-3 text-right">
        <div className="flex items-center justify-end gap-4">
          <Link
            href={`/admin/products/${product.id}`}
            className="text-sm text-amber-600 hover:text-amber-800 transition-colors"
          >
            Edit
          </Link>
          <DeleteProductButton id={product.id} name={product.name} />
        </div>
      </td>
    </tr>
  )
}

interface PageProps {
  searchParams: Promise<{ q?: string; page?: string }>
}

export default async function AdminProductsPage({ searchParams }: PageProps) {
  const { q, page: pageStr } = await searchParams
  const page = Math.max(1, parseInt(pageStr ?? '1', 10) || 1)

  let result: Awaited<ReturnType<typeof getProducts>>
  try {
    result = await getProducts({ q, page })
  } catch {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Access denied.</p>
      </div>
    )
  }

  const { items: products, total } = result

  // Group by category only when not searching (preserves category UX)
  const grouped = !q
  const byCategory = grouped
    ? products.reduce<Record<string, Product[]>>((acc, p) => {
        ;(acc[p.category] ??= []).push(p)
        return acc
      }, {})
    : null

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Products</h1>
            <p className="text-sm text-gray-500 mt-0.5">{total} items in catalog</p>
          </div>
          <Link
            href="/admin/products/new"
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 transition-colors"
          >
            + Add Product
          </Link>
        </div>

        <div className="mb-4">
          <Suspense>
            <SearchInput placeholder="Search by name, category…" />
          </Suspense>
        </div>

        {products.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-500 mb-4">{q ? `No products match "${q}".` : 'No products yet.'}</p>
            {!q && (
              <Link
                href="/admin/products/new"
                className="text-sm text-amber-600 hover:text-amber-800 font-medium"
              >
                Add the first product →
              </Link>
            )}
          </div>
        ) : byCategory ? (
          <div className="space-y-6">
            {Object.entries(byCategory).map(([category, items]) => (
              <section key={category} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                  <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {category} ({items.length})
                  </h2>
                </div>
                <div className="px-5 overflow-x-auto">
                  <table className="w-full min-w-150">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="py-2.5 pr-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Name</th>
                        <th className="py-2.5 pr-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Category</th>
                        <th className="py-2.5 pr-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Unit</th>
                        <th className="py-2.5 pr-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Base Price</th>
                        <th className="py-2.5 pr-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Stock</th>
                        <th className="py-2.5 text-right text-xs font-medium text-gray-400 uppercase tracking-wide">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((p) => (
                        <ProductRow key={p.id} product={p} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </div>
        ) : (
          <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 overflow-x-auto">
              <table className="w-full min-w-150">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="py-2.5 pr-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Name</th>
                    <th className="py-2.5 pr-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Category</th>
                    <th className="py-2.5 pr-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Unit</th>
                    <th className="py-2.5 pr-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Base Price</th>
                    <th className="py-2.5 pr-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Stock</th>
                    <th className="py-2.5 text-right text-xs font-medium text-gray-400 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <ProductRow key={p.id} product={p} />
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <Pagination
          page={page}
          total={total}
          pageSize={PAGE_SIZE}
          basePath="/admin/products"
          q={q}
        />

        <p className="text-xs text-gray-400 mt-4 text-center">
          Click a stock badge to cycle its status · Per-café price overrides are set on the café detail page
        </p>
      </div>
    </div>
  )
}
