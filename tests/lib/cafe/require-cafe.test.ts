import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Cafe } from '@/lib/types'

// The real redirect() throws to stop rendering; the mock does the same so
// control flow in the tests matches production.
const mockRedirect = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`)
})
vi.mock('next/navigation', () => ({ redirect: (url: string) => mockRedirect(url) }))

const mockGetCachedUser = vi.fn()
vi.mock('@/lib/supabase/user', () => ({
  getCachedUser: () => mockGetCachedUser(),
}))

const mockMaybeSingle = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: mockMaybeSingle }),
      }),
    }),
  }),
}))

vi.mock('@/lib/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const { getCafeProfile, requireActiveCafe } = await import('@/lib/cafe/require-cafe')

function makeCafe(overrides: Partial<Cafe> = {}): Cafe {
  return {
    id: 'cafe-1',
    name: 'Base Camp Coffee',
    contact_name: 'Pemba',
    phone: '9800000000',
    neighborhood: 'Thamel',
    delivery_address: 'Thamel Marg 12',
    status: 'active',
    credit_enabled: false,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetCachedUser.mockResolvedValue({ user: { id: 'cafe-1', email: null, app_metadata: {} } })
})

describe('requireActiveCafe', () => {
  it('returns the café profile when the account is approved', async () => {
    const cafe = makeCafe()
    mockMaybeSingle.mockResolvedValue({ data: cafe, error: null })

    const result = await requireActiveCafe()

    expect(result.cafe).toEqual(cafe)
    expect(result.user.id).toBe('cafe-1')
    expect(mockRedirect).not.toHaveBeenCalled()
  })

  it('sends a signed-out visitor to the login page', async () => {
    mockGetCachedUser.mockResolvedValue({ user: null })

    await expect(requireActiveCafe()).rejects.toThrow('REDIRECT:/login')
    expect(mockMaybeSingle).not.toHaveBeenCalled()
  })

  it('sends a user with no café profile to onboarding', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })

    await expect(requireActiveCafe()).rejects.toThrow('REDIRECT:/onboarding')
  })

  it.each(['pending', 'rejected'] as const)(
    'sends a %s café to the holding screen',
    async status => {
      mockMaybeSingle.mockResolvedValue({ data: makeCafe({ status }), error: null })

      await expect(requireActiveCafe()).rejects.toThrow('REDIRECT:/pending')
    },
  )

  it('reports the profile without gating for the pages that route on status', async () => {
    const cafe = makeCafe({ status: 'pending' })
    mockMaybeSingle.mockResolvedValue({ data: cafe, error: null })

    // /onboarding and /pending need the row to decide where to send someone,
    // so they read it without the redirects requireActiveCafe applies.
    const result = await getCafeProfile()

    expect(result.cafe).toEqual(cafe)
    expect(mockRedirect).not.toHaveBeenCalled()
  })

  it('fails loudly when the lookup errors instead of treating it as "not onboarded"', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: 'connection reset' } })

    // Redirecting an approved café into onboarding because the database
    // hiccuped would be worse than showing an error.
    await expect(requireActiveCafe()).rejects.toThrow('Failed to load café profile')
    expect(mockRedirect).not.toHaveBeenCalled()
  })
})
