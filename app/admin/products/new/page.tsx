import { createProduct } from '@/lib/admin/actions'
import { ProductForm } from '@/components/admin/product-form'
import { PageMasthead } from '@/components/ui/page-masthead'

export const metadata = { title: 'Add Product — Admin' }

export default function AdminNewProductPage() {
  return (
    <div className="min-h-screen bg-cream-100 pb-16">
      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        <PageMasthead
          eyebrow="Catalog"
          title="Add Product"
          backHref="/admin/products"
          backLabel="Products"
        />

        <div className="mt-6 rounded-xl border border-cream-300 bg-white p-6">
          <ProductForm action={createProduct} submitLabel="Add Product" />
        </div>
      </div>
    </div>
  )
}
