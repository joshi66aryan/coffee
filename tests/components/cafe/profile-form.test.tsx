import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProfileForm } from '@/components/cafe/profile-form'
import type { Cafe } from '@/lib/types'

vi.mock('@/lib/cafe/actions', () => ({
  updateCafeProfile: vi.fn(),
}))

import { updateCafeProfile } from '@/lib/cafe/actions'

const mockUpdate = vi.mocked(updateCafeProfile)

const cafe: Cafe = {
  id: 'cafe-1',
  name: 'Himalayan Brew',
  contact_name: 'Ramesh Shrestha',
  phone: '+9779800000000',
  neighborhood: 'Thamel',
  delivery_address: 'Ward 26, Thamel, Kathmandu',
  status: 'active',
  credit_enabled: false,
  created_at: '2026-01-01T00:00:00.000Z',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ProfileForm', () => {
  it('pre-fills the form with the café’s current details', () => {
    render(<ProfileForm cafe={cafe} />)
    expect(screen.getByLabelText(/café name/i)).toHaveValue('Himalayan Brew')
    expect(screen.getByLabelText(/your name/i)).toHaveValue('Ramesh Shrestha')
    expect(screen.getByLabelText(/neighborhood/i)).toHaveValue('Thamel')
    expect(screen.getByLabelText(/delivery address/i)).toHaveValue('Ward 26, Thamel, Kathmandu')
  })

  it('does not render phone or credit info — that now lives on the Settings account card', () => {
    render(<ProfileForm cafe={cafe} />)
    expect(screen.queryByText('+9779800000000')).not.toBeInTheDocument()
    expect(screen.queryByText('Not enabled')).not.toBeInTheDocument()
  })

  it('disables Save Changes until a field is edited', () => {
    render(<ProfileForm cafe={cafe} />)
    expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled()
  })

  it('enables Save Changes once a field differs from the original value', async () => {
    render(<ProfileForm cafe={cafe} />)
    await userEvent.type(screen.getByLabelText(/café name/i), ' 2')
    expect(screen.getByRole('button', { name: /save changes/i })).not.toBeDisabled()
  })

  it('disables Save Changes again if the edit is reverted back to the original value', async () => {
    render(<ProfileForm cafe={cafe} />)
    const nameInput = screen.getByLabelText(/café name/i)
    await userEvent.type(nameInput, ' 2')
    await userEvent.type(nameInput, '{backspace}{backspace}')
    expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled()
  })

  it('calls updateCafeProfile with the edited fields and shows a saved message', async () => {
    mockUpdate.mockResolvedValue({ success: true })
    render(<ProfileForm cafe={cafe} />)

    await userEvent.type(screen.getByLabelText(/café name/i), ' 2')
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledOnce()
      expect(screen.getByText('Saved!')).toBeInTheDocument()
    })
  })

  it('disables Save Changes again after a successful save (new baseline)', async () => {
    mockUpdate.mockResolvedValue({ success: true })
    render(<ProfileForm cafe={cafe} />)

    await userEvent.type(screen.getByLabelText(/café name/i), ' 2')
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled()
    })
  })

  it('shows a server error message when the update fails', async () => {
    mockUpdate.mockResolvedValue({ error: 'Failed to save changes. Please try again.' })
    render(<ProfileForm cafe={cafe} />)

    await userEvent.type(screen.getByLabelText(/café name/i), ' 2')
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(screen.getByText('Failed to save changes. Please try again.')).toBeInTheDocument()
    })
    expect(screen.queryByText('Saved!')).not.toBeInTheDocument()
  })
})
