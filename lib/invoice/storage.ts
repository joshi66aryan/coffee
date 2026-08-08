// Invoice PDFs are stored at `${cafe_id}/${order_id}.pdf` so storage RLS can
// scope a café's reads to its own folder (see supabase/migrations/005_invoices.sql).
export function invoicePdfPath(cafeId: string, orderId: string): string {
  return `${cafeId}/${orderId}.pdf`
}

// Download links are generated fresh on each page load rather than stored —
// the PDF itself is only ever generated once (per PRD §4.6).
export const INVOICE_SIGNED_URL_TTL_SECONDS = 600
