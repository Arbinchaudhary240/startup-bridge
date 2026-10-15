import { useState } from 'react'
import { useAuth } from '../../context/useAuth'

const INITIAL_FORM = {
  full_name: '',
  username: '',
  email: '',
  phone_number: '',
  linkedin_url: '',
  country: '',
  role: 'FOUNDER',
  password: '',
  confirm_password: '',
}

const ROLES = [
  { value: 'FOUNDER', label: 'Founder' },
  { value: 'SPONSOR', label: 'Sponsor / Investor' },
  { value: 'DEVELOPER', label: 'Developer' },
  { value: 'MENTOR', label: 'Mentor' },
  { value: 'BOTH', label: 'Founder and Contributor' },
]

export default function AuthModal({
  mode: initialMode = 'login',
  onClose,
  onAuthenticated,
}) {
  const { login, register } = useAuth()

  const [mode, setMode] = useState(initialMode)
  const [form, setForm] = useState(INITIAL_FORM)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)

  const isRegister = mode === 'register'

  function updateField(event) {
    const { name, value } = event.target

    setForm((current) => ({
      ...current,
      [name]: value,
    }))

    setFieldErrors((current) => ({ ...current, [name]: '' }))
    if (error) setError('')
  }

  function switchMode(nextMode) {
    setMode(nextMode)
    setError('')
    setFieldErrors({})
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setFieldErrors({})

    if (loading) return

    if (isRegister && !/^[A-Z]{2}$/.test(form.country.trim().toUpperCase())) {
      setFieldErrors({ country: 'Enter a valid two-letter country code, such as NP.' })
      document.getElementById('country')?.focus()
      return
    }

    if (isRegister && form.password !== form.confirm_password) {
      setFieldErrors({ confirm_password: 'Passwords do not match.' })
      document.getElementById('confirm_password')?.focus()
      return
    }

    setLoading(true)

    try {
      if (isRegister) {
        const registrationData = {
          ...form,
          country: form.country.trim().toUpperCase(),
          phone_number: form.phone_number.trim(),
        }

        await register(registrationData)
      }

      const authenticatedUser = await login(
        form.username,
        form.password,
      )

      onAuthenticated?.(authenticatedUser)
    } catch (requestError) {
      const responseData = requestError.data
      if (isRegister && responseData && typeof responseData === 'object' && !Array.isArray(responseData)) {
        const serverFieldErrors = Object.fromEntries(
          Object.entries(responseData)
            .filter(([name]) => name in INITIAL_FORM)
            .map(([name, value]) => [
              name,
              Array.isArray(value) ? value.join(' ') : String(value),
            ]),
        )
        if (Object.keys(serverFieldErrors).length > 0) {
          setFieldErrors(serverFieldErrors)
          setError('Please check the highlighted fields and try again.')
          const firstInvalidField = Object.keys(serverFieldErrors)[0]
          document.getElementById(firstInvalidField)?.focus()
        } else {
          setError(requestError.message || 'Authentication failed.')
        }
      } else {
        setError(requestError.message || 'Authentication failed.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="auth-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.button === 0 && event.target === event.currentTarget && !loading) {
          onClose?.()
        }
      }}
    >
      <section
        className={`auth-modal ${isRegister ? 'auth-modal-register' : 'auth-modal-login'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
      >
        <button
          className="auth-close"
          type="button"
          aria-label="Close authentication form"
          onClick={onClose}
          disabled={loading}
        >
          ×
        </button>

        <div className="auth-brand-mark" aria-hidden="true">
          S
        </div>

        <p className="auth-eyebrow">YOUR NEXT CHAPTER STARTS HERE</p>

        <h2 id="auth-title">
          {isRegister ? 'Create your account' : 'Welcome back'}
        </h2>

        <p className="auth-subtitle">
          {isRegister
            ? 'Join StartupBridge and connect with founders, builders, and investors.'
            : 'Log in to discover opportunities and continue building with StartupBridge.'}
        </p>

        {error && (
          <p className="auth-error" role="alert">
            <span aria-hidden="true">!</span>
            {error}
          </p>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          {isRegister && (
            <label htmlFor="full_name">
              Full name <span className="auth-required">Required</span>
              <input
                id="full_name"
                name="full_name"
                autoComplete="name"
                placeholder="Your full name"
                value={form.full_name}
                onChange={updateField}
                required
                aria-invalid={Boolean(fieldErrors.full_name)}
                aria-describedby={fieldErrors.full_name ? 'full_name-error' : undefined}
                maxLength={150}
              />
              {fieldErrors.full_name && <span className="auth-field-error" id="full_name-error">{fieldErrors.full_name}</span>}
            </label>
          )}

          <label htmlFor="username">
            Username {isRegister && <span className="auth-required">Required</span>}
            <input
              id="username"
              name="username"
              autoComplete="username"
              placeholder="Choose your username"
              value={form.username}
              onChange={updateField}
              required
              aria-invalid={Boolean(fieldErrors.username)}
              aria-describedby={fieldErrors.username ? 'username-error' : undefined}
              maxLength={150}
            />
            {fieldErrors.username && <span className="auth-field-error" id="username-error">{fieldErrors.username}</span>}
          </label>

          {isRegister && (
            <>
              <label htmlFor="email">
                Email address <span className="auth-required">Required</span>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={updateField}
                  required
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                  maxLength={254}
                />
                {fieldErrors.email && <span className="auth-field-error" id="email-error">{fieldErrors.email}</span>}
              </label>

              <label htmlFor="role">
                I am joining as <span className="auth-required">Required</span>
                <select
                  id="role"
                  name="role"
                  value={form.role}
                  onChange={updateField}
                  required
                >
                  {ROLES.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </label>

              <label htmlFor="country">
                Country code <span className="auth-required">Required</span>
                <input
                  id="country"
                  name="country"
                  placeholder="e.g. NP"
                  value={form.country}
                  onChange={updateField}
                  required
                  aria-invalid={Boolean(fieldErrors.country)}
                  aria-describedby={fieldErrors.country ? 'country-error' : undefined}
                  maxLength={2}
                  autoCapitalize="characters"
                />
                {fieldErrors.country && <span className="auth-field-error" id="country-error">{fieldErrors.country}</span>}
              </label>

              <label htmlFor="phone_number">
                Phone number <span className="auth-required">Required</span>
                <input
                  id="phone_number"
                  name="phone_number"
                  type="tel"
                  autoComplete="tel"
                  placeholder="Your phone number"
                  value={form.phone_number}
                  onChange={updateField}
                  required
                  aria-invalid={Boolean(fieldErrors.phone_number)}
                  aria-describedby={fieldErrors.phone_number ? 'phone_number-error' : undefined}
                  maxLength={30}
                />
                {fieldErrors.phone_number && <span className="auth-field-error" id="phone_number-error">{fieldErrors.phone_number}</span>}
              </label>

              <label htmlFor="linkedin_url">
                LinkedIn profile <span className="auth-optional">Optional</span>
                <input
                  id="linkedin_url"
                  name="linkedin_url"
                  type="url"
                  placeholder="https://www.linkedin.com/in/..."
                  value={form.linkedin_url}
                  onChange={updateField}
                  maxLength={500}
                />
              </label>
            </>
          )}

          <label htmlFor="password">
            Password {isRegister && <span className="auth-required">Required</span>}
            <span className="password-input-wrap">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                placeholder={isRegister ? 'Create a strong password' : 'Enter your password'}
                value={form.password}
                onChange={updateField}
                required
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                minLength={isRegister ? 8 : undefined}
              />
              <button
                className="password-visibility-toggle"
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                aria-controls="password"
                onClick={() => setShowPassword((visible) => !visible)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  {showPassword ? (
                    <>
                      <path d="M3 3l18 18" />
                      <path d="M10.6 10.6a2 2 0 002.8 2.8" />
                      <path d="M9.9 5.2A10.8 10.8 0 0112 5c5.5 0 9 7 9 7a15 15 0 01-3.1 3.8M6.2 6.2C3.9 7.8 3 12 3 12s3.5 7 9 7a10 10 0 004-.8" />
                    </>
                  ) : (
                    <>
                      <path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z" />
                      <circle cx="12" cy="12" r="3" />
                    </>
                  )}
                </svg>
              </button>
            </span>
            {fieldErrors.password && <span className="auth-field-error" id="password-error">{fieldErrors.password}</span>}
          </label>

          {isRegister && (
            <label htmlFor="confirm_password">
              Confirm password <span className="auth-required">Required</span>
              <span className="password-input-wrap">
                <input
                  id="confirm_password"
                  name="confirm_password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Enter your password again"
                  value={form.confirm_password}
                  onChange={updateField}
                  required
                  aria-invalid={Boolean(fieldErrors.confirm_password)}
                  aria-describedby={fieldErrors.confirm_password ? 'confirm_password-error' : undefined}
                  minLength={8}
                />
              </span>
              {fieldErrors.confirm_password && <span className="auth-field-error" id="confirm_password-error">{fieldErrors.confirm_password}</span>}
            </label>
          )}

          <button
            className="auth-submit"
            type="submit"
            disabled={loading}
          >
            {loading
              ? 'Please wait...'
              : isRegister
                ? 'Create account'
                : 'Log in'}
            {!loading && <span aria-hidden="true">→</span>}
          </button>
        </form>

        <p className="auth-switch">
          {isRegister
            ? 'Already have an account? '
            : "Don't have an account? "}

          <button
            type="button"
            onClick={() => switchMode(isRegister ? 'login' : 'register')}
            disabled={loading}
          >
            {isRegister ? 'Log in' : 'Create an account'}
          </button>
        </p>

        <p className="auth-security-note">
          Your journey starts with a single step.
        </p>
      </section>
    </div>
  )
}
