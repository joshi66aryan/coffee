import { Document, Page, View, Text, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import type { InvoiceData } from './data'

const PAYMENT_STATUS_LABEL: Record<InvoiceData['paymentStatus'], string> = {
  paid: 'Paid',
  pending: 'Pending',
  due: 'Due',
}

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, color: '#111827', fontFamily: 'Helvetica' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  brand: { fontSize: 18, fontWeight: 700 },
  invoiceTitle: { fontSize: 14, fontWeight: 700, textAlign: 'right' },
  meta: { fontSize: 10, color: '#6B7280', textAlign: 'right', marginTop: 2 },
  section: { marginBottom: 20 },
  label: { fontSize: 9, color: '#6B7280', textTransform: 'uppercase', marginBottom: 2 },
  value: { fontSize: 11 },
  table: { borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  tableHeaderRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  colName: { flex: 3 },
  colQty: { flex: 1, textAlign: 'right' },
  colUnitPrice: { flex: 1.5, textAlign: 'right' },
  colTotal: { flex: 1.5, textAlign: 'right' },
  tableHeaderText: { fontSize: 9, color: '#6B7280', textTransform: 'uppercase' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#111827',
  },
  totalLabel: { fontSize: 11, fontWeight: 700, marginRight: 12 },
  totalValue: { fontSize: 11, fontWeight: 700 },
  footer: { marginTop: 28, fontSize: 9, color: '#9CA3AF' },
})

function formatPrice(amount: number): string {
  return `Rs. ${amount.toLocaleString('en-IN')}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function InvoiceDocument({ data }: { data: InvoiceData }) {
  const shortOrderId = data.orderId.split('-')[0].toUpperCase()

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <Text style={styles.brand}>Sherpa Sips</Text>
          <View>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.meta}>{data.invoiceNumber}</Text>
            <Text style={styles.meta}>{formatDate(data.orderDate)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Billed to</Text>
          <Text style={styles.value}>{data.cafeName}</Text>
          <Text style={styles.value}>{data.cafeAddress}</Text>
          <Text style={[styles.label, { marginTop: 8 }]}>Order</Text>
          <Text style={styles.value}>#{shortOrderId}</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderText, styles.colName]}>Item</Text>
            <Text style={[styles.tableHeaderText, styles.colQty]}>Qty</Text>
            <Text style={[styles.tableHeaderText, styles.colUnitPrice]}>Unit Price</Text>
            <Text style={[styles.tableHeaderText, styles.colTotal]}>Total</Text>
          </View>
          {data.items.map((item, index) => (
            <View style={styles.tableRow} key={index}>
              <Text style={styles.colName}>{item.name}</Text>
              <Text style={styles.colQty}>
                {item.quantity} {item.unit}
              </Text>
              <Text style={styles.colUnitPrice}>{formatPrice(item.unitPrice)}</Text>
              <Text style={styles.colTotal}>{formatPrice(item.lineTotal)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatPrice(data.totalAmount)}</Text>
        </View>

        <View style={styles.footer}>
          <Text>
            Payment: {data.paymentType === 'cash' ? 'Cash' : 'Credit'} — {PAYMENT_STATUS_LABEL[data.paymentStatus]}
          </Text>
        </View>
      </Page>
    </Document>
  )
}

export async function renderInvoicePdf(data: InvoiceData): Promise<Buffer> {
  return renderToBuffer(<InvoiceDocument data={data} />)
}
