import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChangePasswordForm } from '@/components/cafe/change-password-form'

vi.mock('@/lib/cafe/actions', () => ({
  changePassword: vi.fn(),
}))

import { changePassword } from '@/lib/cafe/actions'

const mockChangePassword = vi.mocked(changePassword)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ChangePasswordForm', () => {
  it('disables Update Password until both fields are filled', async () => {
    render(<ChangePasswordForm />)
    expect(screen.getByRole('button', { name: /update password/i })).toBeDisabled()

    await userEvent.type(screen.getByLabelText(/new password/i), 'newpass123')
    expect(screen.getByRole('button', { name: /update password/i })).toBeDisabled()

    await userEvent.type(screen.getByLabelText(/confirm password/i), 'newpass123')
    expect(screen.getByRole('button', { name: /update password/i })).not.toBeDisabled()
  })

  it('shows an error when the passwords do not match, without calling the action', async () => {
    render(<ChangePasswordForm />)
    await userEvent.type(screen.getByLabelText(/new password/i), 'newpass123')
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'different123')
    await userEvent.click(screen.getByRole('button', { name: /update password/i }))

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
    })
    expect(mockChangePassword).not.toHaveBeenCalled()
  })

  it('calls changePassword and shows a success message, clearing the fields', async () => {
    mockChangePassword.mockResolvedValue({ success: true })
    render(<ChangePasswordForm />)

    await userEvent.type(screen.getByLabelText(/new password/i), 'newpass123')
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'newpass123')
    await userEvent.click(screen.getByRole('button', { name: /update password/i }))

    await waitFor(() => {
      expect(mockChangePassword).toHaveBeenCalledWith('newpass123')
      expect(screen.getByText('Password updated!')).toBeInTheDocument()
    })
    expect(screen.getByLabelText(/new password/i)).toHaveValue('')
    expect(screen.getByLabelText(/confirm password/i)).toHaveValue('')
  })

  it('shows a server error message when the update fails', async () => {
    mockChangePassword.mockResolvedValue({ error: 'Password must be at least 8 characters' })
    render(<ChangePasswordForm />)

    await userEvent.type(screen.getByLabelText(/new password/i), 'shortpw1')
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'shortpw1')
    await userEvent.click(screen.getByRole('button', { name: /update password/i }))

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument()
    })
  })
})
