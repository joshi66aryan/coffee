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
      <table className="w-full min-w-125">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="py-2.5 pr-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">#</th>
            <th className="py-2.5 pr-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Product</th>
            <th className="py-2.5 pr-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Units Sold</th>
            <th className="py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Revenue</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product, index) => (
            <tr key={product.product_id} className="border-b border-gray-100 last:border-0">
              <td className="py-3 pr-4 text-sm text-gray-400 tabular-nums">{index + 1}</td>
              <td className="py-3 pr-4 text-sm font-medium text-gray-900">{product.name}</td>
              <td className="py-3 pr-4 text-sm text-gray-600 tabular-nums">{product.quantitySold}</td>
              <td className="py-3 text-sm text-gray-900 tabular-nums">{formatPrice(product.revenue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
