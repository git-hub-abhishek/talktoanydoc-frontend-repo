import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import styles from './AuthPage.module.css'

type Step = 'register' | 'confirm'

export function SignUpPage() {
  const { register, confirmRegistration, resendConfirmationCode } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>('register')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resent, setResent] = useState(false)

  async function handleRegister(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const result = await register(email, password)
      if (result.nextStep === 'CONFIRM_SIGN_UP') {
        setStep('confirm')
      } else {
        navigate('/')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirm(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await confirmRegistration(email, code)
      navigate('/login', { state: { message: 'Account confirmed! Please sign in.' } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Confirmation failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setError(null)
    setResent(false)
    try {
      await resendConfirmationCode(email)
      setResent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend code')
    }
  }

  if (step === 'confirm') {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h1 className={styles.title}>Verify your email</h1>
            <p className={styles.subtitle}>We sent a code to <strong>{email}</strong></p>
          </div>

          <form className={styles.form} onSubmit={handleConfirm} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="code">Confirmation code</label>
              <input
                id="code"
                type="text"
                className="form-input"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.trim())}
                required
                autoComplete="one-time-code"
                autoFocus
                inputMode="numeric"
              />
            </div>

            {error && <p className="text-error" role="alert">{error}</p>}
            {resent && <p style={{ color: 'var(--color-success)', fontSize: '0.875rem' }}>Code resent!</p>}

            <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Verifying...' : 'Verify email'}
            </button>
          </form>

          <p className={styles.footer}>
            Didn&apos;t get the code?{' '}
            <button type="button" className={styles.linkBtn} onClick={handleResend}>Resend</button>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h1 className={styles.title}>Create an account</h1>
          <p className={styles.subtitle}>Start talking to your documents</p>
        </div>

        <form className={styles.form} onSubmit={handleRegister} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="Min 8 chars, upper, lower, number, symbol"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="confirmPassword">Confirm password</label>
            <input
              id="confirmPassword"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>

          {error && <p className="text-error" role="alert">{error}</p>}

          <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className={styles.footer}>
          Already have an account?{' '}
          <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
