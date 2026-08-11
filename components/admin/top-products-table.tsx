import type { TopProduct } from '@/lib/admin/dashboard'

function formatPrice(amount: number) {
  return `Rs. ${amount.toLocaleString('en-IN')}`
}

export function TopProductsTable({ products }: { products: TopProduct[] }) {
  if (products.length === 0) {
    return <div className="py-10 text-center text-gray-500">No orders yet.</div>
  }

  return (
    <div className="overflow-x-auto">
      <table className="table-brand min-w-125">
        <thead>
          <tr>
            <th className="w-10">#</th>
            <th>Product</th>
            <th>Units Sold</th>
            <th>Revenue</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product, index) => (
            <tr key={product.product_id}>
              <td className="font-display text-base text-brand-400 tabular-nums">{index + 1}</td>
              <td className="font-display text-base text-brand-900">{product.name}</td>
              <td className="text-gray-600 tabular-nums">{product.quantitySold}</td>
              <td className="text-brand-900 tabular-nums">{formatPrice(product.revenue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
