import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SalesTrendChart } from '@/components/admin/sales-trend-chart'
import type { DailySales } from '@/lib/admin/dashboard'

const data: DailySales[] = [
  { date: '2026-08-05', total: 1000 },
  { date: '2026-08-06', total: 2000 },
]

describe('SalesTrendChart', () => {
  it('shows an empty state when there is no data', () => {
    render(<SalesTrendChart data={[]} />)
    expect(screen.getByText(/no orders yet/i)).toBeInTheDocument()
  })

  it('renders an accessible chart image naming the day count', () => {
    render(<SalesTrendChart data={data} />)
    expect(screen.getByRole('img', { name: /daily sales trend for the last 2 days/i })).toBeInTheDocument()
  })

  it('lists every day in the table view', () => {
    render(<SalesTrendChart data={data} />)
    expect(screen.getByText('Rs. 1,000')).toBeInTheDocument()
    expect(screen.getByText('Rs. 2,000')).toBeInTheDocument()
  })

  it('shows a tooltip with the value and date on hover', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      right: 720,
      top: 0,
      bottom: 240,
      width: 720,
      height: 240,
      x: 0,
      y: 0,
      toJSON: () => {},
    } as DOMRect)

    render(<SalesTrendChart data={data} />)
    const container = screen.getByRole('img').parentElement!
    fireEvent.pointerMove(container, { clientX: 700 })

    expect(screen.getAllByText('Rs. 2,000')).toHaveLength(2)
  })

  it('clears the tooltip on pointer leave', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      right: 720,
      top: 0,
      bottom: 240,
      width: 720,
      height: 240,
      x: 0,
      y: 0,
      toJSON: () => {},
    } as DOMRect)

    render(<SalesTrendChart data={data} />)
    const container = screen.getByRole('img').parentElement!
    fireEvent.pointerMove(container, { clientX: 700 })
    expect(screen.getAllByText('Rs. 2,000')).toHaveLength(2)

    fireEvent.pointerLeave(container)
    expect(screen.getAllByText('Rs. 2,000')).toHaveLength(1)
  })
})
