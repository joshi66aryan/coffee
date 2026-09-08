import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CatalogClient } from '@/components/cafe/catalog-client'
import type { CatalogProduct } from '@/lib/types'

function makeProduct(overrides: Partial<CatalogProduct> = {}): CatalogProduct {
  return {
    id: 'p1',
    name: 'Everest Blend',
    category: 'Beans',
    unit: 'kg',
    base_price: 1200,
    effective_price: 1200,
    stock_status: 'in_stock',
    description: null,
    image_url: 'https://example.com/everest.jpg',
    created_at: '2026-01-01T00:00:00Z',
    archived_at: null,
    ...overrides,
  }
}

const products = ['Everest', 'Annapurna', 'Langtang', 'Manaslu', 'Dhaulagiri'].map((name, i) =>
  makeProduct({ id: `p${i + 1}`, name, image_url: `https://example.com/${name}.jpg` }),
)

beforeEach(() => {
  localStorage.clear()
})

describe('CatalogClient product images', () => {
  it('loads the first row eagerly — one of those photos is the largest thing on the screen', () => {
    render(<CatalogClient products={products} categories={['Beans']} />)

    // next/image drops the `loading` attribute entirely for a priority image
    // (eager is the browser default) and preloads it instead.
    for (const name of ['Everest', 'Annapurna', 'Langtang']) {
      expect(screen.getByAltText(name)).not.toHaveAttribute('loading', 'lazy')
    }
  })

  it('leaves the rest of the catalog lazy', () => {
    render(<CatalogClient products={products} categories={['Beans']} />)

    for (const name of ['Manaslu', 'Dhaulagiri']) {
      expect(screen.getByAltText(name)).toHaveAttribute('loading', 'lazy')
    }
  })
})
