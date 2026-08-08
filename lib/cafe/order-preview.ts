import type { OrderItemPreview } from '@/lib/types'

export interface OrderItemPreviewRow {
  order_id: string
  product_id: string
  quantity: number
  products: { name: string; image_url: string | null } | null
}

export function groupItemsByOrder(rows: OrderItemPreviewRow[]): Record<string, OrderItemPreview[]> {
  const grouped: Record<string, OrderItemPreview[]> = {}

  for (const row of rows) {
    const preview: OrderItemPreview = {
      product_id: row.product_id,
      name: row.products?.name ?? 'Unknown product',
      image_url: row.products?.image_url ?? null,
      quantity: row.quantity,
    }
    if (!grouped[row.order_id]) grouped[row.order_id] = []
    grouped[row.order_id].push(preview)
  }

  return grouped
}
