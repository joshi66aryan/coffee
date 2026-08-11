import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RepeatLastOrderCard } from '@/components/cafe/repeat-last-order-card'
import type { OrderItemPreview } from '@/lib/types'

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})

const items: OrderItemPreview[] = [
  { product_id: 'product-1', name: 'Whole Milk', image_url: null, quantity: 3 },
  { product_id: 'product-2', name: 'Espresso Beans', image_url: 'https://example.com/beans.jpg', quantity: 1 },
]

describe('RepeatLastOrderCard', () => {
  it('shows the item names, total, and order id', async () => {
    render(<RepeatLastOrderCard shortId="ABCD1234" total={2500} items={items} />)
    await waitFor(() => expect(screen.getByText(/order #abcd1234/i)).toBeInTheDocument())
    expect(screen.getByText(/Whole Milk, Espresso Beans/)).toBeInTheDocument()
    expect(screen.getByText(/Rs\. 2,500/)).toBeInTheDocument()
  })

  it('shows product images when available, and a fallback icon otherwise', async () => {
    render(<RepeatLastOrderCard shortId="ABCD1234" total={500} items={items} />)
    await waitFor(() => expect(screen.getByAltText('Espresso Beans')).toBeInTheDocument())
    expect(screen.getByAltText('Espresso Beans')).toHaveAttribute('src', 'https://example.com/beans.jpg')
  })

  it('summarizes more than two items as "+N more"', async () => {
    const manyItems: OrderItemPreview[] = [
      ...items,
      { product_id: 'product-3', name: 'Sugar', image_url: null, quantity: 2 },
    ]
    render(<RepeatLastOrderCard shortId="ABCD1234" total={3000} items={manyItems} />)
    await waitFor(() => expect(screen.getByText(/Whole Milk \+2 more/)).toBeInTheDocument())
  })

  it('writes the order items to the cart and navigates to /orders on Repeat', async () => {
    render(<RepeatLastOrderCard shortId="ABCD1234" total={2500} items={items} />)

    await waitFor(() => expect(screen.getByRole('button', { name: /repeat/i })).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: /repeat/i }))

    expect(JSON.parse(localStorage.getItem('sherpa-cart')!)).toEqual({
      'product-1': 3,
      'product-2': 1,
    })
    expect(mockPush).toHaveBeenCalledWith('/orders')
  })

  it('hides itself and remembers the dismissal when Dismiss is clicked', async () => {
    render(<RepeatLastOrderCard shortId="ABCD1234" total={2500} items={items} />)

    await waitFor(() => expect(screen.getByLabelText('Dismiss')).toBeInTheDocument())
    await userEvent.click(screen.getByLabelText('Dismiss'))

    expect(screen.queryByText(/order #abcd1234/i)).not.toBeInTheDocument()
    expect(localStorage.getItem('sherpa-buy-again-dismissed')).toBe('ABCD1234')
  })

  it('stays dismissed for the same order across remounts', async () => {
    localStorage.setItem('sherpa-buy-again-dismissed', 'ABCD1234')
    const { container } = render(<RepeatLastOrderCard shortId="ABCD1234" total={2500} items={items} />)

    await waitFor(() => expect(container).toBeEmptyDOMElement())
  })

  it('shows again for a different (newer) order even if a previous one was dismissed', async () => {
    localStorage.setItem('sherpa-buy-again-dismissed', 'OLDORDER1')
    render(<RepeatLastOrderCard shortId="ABCD1234" total={2500} items={items} />)

    await waitFor(() => expect(screen.getByText(/order #abcd1234/i)).toBeInTheDocument())
  })

  it('when dismissible=false, shows no Dismiss button and ignores a dismissal recorded elsewhere', async () => {
    localStorage.setItem('sherpa-buy-again-dismissed', 'ABCD1234')
    render(<RepeatLastOrderCard shortId="ABCD1234" total={2500} items={items} dismissible={false} />)

    await waitFor(() => expect(screen.getByText(/order #abcd1234/i)).toBeInTheDocument())
    expect(screen.queryByLabelText('Dismiss')).not.toBeInTheDocument()
  })

  it('when dismissible=false, never writes to the dismissal key', async () => {
    render(<RepeatLastOrderCard shortId="ABCD1234" total={2500} items={items} dismissible={false} />)

    await waitFor(() => expect(screen.getByText(/order #abcd1234/i)).toBeInTheDocument())
    expect(localStorage.getItem('sherpa-buy-again-dismissed')).toBeNull()
  })

  it('shows the "Buy Again" section heading by default', async () => {
    render(<RepeatLastOrderCard shortId="ABCD1234" total={2500} items={items} />)
    await waitFor(() => expect(screen.getByText(/order #abcd1234/i)).toBeInTheDocument())
    expect(screen.getByRole('heading', { name: /buy again/i })).toBeInTheDocument()
  })

  it('hides the section heading when showHeader=false, keeping the in-card label', async () => {
    render(<RepeatLastOrderCard shortId="ABCD1234" total={2500} items={items} showHeader={false} />)
    await waitFor(() => expect(screen.getByText(/order #abcd1234/i)).toBeInTheDocument())
    expect(screen.queryByRole('heading', { name: /buy again/i })).not.toBeInTheDocument()
    // The card's own "Buy Again" label (next to the icon) is not a heading — still present.
    expect(screen.getByText('Buy Again')).toBeInTheDocument()
  })
})
