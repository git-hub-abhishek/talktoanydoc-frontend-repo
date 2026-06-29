import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import styles from './Layout.module.css'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link to="/" className={styles.logo}>
            <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <rect width="32" height="32" rx="8" fill="#4f46e5"/>
              <path d="M8 8h10l6 6v10H8V8z" fill="white" opacity="0.9"/>
              <path d="M18 8v6h6" fill="none" stroke="#4f46e5" strokeWidth="1.5"/>
              <path d="M11 16h10M11 19h7M11 22h8" stroke="#4f46e5" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span>TalkToAnyDoc</span>
          </Link>
          {user && (
            <div className={styles.headerRight}>
              <span className={styles.userEmail}>{user.email}</span>
              <button className="btn btn-outline btn-sm" onClick={handleLogout}>
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>
      <main className={styles.main}>{children}</main>
      <footer className={styles.footer}>
        <p>&copy; {new Date().getFullYear()} TalkToAnyDoc</p>
      </footer>
    </div>
  )
}
