// Formats a raw sequence value (from public.invoice_number_seq) as INV-001, INV-002, ...
export function formatInvoiceNumber(seq: number): string {
  return `INV-${String(seq).padStart(3, '0')}`
}
