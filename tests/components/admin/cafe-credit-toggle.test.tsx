import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CafeCreditToggle } from '@/components/admin/cafe-credit-toggle'

const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

vi.mock('@/lib/admin/actions', () => ({
  updateCafeCreditEnabled: vi.fn(),
}))

import { updateCafeCreditEnabled } from '@/lib/admin/actions'

const mockUpdate = vi.mocked(updateCafeCreditEnabled)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('CafeCreditToggle', () => {
  it('reflects the disabled state', () => {
    render(<CafeCreditToggle cafeId="cafe-1" enabled={false} />)
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByText(/credit is disabled/i)).toBeInTheDocument()
  })

  it('reflects the enabled state', () => {
    render(<CafeCreditToggle cafeId="cafe-1" enabled={true} />)
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText(/credit is enabled/i)).toBeInTheDocument()
  })

  it('calls updateCafeCreditEnabled with the flipped value and refreshes on success', async () => {
    mockUpdate.mockResolvedValue({})
    render(<CafeCreditToggle cafeId="cafe-1" enabled={false} />)

    await userEvent.click(screen.getByRole('switch'))

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith('cafe-1', true)
      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  it('shows an error and does not refresh when the update fails', async () => {
    mockUpdate.mockResolvedValue({ error: 'Failed to update credit setting.' })
    render(<CafeCreditToggle cafeId="cafe-1" enabled={false} />)

    await userEvent.click(screen.getByRole('switch'))

    await waitFor(() => {
      expect(screen.getByText('Failed to update credit setting.')).toBeInTheDocument()
    })
    expect(mockRefresh).not.toHaveBeenCalled()
  })
})
