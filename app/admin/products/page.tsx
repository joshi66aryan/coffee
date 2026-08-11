import Image from 'next/image'
import Link from 'next/link'
import { Suspense } from 'react'
import { getProducts } from '@/lib/admin/actions'
import { PAGE_SIZE } from '@/lib/admin/constants'
import { StockToggle, DeleteProductButton } from '@/components/admin/product-list-actions'
import { SearchInput } from '@/components/admin/search-input'
import { Pagination } from '@/components/ui/pagination'
import { PageMasthead } from '@/components/ui/page-masthead'
import { BeanMark } from '@/components/brand/bean-mark'
import type { Product } from '@/lib/types'

export const metadata = { title: 'Products — Admin' }

function formatPrice(price: number) {
  return `NPR ${price.toLocaleString('en-NP', { minimumFractionDigits: 2 })}`
}

function ProductRow({ product }: { product: Product }) {
  return (
    <tr>
      <td>
        <div className="flex items-center gap-3">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              width={40}
              height={48}
              unoptimized
              className="arch-sm h-12 w-10 shrink-0 border border-cream-300 object-cover"
            />
          ) : (
            <div className="arch-sm flex h-12 w-10 shrink-0 items-center justify-center border border-cream-300 bg-cream-200">
              <BeanMark className="h-5 w-auto text-brand-900/30" />
            </div>
          )}
          <div className="min-w-0">
            <p className="font-display text-base leading-none text-brand-900">{product.name}</p>
            {product.description && (
              <p className="mt-1.5 max-w-xs truncate text-xs text-gray-400">{product.description}</p>
            )}
          </div>
        </div>
      </td>
      <td className="capitalize text-gray-600">{product.category}</td>
      <td className="text-gray-600">{product.unit}</td>
      <td className="font-display text-base text-brand-900 tabular-nums">
        {formatPrice(product.base_price)}
      </td>
      <td>
        <StockToggle id={product.id} status={product.stock_status} />
      </td>
      <td className="text-right">
        <div className="flex items-center justify-end gap-4">
          <Link
            href={`/admin/products/${product.id}`}
            className="font-display text-sm uppercase tracking-[0.12em] text-brand-700 transition-colors hover:text-brand-900"
          >
            Edit
          </Link>
          <DeleteProductButton id={product.id} name={product.name} />
        </div>
      </td>
    </tr>
  )
}

function ProductTable({ products }: { products: Product[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="table-brand min-w-150">
        <thead>
          <tr>
            <th>Name</th>
            <th>Category</th>
            <th>Unit</th>
            <th>Base Price</th>
            <th>Stock</th>
            <th className="text-right!">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map(p => (
            <ProductRow key={p.id} product={p} />
          ))}
        </tbody>
      </table>
    </div>
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
      <div className="flex min-h-screen items-center justify-center bg-cream-100">
        <p className="display-md text-brand-900">Access denied</p>
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
    <div className="min-h-screen bg-cream-100 pb-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <PageMasthead
          eyebrow="Catalog"
          title="Products"
          description={`${total} items in catalog`}
          action={
            <Link href="/admin/products/new" className="btn btn-primary btn-sm">
              + Add Product
            </Link>
          }
        />

        <div className="py-6">
          <Suspense>
            <SearchInput placeholder="Search by name, category…" />
          </Suspense>
        </div>

        {products.length === 0 ? (
          <div className="rounded-xl border border-cream-300 bg-white px-8 py-16 text-center">
            <p className="display-md text-brand-900">
              {q ? 'No matching products' : 'No products yet'}
            </p>
            <p className="mt-2 text-sm text-gray-500">
              {q ? `Nothing matches “${q}”.` : 'Add your first blend to open the catalog.'}
            </p>
            {!q && (
              <Link href="/admin/products/new" className="btn btn-primary mt-7">
                Add the first product
              </Link>
            )}
          </div>
        ) : byCategory ? (
          <div className="space-y-6">
            {Object.entries(byCategory).map(([category, items]) => (
              <section
                key={category}
                className="overflow-hidden rounded-xl border border-cream-300 bg-white"
              >
                <div className="flex items-baseline justify-between gap-3 border-b border-cream-300 bg-cream-100 px-5 py-3.5">
                  <h2 className="display-sm text-brand-900">{category}</h2>
                  <span className="eyebrow-sm text-gray-400">{items.length}</span>
                </div>
                <ProductTable products={items} />
              </section>
            ))}
          </div>
        ) : (
          <section className="overflow-hidden rounded-xl border border-cream-300 bg-white">
            <ProductTable products={products} />
          </section>
        )}

        <Pagination
          page={page}
          total={total}
          pageSize={PAGE_SIZE}
          basePath="/admin/products"
          q={q}
        />

        <p className="mt-6 text-center text-xs text-gray-400">
          Click a stock badge to cycle its status · Per-café price overrides are set on the café detail page
        </p>
      </div>
    </div>
  )
}
