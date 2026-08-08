export type CafeStatus = 'pending' | 'active' | 'rejected'

export interface Cafe {
  id: string
  name: string
  contact_name: string
  phone: string
  neighborhood: string
  delivery_address: string
  status: CafeStatus
  credit_enabled: boolean
  created_at: string
}

export type StockStatus = 'in_stock' | 'low' | 'out_of_stock'

export interface CatalogProduct extends Product {
  effective_price: number
}

export interface Product {
  id: string
  name: string
  category: string
  unit: string
  base_price: number
  stock_status: StockStatus
  description: string | null
  image_url: string | null
  created_at: string
}

export interface CafeProductPrice {
  id: string
  cafe_id: string
  product_id: string
  custom_price: number
  created_at: string
}

export type OrderStatus = 'received' | 'confirmed' | 'out_for_delivery' | 'delivered'
export type PaymentType = 'cash' | 'credit'
export type PaymentStatus = 'paid' | 'pending' | 'due'

export interface Order {
  id: string
  cafe_id: string
  status: OrderStatus
  total_amount: number
  payment_type: PaymentType
  payment_status: PaymentStatus
  invoice_number: string | null
  delivery_date: string | null
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  quantity: number
  unit_price_at_time_of_order: number
}

export interface AdminOrder extends Order {
  cafe_name: string
}

export interface OrderLineItem {
  id: string
  product_id: string
  name: string
  unit: string
  quantity: number
  unit_price_at_time_of_order: number
}

export interface CafeProductPricingRow {
  product_id: string
  name: string
  category: string
  unit: string
  base_price: number
  custom_price: number | null
}

export interface OrderItemPreview {
  product_id: string
  name: string
  image_url: string | null
  quantity: number
}

export interface OrderWithPreview extends Order {
  items: OrderItemPreview[]
}

export interface Invoice {
  id: string
  order_id: string
  invoice_number: string
  pdf_path: string
  generated_at: string
}

export interface InvoiceDownload {
  invoiceNumber: string
  downloadUrl: string
}
