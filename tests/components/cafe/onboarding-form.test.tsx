import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OnboardingForm } from '@/components/cafe/onboarding-form'

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

vi.mock('@/lib/cafe/actions', () => ({
  createCafeProfile: vi.fn(),
}))

import { createCafeProfile } from '@/lib/cafe/actions'

const mockCreate = vi.mocked(createCafeProfile)

beforeEach(() => {
  vi.clearAllMocks()
})

function fillForm(overrides: Partial<Record<string, string>> = {}) {
  const defaults = {
    'Café Name':         'Himalayan Brew',
    'Your Name':         'Ramesh Shrestha',
    'Phone Number':      '9841234567',
    'Neighborhood':      'Thamel',
    'Delivery Address':  'Ward 26, Thamel, Kathmandu',
  }
  return { ...defaults, ...overrides }
}

async function fillAndSubmit(fields: Record<string, string>) {
  await userEvent.type(screen.getByLabelText(/café name/i), fields['Café Name'])
  await userEvent.type(screen.getByLabelText(/your name/i), fields['Your Name'])
  await userEvent.type(screen.getByLabelText(/phone number/i), fields['Phone Number'])
  await userEvent.type(screen.getByLabelText(/neighborhood/i), fields['Neighborhood'])
  await userEvent.type(screen.getByLabelText(/delivery address/i), fields['Delivery Address'])
  await userEvent.click(screen.getByRole('button', { name: /submit application/i }))
}

describe('OnboardingForm', () => {
  it('renders all five required fields', () => {
    render(<OnboardingForm />)
    expect(screen.getByLabelText(/café name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/your name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/neighborhood/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/delivery address/i)).toBeInTheDocument()
  })

  it('shows the +977 prefix on the phone field', () => {
    render(<OnboardingForm />)
    expect(screen.getByText('+977')).toBeInTheDocument()
  })

  it('renders the submit button', () => {
    render(<OnboardingForm />)
    expect(screen.getByRole('button', { name: /submit application/i })).toBeInTheDocument()
  })

  it('calls createCafeProfile with form data and redirects on success', async () => {
    mockCreate.mockResolvedValue({ redirect: '/pending' })
    render(<OnboardingForm />)

    await fillAndSubmit(fillForm())

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledOnce()
      expect(mockPush).toHaveBeenCalledWith('/pending')
    })
  })

  it('displays a server error message when the action fails', async () => {
    mockCreate.mockResolvedValue({ error: 'Failed to save your profile. Please try again.' })
    render(<OnboardingForm />)

    await fillAndSubmit(fillForm())

    await waitFor(() => {
      expect(screen.getByText(/failed to save your profile/i)).toBeInTheDocument()
    })
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('disables the button while submission is in flight', async () => {
    // Hold the promise so the button stays in pending state
    let resolve!: (v: { redirect: string }) => void
    mockCreate.mockReturnValue(new Promise((r) => { resolve = r }))
    render(<OnboardingForm />)

    await fillAndSubmit(fillForm())

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /submitting/i })).toBeDisabled()
    })

    resolve({ redirect: '/pending' })
  })
})
