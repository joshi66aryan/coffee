import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OrderStatusActions } from '@/components/admin/order-status-actions'

const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

vi.mock('@/lib/admin/actions', () => ({
  updateOrderStatus: vi.fn(),
}))

import { updateOrderStatus } from '@/lib/admin/actions'

const mockUpdateOrderStatus = vi.mocked(updateOrderStatus)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('OrderStatusActions', () => {
  it('renders a button for each order status', () => {
    render(<OrderStatusActions orderId="order-1" status="received" />)
    expect(screen.getByRole('button', { name: 'Received' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirmed' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Out for Delivery' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delivered' })).toBeInTheDocument()
  })

  it('disables the current status button', () => {
    render(<OrderStatusActions orderId="order-1" status="confirmed" />)
    expect(screen.getByRole('button', { name: 'Confirmed' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Delivered' })).not.toBeDisabled()
  })

  it('calls updateOrderStatus and refreshes on success', async () => {
    mockUpdateOrderStatus.mockResolvedValue({})
    render(<OrderStatusActions orderId="order-1" status="received" />)

    await userEvent.click(screen.getByRole('button', { name: 'Confirmed' }))

    await waitFor(() => {
      expect(mockUpdateOrderStatus).toHaveBeenCalledWith('order-1', 'confirmed')
      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  it('shows an error message and does not refresh when the update fails', async () => {
    mockUpdateOrderStatus.mockResolvedValue({ error: 'Failed to update order status.' })
    render(<OrderStatusActions orderId="order-1" status="received" />)

    await userEvent.click(screen.getByRole('button', { name: 'Confirmed' }))

    await waitFor(() => {
      expect(screen.getByText('Failed to update order status.')).toBeInTheDocument()
    })
    expect(mockRefresh).not.toHaveBeenCalled()
  })
})
