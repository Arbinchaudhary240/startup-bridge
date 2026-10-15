import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../context/useAuth'

export default function Navbar() {
  const { user, authLoading, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  function scrollToHowItWorks(attempt = 0) {
    const section = document.getElementById('how-it-works')
    if (section) {
      section.scrollIntoView({
        behavior: 'instant',
        block: 'start',
      })
      return
    }

    if (attempt < 20) {
      window.setTimeout(() => scrollToHowItWorks(attempt + 1), 50)
    }
  }

  function handleHowItWorksClick(event) {
    event.preventDefault()
    setMobileOpen(false)
    navigate('/#how-it-works')
    window.setTimeout(() => scrollToHowItWorks(), 50)
  }

  function handleLogout() {
    logout()
    navigate('/')
    setMobileOpen(false)
  }

  return (
    <header className="navbar">
      <Link className="brand" to="/" aria-label="StartupBridge home">
        StartupBridge
      </Link>

      <nav
        className={`navbar-links${mobileOpen ? ' is-open' : ''}`}
        id="main-navigation"
        aria-label="Main navigation"
        onClick={() => setMobileOpen(false)}
      >
        <NavLink to="/" end>Home</NavLink>
        <NavLink to="/startups">Discover</NavLink>
        <a href="/#how-it-works" onClick={handleHowItWorksClick}>How it works</a>
        {!authLoading && user && <NavLink to="/dashboard">Workspace</NavLink>}
      </nav>

      <button
        className="navbar-menu-toggle"
        type="button"
        aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={mobileOpen}
        aria-controls="main-navigation"
        onClick={() => setMobileOpen((open) => !open)}
      >
        <span />
        <span />
        <span />
      </button>

      <div className="navbar-actions">
        {authLoading ? null : user ? (
          <>
            <span className="navbar-user">
              {user.full_name || user.username || 'Account'}
            </span>
            <Link className="navbar-login profile-nav-link" to="/profile">Profile</Link>
            <button
              type="button"
              className="navbar-button"
              onClick={handleLogout}
            >
              Log out
            </button>
          </>
        ) : (
          <>
            <Link className="navbar-login" to="/login">
              Log in
            </Link>
            <Link className="navbar-cta" to="/register">
              Get started
            </Link>
          </>
        )}
      </div>
    </header>
  )
}
