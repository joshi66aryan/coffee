import type { TopProduct } from '@/lib/admin/dashboard'

function formatPrice(amount: number) {
  return `Rs. ${amount.toLocaleString('en-IN')}`
}

export function TopProductsTable({ products }: { products: TopProduct[] }) {
  if (products.length === 0) {
    return <div className="py-10 text-center text-gray-500">No orders yet.</div>
  }

  return (
    // Capped for the same reason as the chart above it: this card must not set
    // the height of the grid row it shares with "Orders by Status".
    //
    // Measured: the header renders at 37px and each row at 48px, so 12rem (192px)
    // holds the header plus three rows and an 11px sliver of the fourth — enough
    // to show there is more without reading as a fourth row. The header is sticky
    // so the columns stay labelled while scrolling.
    //
    // The first attempt at this capped the container at 18rem, which five rows
    // fit inside, so it never scrolled and the card went on stretching the chart
    // beside it. The cap has to be smaller than the content to do anything.
    <div className="max-h-48 overflow-auto">
      <table className="table-brand min-w-125">
        <thead>
          <tr>
            <th className="sticky top-0 z-10 w-10">#</th>
            <th className="sticky top-0 z-10">Product</th>
            <th className="sticky top-0 z-10">Units Sold</th>
            <th className="sticky top-0 z-10">Revenue</th>
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
