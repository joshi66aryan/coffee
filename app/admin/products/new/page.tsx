import Link from 'next/link'
import { createProduct } from '@/lib/admin/actions'
import { ProductForm } from '@/components/admin/product-form'

export const metadata = { title: 'Add Product — Admin' }

export default function AdminNewProductPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-6">
          <Link
            href="/admin/products"
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            ← Products
          </Link>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-6">Add Product</h1>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <ProductForm action={createProduct} submitLabel="Add Product" />
        </div>
      </div>
    </div>
  )
}
