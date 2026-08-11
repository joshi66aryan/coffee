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
  getSubstituteProducts: vi.fn(),
}))

vi.mock('@/lib/cafe/order-actions', () => ({
  placeOrder: vi.fn(),
}))

import { getCartProducts, getSubstituteProducts } from '@/lib/cafe/catalog-actions'
import { placeOrder } from '@/lib/cafe/order-actions'

const mockGetCartProducts = vi.mocked(getCartProducts)
const mockGetSubstituteProducts = vi.mocked(getSubstituteProducts)
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
  mockGetSubstituteProducts.mockResolvedValue([])
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
    // No substitute exists for this item — copy must not promise one.
    expect(screen.getByText(/remove them to place your order/i)).toBeInTheDocument()
    expect(screen.queryByText(/swap for a suggested alternative/i)).not.toBeInTheDocument()

    const placeButton = screen.getByRole('button', { name: /remove unavailable items to continue/i })
    expect(placeButton).toBeDisabled()
  })

  it('offers an in-category substitute for an out-of-stock item', async () => {
    localStorage.setItem('sherpa-cart', JSON.stringify({ 'product-1': 1, 'product-2': 1 }))
    mockGetCartProducts.mockResolvedValue([
      makeProduct(),
      makeProduct({ id: 'product-2', name: 'Vanilla Syrup', category: 'Syrups', stock_status: 'out_of_stock' }),
    ])
    mockGetSubstituteProducts.mockResolvedValue([
      makeProduct({ id: 'product-3', name: 'Caramel Syrup', category: 'Syrups', effective_price: 450 }),
    ])

    render(<CartSection creditEnabled={false} />)

    await waitFor(() => expect(screen.getByText('Vanilla Syrup')).toBeInTheDocument())
    await waitFor(() =>
      expect(mockGetSubstituteProducts).toHaveBeenCalledWith(['Syrups'], ['product-1', 'product-2'])
    )
    expect(await screen.findByRole('button', { name: /Caramel Syrup/i })).toBeInTheDocument()
    expect(screen.getByText(/swap for a suggested alternative/i)).toBeInTheDocument()
  })

  it('swapping to a substitute removes the out-of-stock item, adds the replacement, and re-enables Place Order', async () => {
    localStorage.setItem('sherpa-cart', JSON.stringify({ 'product-1': 1, 'product-2': 2 }))
    mockGetCartProducts.mockResolvedValue([
      makeProduct(),
      makeProduct({ id: 'product-2', name: 'Vanilla Syrup', category: 'Syrups', stock_status: 'out_of_stock' }),
    ])
    mockGetSubstituteProducts.mockResolvedValue([
      makeProduct({ id: 'product-3', name: 'Caramel Syrup', category: 'Syrups', effective_price: 450 }),
    ])

    render(<CartSection creditEnabled={false} />)

    const swapButton = await screen.findByRole('button', { name: /Caramel Syrup/i })
    await userEvent.click(swapButton)

    await waitFor(() => expect(screen.queryByText('Vanilla Syrup')).not.toBeInTheDocument())
    expect(screen.getByText('Caramel Syrup')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /place order/i })).not.toBeDisabled()
    expect(JSON.parse(localStorage.getItem('sherpa-cart') ?? '{}')).toEqual({
      'product-1': 1,
      'product-3': 2,
    })
  })

  it('does not show a swap strip when no in-category substitute is in stock', async () => {
    localStorage.setItem('sherpa-cart', JSON.stringify({ 'product-1': 1, 'product-2': 1 }))
    mockGetCartProducts.mockResolvedValue([
      makeProduct(),
      makeProduct({ id: 'product-2', name: 'Vanilla Syrup', category: 'Syrups', stock_status: 'out_of_stock' }),
    ])
    mockGetSubstituteProducts.mockResolvedValue([])

    render(<CartSection creditEnabled={false} />)

    await waitFor(() => expect(screen.getByText('Vanilla Syrup')).toBeInTheDocument())
    expect(screen.queryByText('Swap:')).not.toBeInTheDocument()
    expect(screen.getByText(/remove them to place your order/i)).toBeInTheDocument()
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

  it('shows a warning and disables Place Order when the café profile is incomplete', async () => {
    localStorage.setItem('sherpa-cart', JSON.stringify({ 'product-1': 2 }))
    mockGetCartProducts.mockResolvedValue([makeProduct()])

    render(<CartSection creditEnabled={false} profileComplete={false} />)

    await waitFor(() => expect(screen.getByText('Espresso Beans')).toBeInTheDocument())
    expect(screen.getByText(/add your phone number and delivery address/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /complete your profile to continue/i })).toBeDisabled()
    expect(mockPlaceOrder).not.toHaveBeenCalled()
  })

  it('asks for confirmation before placing a large order, and cancelling does not submit', async () => {
    localStorage.setItem('sherpa-cart', JSON.stringify({ 'product-1': 30 }))
    mockGetCartProducts.mockResolvedValue([makeProduct()]) // 30 * 800 = Rs. 24,000 — above threshold

    render(<CartSection creditEnabled={false} />)

    await waitFor(() => expect(screen.getByText('Espresso Beans')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: /place order/i }))

    expect(screen.getByText(/this is a large order/i)).toBeInTheDocument()
    expect(mockPlaceOrder).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: /review cart/i }))
    expect(screen.queryByText(/this is a large order/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /place order/i })).toBeInTheDocument()
  })

  it('places the order after confirming a large order', async () => {
    localStorage.setItem('sherpa-cart', JSON.stringify({ 'product-1': 30 }))
    mockGetCartProducts.mockResolvedValue([makeProduct()])
    mockPlaceOrder.mockResolvedValue({ orderId: 'order-456' })

    render(<CartSection creditEnabled={false} />)

    await waitFor(() => expect(screen.getByText('Espresso Beans')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: /place order/i }))
    await userEvent.click(screen.getByRole('button', { name: /confirm & place order/i }))

    await waitFor(() => {
      expect(mockPlaceOrder).toHaveBeenCalledWith({
        items: [{ product_id: 'product-1', quantity: 30 }],
        payment_type: 'cash',
      })
      expect(mockPush).toHaveBeenCalledWith('/order/confirm?orderId=order-456')
    })
  })
})
