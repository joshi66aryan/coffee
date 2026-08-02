import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getProduct, updateProduct } from '@/lib/admin/actions'
import { ProductForm } from '@/components/admin/product-form'

export const metadata = { title: 'Edit Product — Admin' }

interface Props {
  params: Promise<{ id: string }>
}

export default async function AdminEditProductPage({ params }: Props) {
  const { id } = await params
  const product = await getProduct(id)

  if (!product) notFound()

  const action = updateProduct.bind(null, id)

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

        <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Product</h1>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <ProductForm action={action} product={product} submitLabel="Save Changes" />
        </div>
      </div>
    </div>
  )
}
