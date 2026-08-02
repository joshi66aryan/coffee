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
  sendOtp:   vi.fn(),
  verifyOtp: vi.fn(),
}))

import { sendOtp, verifyOtp } from '@/lib/cafe/actions'

const mockSendOtp   = vi.mocked(sendOtp)
const mockVerifyOtp = vi.mocked(verifyOtp)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('LoginForm — phone step', () => {
  it('renders the phone input and Send Code button', () => {
    render(<LoginForm />)
    expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send code/i })).toBeInTheDocument()
  })

  it('shows the +977 prefix', () => {
    render(<LoginForm />)
    expect(screen.getByText('+977')).toBeInTheDocument()
  })

  it('disables Send Code while the phone field is empty', () => {
    render(<LoginForm />)
    expect(screen.getByRole('button', { name: /send code/i })).toBeDisabled()
  })

  it('calls sendOtp with formatted phone on submit', async () => {
    mockSendOtp.mockResolvedValue({})
    render(<LoginForm />)

    await userEvent.type(screen.getByLabelText(/phone number/i), '9841234567')
    await userEvent.click(screen.getByRole('button', { name: /send code/i }))

    await waitFor(() => {
      expect(mockSendOtp).toHaveBeenCalledWith('+9779841234567')
    })
  })

  it('shows an error message when sendOtp fails', async () => {
    mockSendOtp.mockResolvedValue({ error: 'Phone number is invalid' })
    render(<LoginForm />)

    await userEvent.type(screen.getByLabelText(/phone number/i), '1234')
    await userEvent.click(screen.getByRole('button', { name: /send code/i }))

    await waitFor(() => {
      expect(screen.getByText('Phone number is invalid')).toBeInTheDocument()
    })
  })

  it('advances to OTP step after successful send', async () => {
    mockSendOtp.mockResolvedValue({})
    render(<LoginForm />)

    await userEvent.type(screen.getByLabelText(/phone number/i), '9841234567')
    await userEvent.click(screen.getByRole('button', { name: /send code/i }))

    await waitFor(() => {
      expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument()
    })
  })
})

describe('LoginForm — OTP step', () => {
  async function renderOtpStep() {
    mockSendOtp.mockResolvedValue({})
    render(<LoginForm />)
    await userEvent.type(screen.getByLabelText(/phone number/i), '9841234567')
    await userEvent.click(screen.getByRole('button', { name: /send code/i }))
    await waitFor(() => screen.getByLabelText(/verification code/i))
  }

  it('shows the number the code was sent to', async () => {
    await renderOtpStep()
    expect(screen.getByText(/\+9779841234567/)).toBeInTheDocument()
  })

  it('disables Verify Code until 6 digits are entered', async () => {
    await renderOtpStep()
    expect(screen.getByRole('button', { name: /verify code/i })).toBeDisabled()
    await userEvent.type(screen.getByLabelText(/verification code/i), '12345')
    expect(screen.getByRole('button', { name: /verify code/i })).toBeDisabled()
    await userEvent.type(screen.getByLabelText(/verification code/i), '6')
    expect(screen.getByRole('button', { name: /verify code/i })).not.toBeDisabled()
  })

  it('calls verifyOtp and navigates on success', async () => {
    mockVerifyOtp.mockResolvedValue({ redirect: '/' })
    await renderOtpStep()

    await userEvent.type(screen.getByLabelText(/verification code/i), '123456')
    await userEvent.click(screen.getByRole('button', { name: /verify code/i }))

    await waitFor(() => {
      expect(mockVerifyOtp).toHaveBeenCalledWith('+9779841234567', '123456')
      expect(mockPush).toHaveBeenCalledWith('/')
    })
  })

  it('shows error when OTP verification fails', async () => {
    mockVerifyOtp.mockResolvedValue({ error: 'Invalid or expired code — please try again.' })
    await renderOtpStep()

    await userEvent.type(screen.getByLabelText(/verification code/i), '000000')
    await userEvent.click(screen.getByRole('button', { name: /verify code/i }))

    await waitFor(() => {
      expect(screen.getByText(/invalid or expired code/i)).toBeInTheDocument()
    })
  })

  it('allows going back to the phone step', async () => {
    await renderOtpStep()
    await userEvent.click(screen.getByRole('button', { name: /use a different number/i }))
    expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument()
  })
})
