import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TopProductsTable } from '@/components/admin/top-products-table'
import type { TopProduct } from '@/lib/admin/dashboard'

const products: TopProduct[] = [
  { product_id: 'p1', name: 'Whole Milk', quantitySold: 50, revenue: 6000 },
  { product_id: 'p2', name: 'Espresso Beans', quantitySold: 10, revenue: 9000 },
]

describe('TopProductsTable', () => {
  it('shows an empty state when there are no products', () => {
    render(<TopProductsTable products={[]} />)
    expect(screen.getByText(/no orders yet/i)).toBeInTheDocument()
  })

  it('renders each product with rank, quantity sold, and revenue', () => {
    render(<TopProductsTable products={products} />)
    expect(screen.getByText('Whole Milk')).toBeInTheDocument()
    expect(screen.getByText('Espresso Beans')).toBeInTheDocument()
    expect(screen.getByText('50')).toBeInTheDocument()
    expect(screen.getByText('Rs. 6,000')).toBeInTheDocument()
    expect(screen.getByText('Rs. 9,000')).toBeInTheDocument()
  })

  it('numbers rows in the order given', () => {
    render(<TopProductsTable products={products} />)
    const rows = screen.getAllByRole('row').slice(1)
    expect(rows[0]).toHaveTextContent('1')
    expect(rows[1]).toHaveTextContent('2')
  })

  // The card shares a grid row with "Orders by Status", so it must not grow
  // with the catalog. The cap is 12rem — the header plus three 48px rows — and
  // has to stay below the height of the content it holds: an earlier cap of
  // 18rem fit five rows inside it and so never scrolled at all.
  it('scrolls past three rows rather than growing with the catalog', () => {
    const many: TopProduct[] = Array.from({ length: 5 }, (_, i) => ({
      product_id: `p${i}`,
      name: `Product ${i}`,
      quantitySold: 20 - i,
      revenue: 1000 + i,
    }))

    const { container } = render(<TopProductsTable products={many} />)

    // Every row is still rendered — the cap is presentation, not truncation.
    expect(screen.getAllByRole('row')).toHaveLength(many.length + 1)

    const scroller = container.firstElementChild!
    expect(scroller).toHaveClass('overflow-auto')
    expect(scroller).toHaveClass('max-h-48')
  })

  it('keeps the column headers visible while scrolling', () => {
    render(<TopProductsTable products={products} />)
    expect(screen.getByRole('columnheader', { name: 'Product' })).toHaveClass('sticky')
  })
})
