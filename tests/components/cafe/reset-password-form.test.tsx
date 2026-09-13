import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ResetPasswordForm } from '@/components/cafe/reset-password-form'

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }))

vi.mock('@/lib/cafe/actions', () => ({ completePasswordReset: vi.fn() }))

import { completePasswordReset } from '@/lib/cafe/actions'

const mockComplete = vi.mocked(completePasswordReset)

beforeEach(() => {
  vi.clearAllMocks()
})

async function fill(newPassword: string, confirmation = newPassword) {
  render(<ResetPasswordForm />)
  await userEvent.type(screen.getByLabelText(/new password/i), newPassword)
  await userEvent.type(screen.getByLabelText(/confirm password/i), confirmation)
}

describe('ResetPasswordForm', () => {
  it('asks for a new password twice and nothing else', () => {
    render(<ResetPasswordForm />)

    // No current-password field: whoever got here proved themselves with the
    // emailed link, and by definition does not know the old password.
    expect(screen.getByLabelText(/new password/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/current password/i)).not.toBeInTheDocument()
  })

  it('keeps the button disabled until both fields are filled', async () => {
    render(<ResetPasswordForm />)
    expect(screen.getByRole('button', { name: /set new password/i })).toBeDisabled()

    await userEvent.type(screen.getByLabelText(/new password/i), 'Sherpa!Trail9')
    expect(screen.getByRole('button', { name: /set new password/i })).toBeDisabled()

    await userEvent.type(screen.getByLabelText(/confirm password/i), 'Sherpa!Trail9')
    expect(screen.getByRole('button', { name: /set new password/i })).not.toBeDisabled()
  })

  it('shows live strength feedback as the password is typed', async () => {
    render(<ResetPasswordForm />)

    await userEvent.type(screen.getByLabelText(/new password/i), 'abc')
    expect(screen.getByText(/too weak/i)).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText(/new password/i), '123XYZ!!!!')
    expect(screen.getByText(/strong/i)).toBeInTheDocument()
  })

  it('refuses a mismatch locally, without calling the server', async () => {
    await fill('Sherpa!Trail9', 'Sherpa!Trail8')
    await userEvent.click(screen.getByRole('button', { name: /set new password/i }))

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
    })
    expect(mockComplete).not.toHaveBeenCalled()
  })

  it('submits the new password and confirms when it is accepted', async () => {
    mockComplete.mockResolvedValue({ success: true })
    await fill('Sherpa!Trail9')

    await userEvent.click(screen.getByRole('button', { name: /set new password/i }))

    await waitFor(() => {
      expect(mockComplete).toHaveBeenCalledWith('Sherpa!Trail9')
      expect(screen.getByText(/password updated/i)).toBeInTheDocument()
    })
  })

  // An expired link is the single most likely way to arrive here, so the
  // message has to say what to do rather than just fail.
  it('shows the server’s refusal and keeps the form up', async () => {
    mockComplete.mockResolvedValue({ error: 'Your reset link has expired. Please request a new one.' })
    await fill('Sherpa!Trail9')

    await userEvent.click(screen.getByRole('button', { name: /set new password/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/expired/i)
    })
    expect(screen.getByLabelText(/new password/i)).toBeInTheDocument()
  })

  it('offers a route back to sign in', () => {
    render(<ResetPasswordForm />)
    expect(screen.getByRole('link', { name: /back to sign in/i })).toHaveAttribute('href', '/login')
  })
})
