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

async function enterEditMode({ hasPassword = true }: { hasPassword?: boolean } = {}) {
  render(<ChangePasswordForm hasPassword={hasPassword} />)
  await userEvent.click(screen.getByRole('button', { name: /^edit$/i }))
}

/** The current-password challenge, filled the way a real user would. */
async function reauthenticate(password = 'oldpass123') {
  await userEvent.type(screen.getByLabelText(/current password/i), password)
}

describe('ChangePasswordForm — view mode', () => {
  it('shows a masked password with an Edit button, no password inputs', () => {
    render(<ChangePasswordForm />)
    expect(screen.getByText('••••••••••')).toBeInTheDocument()
    expect(screen.queryByLabelText(/new password/i)).not.toBeInTheDocument()
  })

  it('enters edit mode when Edit is clicked', async () => {
    await enterEditMode()
    expect(screen.getByLabelText(/new password/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
  })
})

describe('ChangePasswordForm — re-authentication', () => {
  it('asks for the current password before letting a new one be set', async () => {
    await enterEditMode()
    expect(screen.getByLabelText(/current password/i)).toBeInTheDocument()
  })

  it('keeps Update Password disabled while the current password is blank', async () => {
    await enterEditMode()

    await userEvent.type(screen.getByLabelText(/new password/i), 'newpass123')
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'newpass123')
    expect(screen.getByRole('button', { name: /update password/i })).toBeDisabled()

    await reauthenticate()
    expect(screen.getByRole('button', { name: /update password/i })).not.toBeDisabled()
  })

  it('sends the current password to the server for verification', async () => {
    mockChangePassword.mockResolvedValue({ success: true })
    await enterEditMode()

    await reauthenticate('oldpass123')
    await userEvent.type(screen.getByLabelText(/new password/i), 'newpass123')
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'newpass123')
    await userEvent.click(screen.getByRole('button', { name: /update password/i }))

    await waitFor(() => {
      expect(mockChangePassword).toHaveBeenCalledWith('oldpass123', 'newpass123')
    })
  })

  it('surfaces a rejected current password and stays in edit mode', async () => {
    mockChangePassword.mockResolvedValue({ error: 'Your current password is not correct.' })
    await enterEditMode()

    await reauthenticate('wrong-one')
    await userEvent.type(screen.getByLabelText(/new password/i), 'newpass123')
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'newpass123')
    await userEvent.click(screen.getByRole('button', { name: /update password/i }))

    await waitFor(() => {
      expect(screen.getByText('Your current password is not correct.')).toBeInTheDocument()
    })
    expect(screen.getByLabelText(/new password/i)).toBeInTheDocument()
  })
})

describe('ChangePasswordForm — an account with no password yet', () => {
  // Signed up with Google: there is no existing password to challenge against,
  // so demanding one would make it impossible to ever set a first.
  it('does not ask for a current password, and explains why', async () => {
    await enterEditMode({ hasPassword: false })

    expect(screen.queryByLabelText(/current password/i)).not.toBeInTheDocument()
    expect(screen.getByText(/signed up with google/i)).toBeInTheDocument()
  })

  it('lets a first password be set with the two new-password fields alone', async () => {
    mockChangePassword.mockResolvedValue({ success: true })
    await enterEditMode({ hasPassword: false })

    await userEvent.type(screen.getByLabelText(/new password/i), 'newpass123')
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'newpass123')
    expect(screen.getByRole('button', { name: /update password/i })).not.toBeDisabled()

    await userEvent.click(screen.getByRole('button', { name: /update password/i }))

    await waitFor(() => {
      expect(mockChangePassword).toHaveBeenCalledWith('', 'newpass123')
    })
  })
})

describe('ChangePasswordForm — edit mode', () => {
  it('does not show password strength feedback until typing starts', async () => {
    await enterEditMode()
    expect(screen.queryByText(/uppercase letter/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/^(too weak|weak|fair|good|strong)$/i)).not.toBeInTheDocument()

    await userEvent.type(screen.getByLabelText(/new password/i), 'a')
    expect(screen.getByText(/uppercase letter/i)).toBeInTheDocument()
  })

  it('updates the live strength feedback as the password is typed', async () => {
    await enterEditMode()

    await userEvent.type(screen.getByLabelText(/new password/i), 'abc')
    expect(screen.getByText(/too weak/i)).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText(/new password/i), '123XYZ!!!!')
    expect(screen.getByText(/strong/i)).toBeInTheDocument()
  })

  it('disables Update Password until every field is filled', async () => {
    await enterEditMode()
    expect(screen.getByRole('button', { name: /update password/i })).toBeDisabled()

    await reauthenticate()
    expect(screen.getByRole('button', { name: /update password/i })).toBeDisabled()

    await userEvent.type(screen.getByLabelText(/new password/i), 'newpass123')
    expect(screen.getByRole('button', { name: /update password/i })).toBeDisabled()

    await userEvent.type(screen.getByLabelText(/confirm password/i), 'newpass123')
    expect(screen.getByRole('button', { name: /update password/i })).not.toBeDisabled()
  })

  it('returns to view mode without calling the action when Cancel is clicked', async () => {
    await enterEditMode()
    await userEvent.type(screen.getByLabelText(/new password/i), 'newpass123')
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))

    expect(mockChangePassword).not.toHaveBeenCalled()
    expect(screen.queryByLabelText(/new password/i)).not.toBeInTheDocument()
    expect(screen.getByText('••••••••••')).toBeInTheDocument()
  })

  it('shows an error when the passwords do not match, without calling the action', async () => {
    await enterEditMode()
    await reauthenticate()
    await userEvent.type(screen.getByLabelText(/new password/i), 'newpass123')
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'different123')
    await userEvent.click(screen.getByRole('button', { name: /update password/i }))

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
    })
    expect(mockChangePassword).not.toHaveBeenCalled()
  })

  it('calls changePassword and returns to view mode showing a success message', async () => {
    mockChangePassword.mockResolvedValue({ success: true })
    await enterEditMode()

    await reauthenticate()
    await userEvent.type(screen.getByLabelText(/new password/i), 'newpass123')
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'newpass123')
    await userEvent.click(screen.getByRole('button', { name: /update password/i }))

    await waitFor(() => {
      expect(screen.getByText('Password updated!')).toBeInTheDocument()
    })
    expect(screen.queryByLabelText(/new password/i)).not.toBeInTheDocument()
  })

  it('shows a server error message and stays in edit mode when the update fails', async () => {
    mockChangePassword.mockResolvedValue({ error: 'Password must be at least 8 characters' })
    await enterEditMode()

    await reauthenticate()
    await userEvent.type(screen.getByLabelText(/new password/i), 'shortpw1a')
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'shortpw1a')
    await userEvent.click(screen.getByRole('button', { name: /update password/i }))

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument()
    })
    expect(screen.getByLabelText(/new password/i)).toBeInTheDocument()
  })
})
