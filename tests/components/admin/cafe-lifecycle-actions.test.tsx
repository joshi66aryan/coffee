import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CafeLifecycleActions } from '@/components/admin/cafe-lifecycle-actions'

const mockRefresh = vi.fn()
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh, push: mockPush }),
}))

vi.mock('@/lib/admin/actions', () => ({
  suspendCafe: vi.fn(),
  reactivateCafe: vi.fn(),
  deleteCafe: vi.fn(),
}))

import { suspendCafe, reactivateCafe, deleteCafe } from '@/lib/admin/actions'

const mockSuspend = vi.mocked(suspendCafe)
const mockReactivate = vi.mocked(reactivateCafe)
const mockDelete = vi.mocked(deleteCafe)

const CAFE_ID = '22222222-2222-4222-8222-222222222222'

function renderFor(status: 'pending' | 'active' | 'rejected' | 'suspended') {
  return render(<CafeLifecycleActions cafeId={CAFE_ID} status={status} cafeName="Himalayan Brew" />)
}

beforeEach(() => {
  vi.clearAllMocks()
  mockSuspend.mockResolvedValue({})
  mockReactivate.mockResolvedValue({})
  mockDelete.mockResolvedValue({})
  vi.spyOn(window, 'confirm').mockReturnValue(true)
})

describe('CafeLifecycleActions', () => {
  it('offers Freeze for an active café, and not Unfreeze', () => {
    renderFor('active')
    expect(screen.getByRole('button', { name: /freeze café/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /unfreeze/i })).not.toBeInTheDocument()
  })

  it('offers Unfreeze for a frozen café, and not Freeze', () => {
    renderFor('suspended')
    expect(screen.getByRole('button', { name: /unfreeze café/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^freeze café$/i })).not.toBeInTheDocument()
  })

  // A pending application is approved or rejected, not frozen — there is
  // nothing to pause yet.
  it('offers neither for a café still awaiting approval', () => {
    renderFor('pending')
    expect(screen.queryByRole('button', { name: /freeze/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /unfreeze/i })).not.toBeInTheDocument()
  })

  it('always offers Delete', () => {
    for (const status of ['pending', 'active', 'rejected', 'suspended'] as const) {
      const { unmount } = renderFor(status)
      expect(screen.getByRole('button', { name: /delete café/i })).toBeInTheDocument()
      unmount()
    }
  })

  it('freezes and refreshes the page', async () => {
    renderFor('active')
    await userEvent.click(screen.getByRole('button', { name: /freeze café/i }))

    expect(mockSuspend).toHaveBeenCalledWith(CAFE_ID)
    expect(mockRefresh).toHaveBeenCalled()
  })

  it('unfreezes without asking for confirmation — it is not destructive', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm')
    renderFor('suspended')
    await userEvent.click(screen.getByRole('button', { name: /unfreeze café/i }))

    expect(confirmSpy).not.toHaveBeenCalled()
    expect(mockReactivate).toHaveBeenCalledWith(CAFE_ID)
  })

  it('names the café in the freeze confirmation', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm')
    renderFor('active')
    await userEvent.click(screen.getByRole('button', { name: /freeze café/i }))

    expect(confirmSpy.mock.calls[0][0]).toContain('Himalayan Brew')
  })

  it('does nothing when the delete confirmation is declined', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderFor('active')
    await userEvent.click(screen.getByRole('button', { name: /delete café/i }))

    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('returns to the café list after a delete', async () => {
    renderFor('active')
    await userEvent.click(screen.getByRole('button', { name: /delete café/i }))

    expect(mockDelete).toHaveBeenCalledWith(CAFE_ID)
    expect(mockPush).toHaveBeenCalledWith('/admin/cafes')
  })

  // The refusal for a café with orders arrives this way, and it is the whole
  // point of the message — it has to be readable, not swallowed.
  it('shows the server refusal and stays on the page', async () => {
    mockDelete.mockResolvedValue({
      error: 'This café has 3 orders on record, so deleting it would take the order history with it. Freeze it instead — that blocks access and keeps the records.',
    })
    renderFor('active')
    await userEvent.click(screen.getByRole('button', { name: /delete café/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/3 orders on record/i)
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('shows a failed freeze', async () => {
    mockSuspend.mockResolvedValue({ error: 'Only an active café can be frozen.' })
    renderFor('active')
    await userEvent.click(screen.getByRole('button', { name: /freeze café/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/only an active café/i)
    expect(mockRefresh).not.toHaveBeenCalled()
  })
})
