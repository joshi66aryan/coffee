import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CartSection } from '@/components/cafe/cart-section'
import type { CatalogProduct } from '@/lib/types'

const mockPush = vi.fn()
const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}))

vi.mock('@/lib/cafe/catalog-actions', () => ({
  getCartProducts: vi.fn(),
}))

vi.mock('@/lib/cafe/order-actions', () => ({
  placeOrder: vi.fn(),
}))

import { getCartProducts } from '@/lib/cafe/catalog-actions'
import { placeOrder } from '@/lib/cafe/order-actions'

const mockGetCartProducts = vi.mocked(getCartProducts)
const mockPlaceOrder = vi.mocked(placeOrder)

function makeProduct(overrides: Partial<CatalogProduct> = {}): CatalogProduct {
  return {
    id: 'product-1',
    name: 'Espresso Beans',
    category: 'Coffee',
    unit: 'kg',
    base_price: 800,
    stock_status: 'in_stock',
    description: null,
    image_url: null,
    created_at: '2026-08-01T10:00:00.000Z',
    effective_price: 800,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})

describe('CartSection', () => {
  it('renders nothing when the cart is empty', async () => {
    const { container } = render(<CartSection creditEnabled={false} />)
    await waitFor(() => expect(container).toBeEmptyDOMElement())
    expect(mockGetCartProducts).not.toHaveBeenCalled()
  })

  it('renders cart items and the total when all items are in stock', async () => {
    localStorage.setItem('sherpa-cart', JSON.stringify({ 'product-1': 2 }))
    mockGetCartProducts.mockResolvedValue([makeProduct()])

    render(<CartSection creditEnabled={false} />)

    await waitFor(() => expect(screen.getByText('Espresso Beans')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /place order/i })).not.toBeDisabled()
    expect(screen.queryByText(/no longer in stock/i)).not.toBeInTheDocument()
  })

  it('flags an out-of-stock item, offers a Remove action, and disables Place Order', async () => {
    localStorage.setItem('sherpa-cart', JSON.stringify({ 'product-1': 1, 'product-2': 1 }))
    mockGetCartProducts.mockResolvedValue([
      makeProduct(),
      makeProduct({ id: 'product-2', name: 'Vanilla Syrup', stock_status: 'out_of_stock' }),
    ])

    render(<CartSection creditEnabled={false} />)

    await waitFor(() => expect(screen.getByText('Vanilla Syrup')).toBeInTheDocument())
    expect(screen.getByText('Out of Stock')).toBeInTheDocument()
    expect(screen.getByText(/some items are no longer in stock/i)).toBeInTheDocument()

    const placeButton = screen.getByRole('button', { name: /remove unavailable items to continue/i })
    expect(placeButton).toBeDisabled()
  })

  it('removing the out-of-stock item re-enables Place Order', async () => {
    localStorage.setItem('sherpa-cart', JSON.stringify({ 'product-1': 1, 'product-2': 1 }))
    mockGetCartProducts.mockResolvedValue([
      makeProduct(),
      makeProduct({ id: 'product-2', name: 'Vanilla Syrup', stock_status: 'out_of_stock' }),
    ])

    render(<CartSection creditEnabled={false} />)

    await waitFor(() => expect(screen.getByText('Vanilla Syrup')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: 'Remove' }))

    await waitFor(() => expect(screen.queryByText('Vanilla Syrup')).not.toBeInTheDocument())
    expect(screen.getByRole('button', { name: /place order/i })).not.toBeDisabled()
  })

  it('places the order and redirects to the confirmation page on success', async () => {
    localStorage.setItem('sherpa-cart', JSON.stringify({ 'product-1': 2 }))
    mockGetCartProducts.mockResolvedValue([makeProduct()])
    mockPlaceOrder.mockResolvedValue({ orderId: 'order-123' })

    render(<CartSection creditEnabled={false} />)

    await waitFor(() => expect(screen.getByText('Espresso Beans')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: /place order/i }))

    await waitFor(() => {
      expect(mockPlaceOrder).toHaveBeenCalledWith({
        items: [{ product_id: 'product-1', quantity: 2 }],
        payment_type: 'cash',
      })
      expect(mockPush).toHaveBeenCalledWith('/order/confirm?orderId=order-123')
    })
  })
})
