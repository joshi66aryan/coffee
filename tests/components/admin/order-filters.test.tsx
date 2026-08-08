import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OrderFilters } from '@/components/admin/order-filters'

const mockReplace = vi.fn()
let currentParams = new URLSearchParams()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => '/admin/orders',
  useSearchParams: () => currentParams,
}))

beforeEach(() => {
  vi.clearAllMocks()
  currentParams = new URLSearchParams()
})

describe('OrderFilters', () => {
  it('renders all status options', () => {
    render(<OrderFilters />)
    expect(screen.getByRole('option', { name: 'All statuses' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Received' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Confirmed' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Out for Delivery' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Delivered' })).toBeInTheDocument()
  })

  it('does not show Clear filters when nothing is set', () => {
    render(<OrderFilters />)
    expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument()
  })

  it('shows Clear filters when a status is active', () => {
    currentParams = new URLSearchParams({ status: 'received' })
    render(<OrderFilters />)
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeInTheDocument()
  })

  it('navigates with the selected status and resets the page', async () => {
    render(<OrderFilters />)
    await userEvent.selectOptions(screen.getByLabelText('Filter by status'), 'confirmed')
    expect(mockReplace).toHaveBeenCalledWith('/admin/orders?page=1&status=confirmed')
  })

  it('navigates with the from date', () => {
    render(<OrderFilters />)
    fireEvent.change(screen.getByLabelText('From date'), { target: { value: '2026-08-01' } })
    expect(mockReplace).toHaveBeenCalledWith('/admin/orders?page=1&from=2026-08-01')
  })

  it('navigates with the to date', () => {
    render(<OrderFilters />)
    fireEvent.change(screen.getByLabelText('To date'), { target: { value: '2026-08-05' } })
    expect(mockReplace).toHaveBeenCalledWith('/admin/orders?page=1&to=2026-08-05')
  })

  it('clears all filters', async () => {
    currentParams = new URLSearchParams({ status: 'received', from: '2026-08-01', to: '2026-08-05' })
    render(<OrderFilters />)
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(mockReplace).toHaveBeenCalledWith('/admin/orders?page=1')
  })
})
