import { describe, it, expect } from 'vitest'
import { groupItemsByOrder, type OrderItemPreviewRow } from '@/lib/cafe/order-preview'

describe('groupItemsByOrder', () => {
  it('groups item rows by order_id', () => {
    const rows: OrderItemPreviewRow[] = [
      { order_id: 'order-1', product_id: 'p1', quantity: 2, products: { name: 'Whole Milk', image_url: null } },
      { order_id: 'order-1', product_id: 'p2', quantity: 1, products: { name: 'Espresso Beans', image_url: 'x.jpg' } },
      { order_id: 'order-2', product_id: 'p1', quantity: 3, products: { name: 'Whole Milk', image_url: null } },
    ]

    const grouped = groupItemsByOrder(rows)

    expect(Object.keys(grouped)).toEqual(['order-1', 'order-2'])
    expect(grouped['order-1']).toEqual([
      { product_id: 'p1', name: 'Whole Milk', image_url: null, quantity: 2 },
      { product_id: 'p2', name: 'Espresso Beans', image_url: 'x.jpg', quantity: 1 },
    ])
    expect(grouped['order-2']).toEqual([
      { product_id: 'p1', name: 'Whole Milk', image_url: null, quantity: 3 },
    ])
  })

  it('falls back to "Unknown product" and null image when the product relation is missing', () => {
    const rows: OrderItemPreviewRow[] = [
      { order_id: 'order-1', product_id: 'p1', quantity: 1, products: null },
    ]
    expect(groupItemsByOrder(rows)['order-1']).toEqual([
      { product_id: 'p1', name: 'Unknown product', image_url: null, quantity: 1 },
    ])
  })

  it('returns an empty object for no rows', () => {
    expect(groupItemsByOrder([])).toEqual({})
  })
})
