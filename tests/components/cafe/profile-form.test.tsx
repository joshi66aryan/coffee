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

function editButtons() {
  return screen.getAllByRole('button', { name: /^edit$/i })
}

describe('ProfileForm — view mode', () => {
  it('shows the café’s current details read-only, including email and phone', () => {
    render(<ProfileForm cafe={cafe} email="ramesh@example.com" />)
    expect(screen.getByText('Himalayan Brew')).toBeInTheDocument()
    expect(screen.getByText('Ramesh Shrestha')).toBeInTheDocument()
    expect(screen.getByText('ramesh@example.com')).toBeInTheDocument()
    expect(screen.getByText('+977 9800000000')).toBeInTheDocument()
    expect(screen.getByText('Thamel')).toBeInTheDocument()
    expect(screen.getByText('Ward 26, Thamel, Kathmandu')).toBeInTheDocument()
  })

  it('does not render editable inputs until an Edit button is clicked', () => {
    render(<ProfileForm cafe={cafe} email="ramesh@example.com" />)
    expect(screen.queryByLabelText(/café name/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/neighborhood/i)).not.toBeInTheDocument()
  })

  it('renders two independent Edit buttons, one per card', () => {
    render(<ProfileForm cafe={cafe} email="ramesh@example.com" />)
    expect(editButtons()).toHaveLength(2)
  })
})

describe('ProfileForm — Personal Information section is independent', () => {
  it('opens only the Personal Information fields, not Address', async () => {
    render(<ProfileForm cafe={cafe} email="ramesh@example.com" />)
    await userEvent.click(editButtons()[0])

    expect(screen.getByLabelText(/café name/i)).toHaveValue('Himalayan Brew')
    expect(screen.getByLabelText(/your name/i)).toHaveValue('Ramesh Shrestha')
    expect(screen.getByLabelText(/^phone/i)).toHaveValue('9800000000')
    expect(screen.getByLabelText(/^email$/i)).toBeDisabled()

    // Address stays in view mode — its inputs must not appear.
    expect(screen.queryByLabelText(/neighborhood/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/delivery address/i)).not.toBeInTheDocument()
    expect(screen.getByText('Thamel')).toBeInTheDocument()
  })

  it('disables Save Changes until a field is edited', async () => {
    render(<ProfileForm cafe={cafe} email="ramesh@example.com" />)
    await userEvent.click(editButtons()[0])
    expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled()
  })

  it('returns to view mode without saving when Cancel is clicked', async () => {
    render(<ProfileForm cafe={cafe} email="ramesh@example.com" />)
    await userEvent.click(editButtons()[0])
    await userEvent.type(screen.getByLabelText(/café name/i), ' 2')
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))

    expect(mockUpdate).not.toHaveBeenCalled()
    expect(screen.queryByLabelText(/café name/i)).not.toBeInTheDocument()
    expect(screen.getByText('Himalayan Brew')).toBeInTheDocument()
  })

  it('saves with the address fields carried forward unchanged', async () => {
    mockUpdate.mockResolvedValue({ success: true })
    render(<ProfileForm cafe={cafe} email="ramesh@example.com" />)

    await userEvent.click(editButtons()[0])
    await userEvent.type(screen.getByLabelText(/café name/i), ' 2')
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledOnce())
    const submittedData = mockUpdate.mock.calls[0][0]
    expect(submittedData.get('name')).toBe('Himalayan Brew 2')
    expect(submittedData.get('neighborhood')).toBe('Thamel')
    expect(submittedData.get('delivery_address')).toBe('Ward 26, Thamel, Kathmandu')
    expect(screen.queryByLabelText(/café name/i)).not.toBeInTheDocument()
  })

  it('shows a server error message and stays in edit mode when the update fails', async () => {
    mockUpdate.mockResolvedValue({ error: 'Failed to save changes. Please try again.' })
    render(<ProfileForm cafe={cafe} email="ramesh@example.com" />)

    await userEvent.click(editButtons()[0])
    await userEvent.type(screen.getByLabelText(/café name/i), ' 2')
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(screen.getByText('Failed to save changes. Please try again.')).toBeInTheDocument()
    })
    expect(screen.getByLabelText(/café name/i)).toBeInTheDocument()
  })
})

describe('ProfileForm — Address section is independent', () => {
  it('opens only the Address fields, not Personal Information', async () => {
    render(<ProfileForm cafe={cafe} email="ramesh@example.com" />)
    await userEvent.click(editButtons()[1])

    expect(screen.getByLabelText(/neighborhood/i)).toHaveValue('Thamel')
    expect(screen.getByLabelText(/delivery address/i)).toHaveValue('Ward 26, Thamel, Kathmandu')

    // Personal Information stays in view mode — its inputs must not appear.
    expect(screen.queryByLabelText(/café name/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/your name/i)).not.toBeInTheDocument()
    expect(screen.getByText('Himalayan Brew')).toBeInTheDocument()
  })

  it('saves with the personal fields carried forward unchanged', async () => {
    mockUpdate.mockResolvedValue({ success: true })
    render(<ProfileForm cafe={cafe} email="ramesh@example.com" />)

    await userEvent.click(editButtons()[1])
    await userEvent.type(screen.getByLabelText(/neighborhood/i), ' 2')
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledOnce())
    const submittedData = mockUpdate.mock.calls[0][0]
    expect(submittedData.get('neighborhood')).toBe('Thamel 2')
    expect(submittedData.get('name')).toBe('Himalayan Brew')
    expect(submittedData.get('contact_name')).toBe('Ramesh Shrestha')
    expect(submittedData.get('phone')).toBe('9800000000')
  })

  it('returns to view mode without saving when Cancel is clicked', async () => {
    render(<ProfileForm cafe={cafe} email="ramesh@example.com" />)
    await userEvent.click(editButtons()[1])
    await userEvent.type(screen.getByLabelText(/neighborhood/i), ' 2')
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))

    expect(mockUpdate).not.toHaveBeenCalled()
    expect(screen.queryByLabelText(/neighborhood/i)).not.toBeInTheDocument()
    expect(screen.getByText('Thamel')).toBeInTheDocument()
  })
})

describe('ProfileForm — both sections can be open at once without interfering', () => {
  it('editing Personal Information does not close or discard an open Address edit', async () => {
    render(<ProfileForm cafe={cafe} email="ramesh@example.com" />)

    // Grab both Edit buttons before clicking either — opening one unmounts
    // it from the query results, since its card leaves view mode.
    const [personalEdit, addressEdit] = editButtons()
    await userEvent.click(personalEdit)
    await userEvent.click(addressEdit)
    await userEvent.type(screen.getByLabelText(/neighborhood/i), ' 2')

    expect(screen.getByLabelText(/café name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/neighborhood/i)).toHaveValue('Thamel 2')
  })
})
