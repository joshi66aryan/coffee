import { notFound } from 'next/navigation'
import { getProduct, updateProduct } from '@/lib/admin/actions'
import { ProductForm } from '@/components/admin/product-form'
import { PageMasthead } from '@/components/ui/page-masthead'

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
    <div className="min-h-screen bg-cream-100 pb-16">
      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        <PageMasthead
          eyebrow="Catalog"
          title="Edit Product"
          backHref="/admin/products"
          backLabel="Products"
        />

        <div className="mt-6 rounded-xl border border-cream-300 bg-white p-6">
          <ProductForm action={action} product={product} submitLabel="Save Changes" />
        </div>
      </div>
    </div>
  )
}
