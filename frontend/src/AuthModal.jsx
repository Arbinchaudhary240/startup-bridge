
import { useState } from 'react'

const API_URL = 'http://localhost:8000/api'

function getErrorMessage(data) {
  if (data.detail) return data.detail

  for (const value of Object.values(data)) {
    if (Array.isArray(value) && value.length) {
      return String(value[0])
    }
    if (typeof value === 'string') {
      return value
    }
  }

  return 'The request failed. Please try again.'
}

export default function AuthModal({
  mode: initialMode = 'login',
  onClose,
  onAuthenticated,
}) {
  const [mode, setMode] = useState(initialMode)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    full_name: '',
    username: '',
    email: '',
    phone_number: '',
    linkedin_url: '',
    country: '',
    role: '',
    password: '',
    confirm_password: '',
  })

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function requestJson(url, options) {
    const response = await fetch(url, options)
    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new Error(getErrorMessage(data))
    }

    return data
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (mode === 'register') {
        await requestJson(`${API_URL}/auth/register/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: form.full_name.trim(),
            username: form.username.trim(),
            email: form.email.trim(),
            phone_number: form.phone_number.trim(),
            linkedin_url: form.linkedin_url.trim(),
            country: form.country.trim().toUpperCase(),
            role: form.role,
            password: form.password,
            confirm_password: form.confirm_password,
          }),
        })
      }

      const tokens = await requestJson(`${API_URL}/auth/token/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: form.username.trim(),
          password: form.password,
        }),
      })

      if (!tokens.access) {
        throw new Error('The login response did not contain an access token.')
      }

      localStorage.setItem('access_token', tokens.access)

      if (tokens.refresh) {
        localStorage.setItem('refresh_token', tokens.refresh)
      }

      const user = {
        username: form.username.trim(),
        full_name: form.full_name.trim() || form.username.trim(),
        email: form.email.trim(),
        role: form.role,
      }

      localStorage.setItem('user', JSON.stringify(user))
      onAuthenticated(user)
      onClose()
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-overlay" onMouseDown={onClose}>
      <section
        className="auth-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="auth-close"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>

        <div className="auth-brand-mark">S</div>

        <h2 id="auth-title">
          {mode === 'login' ? 'Welcome back' : 'Join StartupBridge'}
        </h2>
        <p className="auth-subtitle">
          {mode === 'login'
            ? 'Sign in to continue building connections.'
            : 'Create an account to turn ideas into collaborations.'}
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'register' && (
            <>
              <label>
                Full name
                <input
                  name="full_name"
                  value={form.full_name}
                  onChange={updateField}
                  autoComplete="name"
                  required
                />
              </label>

              <label>
                Email
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={updateField}
                  autoComplete="email"
                  required
                />
              </label>

              <label>
                Phone number
                <input
                  name="phone_number"
                  type="tel"
                  value={form.phone_number}
                  onChange={updateField}
                  autoComplete="tel"
                />
              </label>

              <label>
                Country code
                <input
                  name="country"
                  value={form.country}
                  onChange={updateField}
                  placeholder="NP"
                  maxLength={2}
                  required
                />
              </label>

              <label>
                Your role
                <select
                  name="role"
                  value={form.role}
                  onChange={updateField}
                  required
                >
                  <option value="">Choose a role</option>
                  <option value="FOUNDER">Founder</option>
                  <option value="SPONSOR">Sponsor</option>
                  <option value="DEVELOPER">Developer</option>
                  <option value="MENTOR">Mentor</option>
                  <option value="BOTH">Founder and sponsor</option>
                </select>
              </label>

              <label>
                LinkedIn URL <span className="auth-optional">(optional)</span>
                <input
                  name="linkedin_url"
                  type="url"
                  value={form.linkedin_url}
                  onChange={updateField}
                  placeholder="https://linkedin.com/in/..."
                />
              </label>
            </>
          )}

          <label>
            Username
            <input
              name="username"
              value={form.username}
              onChange={updateField}
              autoComplete="username"
              required
            />
          </label>

          <label>
            Password
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={updateField}
              autoComplete={
                mode === 'login' ? 'current-password' : 'new-password'
              }
              minLength={8}
              required
            />
          </label>

          {mode === 'register' && (
            <label>
              Confirm password
              <input
                name="confirm_password"
                type="password"
                value={form.confirm_password}
                onChange={updateField}
                autoComplete="new-password"
                required
              />
            </label>
          )}

          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}

          <button
            className="auth-submit"
            type="submit"
            disabled={loading}
          >
            {loading
              ? 'Please wait...'
              : mode === 'login'
                ? 'Sign in'
                : 'Create account'}
          </button>
        </form>

        <p className="auth-switch">
          {mode === 'login'
            ? "Don't have an account?"
            : 'Already have an account?'}{' '}
          <button
            type="button"
            onClick={() => {
              setError('')
              setMode(mode === 'login' ? 'register' : 'login')
            }}
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </section>
    </div>
  )
}
