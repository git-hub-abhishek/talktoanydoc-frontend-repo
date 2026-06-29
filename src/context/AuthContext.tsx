import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import {
  signIn,
  signUp,
  signOut,
  confirmSignUp,
  getCurrentUser,
  fetchAuthSession,
  resendSignUpCode,
  type SignInInput,
} from 'aws-amplify/auth'

interface AuthUser {
  userId: string
  email: string
}

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  idToken: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  register: (email: string, password: string) => Promise<{ nextStep: string }>
  confirmRegistration: (email: string, code: string) => Promise<void>
  resendConfirmationCode: (email: string) => Promise<void>
  refreshToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [idToken, setIdToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadSession() {
    try {
      const currentUser = await getCurrentUser()
      const session = await fetchAuthSession()
      const token = session.tokens?.idToken?.toString() ?? null
      setUser({ userId: currentUser.userId, email: currentUser.signInDetails?.loginId ?? '' })
      setIdToken(token)
    } catch {
      setUser(null)
      setIdToken(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSession()
  }, [])

  async function login(email: string, password: string) {
    const input: SignInInput = { username: email, password }
    const result = await signIn(input)
    if (result.isSignedIn) {
      await loadSession()
    }
  }

  async function logout() {
    await signOut()
    setUser(null)
    setIdToken(null)
  }

  async function register(email: string, password: string) {
    const result = await signUp({ username: email, password, options: { userAttributes: { email } } })
    return { nextStep: result.nextStep.signUpStep }
  }

  async function confirmRegistration(email: string, code: string) {
    await confirmSignUp({ username: email, confirmationCode: code })
  }

  async function resendConfirmationCode(email: string) {
    await resendSignUpCode({ username: email })
  }

  async function refreshToken(): Promise<string | null> {
    try {
      const session = await fetchAuthSession({ forceRefresh: true })
      const token = session.tokens?.idToken?.toString() ?? null
      setIdToken(token)
      return token
    } catch {
      setUser(null)
      setIdToken(null)
      return null
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, idToken, login, logout, register, confirmRegistration, resendConfirmationCode, refreshToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
