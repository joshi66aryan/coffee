import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TopProductsChart } from '@/components/admin/top-products-chart'
import type { TopProduct } from '@/lib/admin/dashboard'

const products: TopProduct[] = [
  { product_id: 'p1', name: 'Whole Milk', quantitySold: 50, revenue: 6000 },
  { product_id: 'p2', name: 'Espresso Beans', quantitySold: 10, revenue: 9000 },
]

describe('TopProductsChart', () => {
  it('shows an empty state when there are no products', () => {
    render(<TopProductsChart products={[]} />)
    expect(screen.getByText(/no orders yet/i)).toBeInTheDocument()
  })

  it('renders each product name and units sold', () => {
    render(<TopProductsChart products={products} />)
    expect(screen.getByText('Whole Milk')).toBeInTheDocument()
    expect(screen.getByText('Espresso Beans')).toBeInTheDocument()
    expect(screen.getByText('50 units')).toBeInTheDocument()
    expect(screen.getByText('10 units')).toBeInTheDocument()
  })

  it('keeps revenue hidden until a row is hovered', () => {
    render(<TopProductsChart products={products} />)
    expect(screen.queryByText('Rs. 6,000')).not.toBeInTheDocument()

    const row = screen.getByText('Whole Milk').parentElement!
    fireEvent.pointerEnter(row)
    expect(screen.getByText('Rs. 6,000')).toBeInTheDocument()

    fireEvent.pointerLeave(row)
    expect(screen.queryByText('Rs. 6,000')).not.toBeInTheDocument()
  })
})
