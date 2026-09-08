import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DeleteOrderButton } from '@/components/admin/delete-order-button'

const mockPush = vi.fn()
const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}))

vi.mock('@/lib/admin/actions', () => ({
  deleteOrder: vi.fn(),
}))

import { deleteOrder } from '@/lib/admin/actions'

const mockDeleteOrder = vi.mocked(deleteOrder)

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(window, 'confirm').mockReturnValue(true)
})

describe('DeleteOrderButton', () => {
  it('does nothing when the confirmation is declined', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<DeleteOrderButton orderId="order-1" />)

    await userEvent.click(screen.getByRole('button', { name: /delete order/i }))

    expect(mockDeleteOrder).not.toHaveBeenCalled()
  })

  it('deletes the order and redirects to the orders list on success', async () => {
    mockDeleteOrder.mockResolvedValue({})
    render(<DeleteOrderButton orderId="order-1" />)

    await userEvent.click(screen.getByRole('button', { name: /delete order/i }))

    await waitFor(() => {
      expect(mockDeleteOrder).toHaveBeenCalledWith('order-1')
      expect(mockPush).toHaveBeenCalledWith('/admin/orders')
      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  it('shows an error message and does not navigate when deletion fails', async () => {
    mockDeleteOrder.mockResolvedValue({ error: 'Order not found.' })
    render(<DeleteOrderButton orderId="order-1" />)

    await userEvent.click(screen.getByRole('button', { name: /delete order/i }))

    await waitFor(() => {
      expect(screen.getByText('Order not found.')).toBeInTheDocument()
    })
    expect(mockPush).not.toHaveBeenCalled()
  })
})
