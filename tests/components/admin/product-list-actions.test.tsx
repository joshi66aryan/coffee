import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StockToggle, DeleteProductButton } from '@/components/admin/product-list-actions'

const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

vi.mock('@/lib/admin/actions', () => ({
  deleteProduct: vi.fn(),
  updateStockStatus: vi.fn(),
}))

import { deleteProduct, updateStockStatus } from '@/lib/admin/actions'

const mockDeleteProduct = vi.mocked(deleteProduct)
const mockUpdateStockStatus = vi.mocked(updateStockStatus)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('StockToggle', () => {
  it('shows the current status label', () => {
    render(<StockToggle id="product-1" status="in_stock" />)
    expect(screen.getByRole('button', { name: 'In Stock' })).toBeInTheDocument()
  })

  it('cycles in_stock -> low -> out_of_stock -> in_stock on each click', async () => {
    mockUpdateStockStatus.mockResolvedValue({})
    render(<StockToggle id="product-1" status="in_stock" />)

    await userEvent.click(screen.getByRole('button', { name: 'In Stock' }))
    await waitFor(() => expect(mockUpdateStockStatus).toHaveBeenCalledWith('product-1', 'low'))

    mockUpdateStockStatus.mockClear()
    render(<StockToggle id="product-1" status="low" />)
    await userEvent.click(screen.getByRole('button', { name: 'Low' }))
    await waitFor(() => expect(mockUpdateStockStatus).toHaveBeenCalledWith('product-1', 'out_of_stock'))

    mockUpdateStockStatus.mockClear()
    render(<StockToggle id="product-1" status="out_of_stock" />)
    await userEvent.click(screen.getByRole('button', { name: 'Out of Stock' }))
    await waitFor(() => expect(mockUpdateStockStatus).toHaveBeenCalledWith('product-1', 'in_stock'))
  })
})

describe('DeleteProductButton', () => {
  beforeEach(() => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.spyOn(window, 'alert').mockImplementation(() => {})
  })

  it('does nothing when the confirmation is declined', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<DeleteProductButton id="product-1" name="Espresso Beans" />)

    await userEvent.click(screen.getByRole('button', { name: /delete/i }))

    expect(window.confirm).toHaveBeenCalledWith('Delete "Espresso Beans"? This cannot be undone.')
    expect(mockDeleteProduct).not.toHaveBeenCalled()
  })

  it('deletes the product and refreshes on success (or archives it — same UI either way)', async () => {
    mockDeleteProduct.mockResolvedValue({})
    render(<DeleteProductButton id="product-1" name="Espresso Beans" />)

    await userEvent.click(screen.getByRole('button', { name: /delete/i }))

    await waitFor(() => {
      expect(mockDeleteProduct).toHaveBeenCalledWith('product-1')
      expect(mockRefresh).toHaveBeenCalled()
    })
    expect(window.alert).not.toHaveBeenCalled()
  })

  it('shows an alert and does not refresh when deletion fails', async () => {
    mockDeleteProduct.mockResolvedValue({ error: 'Something went wrong' })
    render(<DeleteProductButton id="product-1" name="Espresso Beans" />)

    await userEvent.click(screen.getByRole('button', { name: /delete/i }))

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Failed to delete: Something went wrong')
    })
    expect(mockRefresh).not.toHaveBeenCalled()
  })
})
