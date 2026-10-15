import { useEffect, useState } from 'react'
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import AuthModal from './AuthModal'
import './App.css'

const API_URL = 'http://localhost:8000/api/startups/'

const stages = [
  { value: '', label: 'All stages' },
  { value: 'IDEA', label: 'Idea' },
  { value: 'VALIDATION', label: 'Validation' },
  { value: 'MVP', label: 'MVP' },
  { value: 'GROWTH', label: 'Growth' },
]

function formatLabel(value) {
  if (!value) return 'Unspecified'

  return String(value)
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function getFounderName(startup) {
  if (typeof startup.founder === 'string') {
    return startup.founder
  }

  return (
    startup.founder?.full_name ||
    startup.founder?.username ||
    startup.founder_name ||
    'Startup founder'
  )
}

function getBudget(startup) {
  const amount = startup.budget_amount
  const currency = startup.budget_currency || startup.currency || 'USD'

  if (amount === null || amount === undefined || amount === '') {
    return 'Budget not specified'
  }

  const numericAmount = Number(amount)

  if (!Number.isFinite(numericAmount)) {
    return `${amount} ${currency}`
  }

  return `${currency} ${numericAmount.toLocaleString()}`
}

function StartupCard({ startup, onInterest }) {
  const resources = Array.isArray(startup.required_resources)
    ? startup.required_resources
    : []

  return (
    <article className="startup-card">
      <div className="card-top">
        <span className="category-tag">
          {formatLabel(startup.category)}
        </span>
        <span className="stage-tag">
          {formatLabel(startup.stage)}
        </span>
      </div>

      <h3>{startup.title}</h3>

      <p className="startup-problem">
        {startup.problem || 'No problem description provided yet.'}
      </p>

      <div className="startup-section">
        <h4>The solution</h4>
        <p>
          {startup.solution || 'The founder has not added a solution yet.'}
        </p>
      </div>

      {startup.target_users && (
        <div className="startup-section">
          <h4>Target users</h4>
          <p>{startup.target_users}</p>
        </div>
      )}

      {resources.length > 0 && (
        <div className="resource-list">
          {resources.slice(0, 3).map((resource, index) => (
            <span key={`${resource}-${index}`}>
              {typeof resource === 'string'
                ? formatLabel(resource)
                : formatLabel(resource.name || resource.type || 'Resource')}
            </span>
          ))}
        </div>
      )}

      <div className="card-footer">
        <div className="founder-info">
          <div className="founder-avatar">
            {getFounderName(startup).charAt(0).toUpperCase()}
          </div>
          <div>
            <span className="muted-label">Founded by</span>
            <p>{getFounderName(startup)}</p>
          </div>
        </div>

        <div className="budget-info">
          <span className="muted-label">Budget</span>
          <p>{getBudget(startup)}</p>
        </div>
      </div>

      <button
        className="interest-button"
        onClick={() => onInterest(startup.id)}
      >
        Express interest <span aria-hidden="true">→</span>
      </button>
    </article>
  )
}

function HomePage() {
  const [startups, setStartups] = useState([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [stage, setStage] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [interestLoading, setInterestLoading] = useState(null)
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null')
    } catch {
      return null
    }
  })

  useEffect(() => {
    const controller = new AbortController()

    async function fetchStartups() {
      setLoading(true)
      setError('')

      const params = new URLSearchParams()

      if (search.trim()) params.set('search', search.trim())
      if (category.trim()) params.set('category', category.trim())
      if (stage) params.set('stage', stage)

      try {
        const query = params.toString()
        const url = query ? `${API_URL}?${query}` : API_URL

        const response = await fetch(url, {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(
            `Could not load startups (HTTP ${response.status}).`
          )
        }

        const data = await response.json()

        // Supports both standard DRF pagination and a plain list.
        const results = Array.isArray(data) ? data : data.results

        if (!Array.isArray(results)) {
          throw new Error('The API returned an unexpected response.')
        }

        setStartups(results)
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Something went wrong.')
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    fetchStartups()

    return () => controller.abort()
  }, [search, category, stage])

  async function handleInterest(startupId) {
    setNotice('')

    const token =
      localStorage.getItem('access_token') ||
      localStorage.getItem('access')

    if (!token) {
      setNotice('Please sign in before expressing interest.')
      return
    }

    setInterestLoading(startupId)

    try {
      const response = await fetch(
        `${API_URL}${startupId}/interest/`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message: '' }),
        }
      )

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Your session has expired. Please sign in again.')
        }

        throw new Error(
          data.detail ||
            data.message ||
            'Could not submit your interest.'
        )
      }

      setNotice('Your interest has been submitted successfully.')
    } catch (err) {
      setNotice(err.message || 'Something went wrong.')
    } finally {
      setInterestLoading(null)
    }
  }

  function handleLogout() {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')

    setCurrentUser(null)
    setNotice('You have been signed out.')
  }

  return (
    <div className="app-shell">
      <header className="navbar">
        <a className="brand" href="/" aria-label="StartupBridge home">
          <span className="brand-mark">S</span>
          <span>Startup<span className="brand-accent">Bridge</span></span>
        </a>

        <nav className="nav-links" aria-label="Main navigation">
          <a className="active-link" href="#discover">Discover</a>
          <a href="#how-it-works">How it works</a>
        </nav>

        <div className="nav-actions">
          {currentUser ? (
            <>
              <span className="nav-user">
                Hi, {currentUser.full_name || currentUser.username}
              </span>
          
              <button
                type="button"
                className="nav-login nav-logout"
                onClick={handleLogout}
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link className="nav-login" to="/login">
                Sign in
              </Link>
          
              <Link className="nav-cta" to="/register">
                Get started <span aria-hidden="true">↗</span>
              </Link>
            </>
          )}
        </div>
      </header>

      <main>
        <section className="hero-section">
          <div className="hero-content">
            <div className="eyebrow">
              <span className="eyebrow-dot" />
              Ideas grow stronger together
            </div>

            <h1>
              Great ideas deserve
              <br />
              the right <span>people.</span>
            </h1>

            <p>
              Connect startup founders with developers, mentors and
              sponsors who can help turn ambitious ideas into reality.
            </p>

            <div className="hero-actions">
              <a className="primary-button" href="#discover">
                Discover startups <span aria-hidden="true">→</span>
              </a>
              <a className="secondary-button" href="#how-it-works">
                How it works
              </a>
            </div>

            <div className="hero-note">
              <span className="note-icon">✳</span>
              Ideas, skills and resources — brought together.
            </div>
          </div>

          <div className="hero-visual" aria-hidden="true">
            <div className="visual-orbit orbit-one" />
            <div className="visual-orbit orbit-two" />

            <div className="visual-center">
              <span>SB</span>
            </div>

            <div className="floating-card founder-card">
              <div className="mini-avatar avatar-purple">F</div>
              <div>
                <strong>Founders</strong>
                <span>Bring ideas to life</span>
              </div>
            </div>

            <div className="floating-card developer-card">
              <div className="mini-avatar avatar-green">&lt;/&gt;</div>
              <div>
                <strong>Developers</strong>
                <span>Build what matters</span>
              </div>
            </div>

            <div className="floating-card mentor-card">
              <div className="mini-avatar avatar-orange">M</div>
              <div>
                <strong>Mentors & sponsors</strong>
                <span>Help ideas grow</span>
              </div>
            </div>

            <div className="visual-spark spark-one">✦</div>
            <div className="visual-spark spark-two">✳</div>
          </div>
        </section>

        <section className="discovery-section" id="discover">
          <div className="section-heading">
            <div>
              <span className="section-kicker">THE OPPORTUNITY BOARD</span>
              <h2>Discover what’s being built</h2>
              <p>
                Find promising ideas and see where your skills or resources
                could make a difference.
              </p>
            </div>

            <div className="listing-count">
              <strong>{startups.length}</strong>
              <span>{startups.length === 1 ? 'startup' : 'startups'} shown</span>
            </div>
          </div>

          <div className="filter-panel">
            <label className="search-field">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                placeholder="Search startups, problems, solutions..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Search startups"
              />
            </label>

            <label className="filter-field">
              <span>Category</span>
              <input
                type="text"
                placeholder="e.g. Healthcare"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                aria-label="Filter by category"
              />
            </label>

            <label className="filter-field">
              <span>Stage</span>
              <select
                value={stage}
                onChange={(event) => setStage(event.target.value)}
                aria-label="Filter by stage"
              >
                {stages.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {notice && (
            <div className="notice" role="status">
              <span>{notice}</span>
              <button onClick={() => setNotice('')} aria-label="Dismiss message">
                ×
              </button>
            </div>
          )}

          {loading && (
            <div className="state-panel">
              <div className="loader" />
              <h3>Finding promising ideas</h3>
              <p>Loading startup listings from StartupBridge...</p>
            </div>
          )}

          {!loading && error && (
            <div className="state-panel error-panel">
              <div className="state-icon">!</div>
              <h3>We couldn’t load the startups</h3>
              <p>{error}</p>
              <button
                className="primary-button"
                onClick={() => {
                  setSearch((current) => current + ' ')
                  setSearch((current) => current.trim())
                }}
              >
                Try again
              </button>
            </div>
          )}

          {!loading && !error && startups.length === 0 && (
            <div className="state-panel">
              <div className="state-icon">⌕</div>
              <h3>No startups found yet</h3>
              <p>
                Try a different search or filter. Only publicly available
                startup listings are displayed here.
              </p>
              <button
                className="secondary-button"
                onClick={() => {
                  setSearch('')
                  setCategory('')
                  setStage('')
                }}
              >
                Clear filters
              </button>
            </div>
          )}

          {!loading && !error && startups.length > 0 && (
            <div className="startup-grid">
              {startups.map((startup) => (
                <StartupCard
                  key={startup.id}
                  startup={startup}
                  onInterest={handleInterest}
                />
              ))}
            </div>
          )}
        </section>

        <section className="how-section" id="how-it-works">
          <div className="how-heading">
            <span className="section-kicker">SIMPLE BY DESIGN</span>
            <h2>From idea to collaboration</h2>
            <p>Three steps to start building something meaningful.</p>
          </div>

          <div className="steps-grid">
            <article className="step-card">
              <span className="step-number">01</span>
              <h3>Discover an idea</h3>
              <p>Explore startup ideas and understand the problems founders want to solve.</p>
            </article>

            <article className="step-card">
              <span className="step-number">02</span>
              <h3>Connect with people</h3>
              <p>Find opportunities to contribute skills, mentorship, funding or resources.</p>
            </article>

            <article className="step-card">
              <span className="step-number">03</span>
              <h3>Build together</h3>
              <p>Turn accepted offers into projects and track progress through milestones.</p>
            </article>
          </div>
        </section>
      </main>

      <footer className="footer">
        <a className="brand footer-brand" href="/">
          <span className="brand-mark">S</span>
          <span>Startup<span className="brand-accent">Bridge</span></span>
        </a>
        <p>Good ideas go further together.</p>
        <span>© {new Date().getFullYear()} StartupBridge</span>
      </footer>

      {interestLoading && (
        <div className="request-indicator" role="status">
          Submitting your interest...
        </div>
      )}
    </div>
  )
}

function AuthRoute() {
  const location = useLocation()
  const navigate = useNavigate()

  const mode =
    location.pathname === '/register' ? 'register' : 'login'

  return (
    <AuthModal
      key={mode}
      mode={mode}
      onClose={() => navigate('/')}
      onAuthenticated={() => navigate('/')}
    />
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<AuthRoute />} />
        <Route path="/register" element={<AuthRoute />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App