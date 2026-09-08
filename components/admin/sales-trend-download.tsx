'use client'

import { Download } from 'lucide-react'
import type { DailySales } from '@/lib/admin/dashboard'

// Excel opens CSV natively, and a UTF-8 BOM keeps it from mangling the
// "Rs." prefix or any non-ASCII café names that make it into a future column.
const CSV_BOM = '﻿'

export function buildSalesTrendCsv(data: DailySales[]): string {
  const rows = [
    ['Date', 'Total Sales (Rs.)'],
    ...data.map(d => [d.date, d.total.toFixed(2)]),
  ]
  return CSV_BOM + rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\r\n')
}

export function SalesTrendDownload({ data }: { data: DailySales[] }) {
  function handleDownload() {
    const csv = buildSalesTrendCsv(data)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const from = data[0]?.date ?? 'start'
    const to = data[data.length - 1]?.date ?? 'end'

    const link = document.createElement('a')
    link.href = url
    link.download = `sales-trend_${from}_to_${to}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={handleDownload}
      disabled={data.length === 0}
      className="flex items-center gap-1.5 font-display text-sm uppercase tracking-[0.12em] text-brand-700 transition-colors hover:text-brand-900 disabled:opacity-50"
    >
      <Download className="h-3.5 w-3.5" />
      Export
    </button>
  )
}
