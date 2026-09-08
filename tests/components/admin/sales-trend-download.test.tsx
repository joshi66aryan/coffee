import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SalesTrendDownload, buildSalesTrendCsv } from '@/components/admin/sales-trend-download'
import type { DailySales } from '@/lib/admin/dashboard'

const data: DailySales[] = [
  { date: '2026-08-05', total: 1000 },
  { date: '2026-08-06', total: 2000.5 },
]

describe('buildSalesTrendCsv', () => {
  it('produces a header row plus one row per day', () => {
    const csv = buildSalesTrendCsv(data)
    const lines = csv.replace(/^﻿/, '').split('\r\n')
    expect(lines[0]).toBe('"Date","Total Sales (Rs.)"')
    expect(lines[1]).toBe('"2026-08-05","1000.00"')
    expect(lines[2]).toBe('"2026-08-06","2000.50"')
  })
})

describe('SalesTrendDownload', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('is disabled when there is no data', () => {
    render(<SalesTrendDownload data={[]} />)
    expect(screen.getByRole('button', { name: /export/i })).toBeDisabled()
  })

  it('triggers a CSV download when clicked', async () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

    render(<SalesTrendDownload data={data} />)
    await userEvent.click(screen.getByRole('button', { name: /export/i }))

    expect(clickSpy).toHaveBeenCalled()
    expect(URL.createObjectURL).toHaveBeenCalled()
  })
})
