import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CafePricingTable } from '@/components/admin/cafe-pricing-table'
import type { CafeProductPricingRow } from '@/lib/types'

const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

vi.mock('@/lib/admin/actions', () => ({
  setCafeProductPrice: vi.fn(),
}))

import { setCafeProductPrice } from '@/lib/admin/actions'

const mockSetPrice = vi.mocked(setCafeProductPrice)

const rows: CafeProductPricingRow[] = [
  {
    product_id: 'product-1',
    name: 'Whole Milk',
    category: 'Dairy',
    unit: 'litre',
    base_price: 120,
    custom_price: null,
  },
  {
    product_id: 'product-2',
    name: 'Espresso Beans',
    category: 'Coffee Beans',
    unit: 'kg',
    base_price: 1200,
    custom_price: 1000,
  },
]

beforeEach(() => {
  vi.clearAllMocks()
})

describe('CafePricingTable', () => {
  it('shows an empty state with no products', () => {
    render(<CafePricingTable cafeId="cafe-1" rows={[]} />)
    expect(screen.getByText('No products in the catalog yet.')).toBeInTheDocument()
  })

  it('shows base price as the effective price when there is no override', () => {
    render(<CafePricingTable cafeId="cafe-1" rows={rows} />)
    const milkInput = screen.getByLabelText('Custom price for Whole Milk')
    expect(milkInput).toHaveValue(null)
    expect(milkInput).toHaveAttribute('placeholder', '120')
  })

  it('pre-fills the custom price and shows it as the effective price when overridden', () => {
    render(<CafePricingTable cafeId="cafe-1" rows={rows} />)
    expect(screen.getByLabelText('Custom price for Espresso Beans')).toHaveValue(1000)
    // Two "Rs. 1,000" occurrences: the custom price input's value isn't text, so just the effective column
    expect(screen.getAllByText('Rs. 1,000').length).toBeGreaterThan(0)
  })

  it('saves a new custom price on blur', async () => {
    mockSetPrice.mockResolvedValue({})
    render(<CafePricingTable cafeId="cafe-1" rows={rows} />)

    const milkInput = screen.getByLabelText('Custom price for Whole Milk')
    await userEvent.type(milkInput, '99')
    await userEvent.tab()

    await waitFor(() => {
      expect(mockSetPrice).toHaveBeenCalledWith('cafe-1', 'product-1', 99)
      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  it('clears the override when the input is emptied', async () => {
    mockSetPrice.mockResolvedValue({})
    render(<CafePricingTable cafeId="cafe-1" rows={rows} />)

    const beansInput = screen.getByLabelText('Custom price for Espresso Beans')
    await userEvent.clear(beansInput)
    await userEvent.tab()

    await waitFor(() => {
      expect(mockSetPrice).toHaveBeenCalledWith('cafe-1', 'product-2', null)
    })
  })

  it('shows an error and does not save for an invalid price', async () => {
    render(<CafePricingTable cafeId="cafe-1" rows={rows} />)

    const milkInput = screen.getByLabelText('Custom price for Whole Milk')
    await userEvent.type(milkInput, '-5')
    await userEvent.tab()

    await waitFor(() => {
      expect(screen.getByText('Enter a valid price')).toBeInTheDocument()
    })
    expect(mockSetPrice).not.toHaveBeenCalled()
  })

  it('does not call the action when the price is unchanged', async () => {
    render(<CafePricingTable cafeId="cafe-1" rows={rows} />)

    const milkInput = screen.getByLabelText('Custom price for Whole Milk')
    await userEvent.click(milkInput)
    await userEvent.tab()

    expect(mockSetPrice).not.toHaveBeenCalled()
  })
})
