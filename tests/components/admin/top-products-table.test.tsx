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
})
