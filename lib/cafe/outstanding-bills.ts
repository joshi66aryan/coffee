export interface OutstandingBillsSummary {
  count: number
  totalAmount: number
}

export function summarizeOutstandingBills(orders: { total_amount: number }[]): OutstandingBillsSummary {
  return {
    count: orders.length,
    totalAmount: orders.reduce((sum, o) => sum + o.total_amount, 0),
  }
}
