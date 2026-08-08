import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PaymentStatusToggle } from '@/components/admin/payment-status-toggle'

const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

vi.mock('@/lib/admin/actions', () => ({
  updatePaymentStatus: vi.fn(),
}))

import { updatePaymentStatus } from '@/lib/admin/actions'

const mockUpdate = vi.mocked(updatePaymentStatus)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('PaymentStatusToggle', () => {
  it('shows the current status', () => {
    render(<PaymentStatusToggle orderId="order-1" status="pending" />)
    expect(screen.getByRole('button', { name: 'Pending' })).toBeInTheDocument()
  })

  it('cycles pending -> paid on click and refreshes on success', async () => {
    mockUpdate.mockResolvedValue({})
    render(<PaymentStatusToggle orderId="order-1" status="pending" />)

    await userEvent.click(screen.getByRole('button', { name: 'Pending' }))

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith('order-1', 'paid')
      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  it('cycles paid -> due on click', async () => {
    mockUpdate.mockResolvedValue({})
    render(<PaymentStatusToggle orderId="order-1" status="paid" />)

    await userEvent.click(screen.getByRole('button', { name: 'Paid' }))

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith('order-1', 'due')
    })
  })

  it('cycles due -> pending on click', async () => {
    mockUpdate.mockResolvedValue({})
    render(<PaymentStatusToggle orderId="order-1" status="due" />)

    await userEvent.click(screen.getByRole('button', { name: 'Due' }))

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith('order-1', 'pending')
    })
  })

  it('does not refresh when the update fails', async () => {
    mockUpdate.mockResolvedValue({ error: 'Failed to update payment status' })
    render(<PaymentStatusToggle orderId="order-1" status="pending" />)

    await userEvent.click(screen.getByRole('button', { name: 'Pending' }))

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled()
    })
    expect(mockRefresh).not.toHaveBeenCalled()
  })
})
