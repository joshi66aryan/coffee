import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from '@/components/cafe/login-form'

// Mock Next.js router
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

// Mock server actions — these run server-side and can't run in jsdom
vi.mock('@/lib/cafe/actions', () => ({
  signInWithEmail: vi.fn(),
  signUpWithEmail: vi.fn(),
}))

const mockSignInWithOAuth = vi.fn()
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { signInWithOAuth: mockSignInWithOAuth } }),
}))

import { signInWithEmail, signUpWithEmail } from '@/lib/cafe/actions'

const mockSignIn = vi.mocked(signInWithEmail)
const mockSignUp = vi.mocked(signUpWithEmail)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('LoginForm — Google sign-in', () => {
  it('renders a Continue with Google button', () => {
    render(<LoginForm />)
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument()
  })

  it('starts Google OAuth with a redirect back to /auth/callback', async () => {
    mockSignInWithOAuth.mockResolvedValue({ error: null })
    render(<LoginForm />)

    await userEvent.click(screen.getByRole('button', { name: /continue with google/i }))

    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: { redirectTo: expect.stringContaining('/auth/callback') },
      })
    })
  })

  it('shows an error message when Google sign-in fails to start', async () => {
    mockSignInWithOAuth.mockResolvedValue({ error: { message: 'oauth error' } })
    render(<LoginForm />)

    await userEvent.click(screen.getByRole('button', { name: /continue with google/i }))

    await waitFor(() => {
      expect(screen.getByText(/could not start google sign-in/i)).toBeInTheDocument()
    })
  })
})

describe('LoginForm — email sign-in', () => {
  it('renders email and password fields with no phone input', () => {
    render(<LoginForm />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.queryByLabelText(/phone number/i)).not.toBeInTheDocument()
  })

  it('disables Sign in until both fields are filled', () => {
    render(<LoginForm />)
    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeDisabled()
  })

  it('calls signInWithEmail and navigates on success', async () => {
    mockSignIn.mockResolvedValue({ redirect: '/' })
    render(<LoginForm />)

    await userEvent.type(screen.getByLabelText(/email/i), 'cafe@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /^sign in$/i }))

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('cafe@example.com', 'password123')
      expect(mockPush).toHaveBeenCalledWith('/')
    })
  })

  it('shows an error message when sign-in fails', async () => {
    mockSignIn.mockResolvedValue({ error: 'Invalid email or password.' })
    render(<LoginForm />)

    await userEvent.type(screen.getByLabelText(/email/i), 'cafe@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'wrongpassword')
    await userEvent.click(screen.getByRole('button', { name: /^sign in$/i }))

    await waitFor(() => {
      expect(screen.getByText('Invalid email or password.')).toBeInTheDocument()
    })
  })

  it('switches to sign-up mode via the toggle phrase and calls signUpWithEmail', async () => {
    mockSignUp.mockResolvedValue({ confirm: true })
    render(<LoginForm />)

    await userEvent.click(screen.getByRole('button', { name: /don't have an account\? sign up/i }))
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /already have an account\? sign in/i })).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText(/email/i), 'new@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'password123')
    await userEvent.click(screen.getByRole('checkbox'))
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith('new@example.com', 'password123')
      expect(screen.getByText(/check your inbox/i)).toBeInTheDocument()
    })
  })

  it('only shows the terms checkbox in sign-up mode, and requires it before creating an account', async () => {
    render(<LoginForm />)
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /don't have an account\? sign up/i }))
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).not.toBeChecked()

    await userEvent.type(screen.getByLabelText(/email/i), 'new@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'password123')
    expect(screen.getByRole('button', { name: /create account/i })).toBeDisabled()

    await userEvent.click(checkbox)
    expect(checkbox).toBeChecked()
    expect(screen.getByRole('button', { name: /create account/i })).not.toBeDisabled()
  })

  it('links the terms checkbox label to the /terms page', async () => {
    render(<LoginForm />)
    await userEvent.click(screen.getByRole('button', { name: /don't have an account\? sign up/i }))

    expect(screen.getByRole('link', { name: /terms & conditions/i })).toHaveAttribute('href', '/terms')
  })

  it('does not show password strength feedback until typing starts', async () => {
    render(<LoginForm />)
    await userEvent.click(screen.getByRole('button', { name: /don't have an account\? sign up/i }))
    expect(screen.queryByText(/uppercase letter/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/^(too weak|weak|fair|good|strong)$/i)).not.toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('Password'), 'a')
    expect(screen.getByText(/uppercase letter/i)).toBeInTheDocument()
  })

  it('updates the live strength feedback as the password is typed', async () => {
    render(<LoginForm />)
    await userEvent.click(screen.getByRole('button', { name: /don't have an account\? sign up/i }))

    await userEvent.type(screen.getByLabelText('Password'), 'abc')
    expect(screen.getByText(/too weak/i)).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('Password'), '123XYZ!!!!')
    expect(screen.getByText(/strong/i)).toBeInTheDocument()
  })

  it('rejects a weak password on sign-up with a server error', async () => {
    mockSignUp.mockResolvedValue({ error: 'Password must include an uppercase letter, a number, and a special character' })
    render(<LoginForm />)

    await userEvent.click(screen.getByRole('button', { name: /don't have an account\? sign up/i }))
    await userEvent.type(screen.getByLabelText(/email/i), 'new@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'lowercaseonly')
    await userEvent.click(screen.getByRole('checkbox'))
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(screen.getByText(/password must include an uppercase letter/i)).toBeInTheDocument()
    })
    expect(mockPush).not.toHaveBeenCalled()
  })
})
