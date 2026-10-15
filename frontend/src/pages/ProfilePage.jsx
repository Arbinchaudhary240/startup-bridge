import { useEffect, useState } from 'react'
import { apiRequest } from '../lib/apiClient'
import { useAuth } from '../context/useAuth'

export default function ProfilePage() {
  const { user } = useAuth()
  const [form, setForm] = useState({ bio: '', skills: '', organization: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    apiRequest('/profile/me/')
      .then((profile) => {
        if (active) setForm({
          bio: profile.bio || '',
          skills: Array.isArray(profile.skills) ? profile.skills.join(', ') : '',
          organization: profile.organization || '',
        })
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'Could not load your profile.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await apiRequest('/profile/me/', {
        method: 'PATCH',
        body: {
          bio: form.bio,
          skills: form.skills.split(',').map((skill) => skill.trim()).filter(Boolean),
          organization: form.organization,
        },
      })
      setMessage('Your profile has been saved.')
    } catch (requestError) {
      setError(requestError.message || 'Could not save your profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="page-container narrow-page">
      <header className="page-heading"><div><p className="eyebrow">YOUR ACCOUNT</p><h1>Profile</h1><p>Keep your professional profile current for potential collaborators.</p></div></header>
      {loading ? <p className="state-panel" role="status">Loading profile…</p> : (
        <form className="form-panel" onSubmit={handleSubmit}>
          <div className="profile-summary">
            <div className="profile-avatar" aria-hidden="true">{(user?.full_name || user?.username || 'U').slice(0, 1).toUpperCase()}</div>
            <div><h2>{user?.full_name || user?.username}</h2><p>{user?.email} · {user?.role?.replaceAll('_', ' ')}</p></div>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          {message && <p className="inline-notice" role="status">{message}</p>}
          <label>About you<textarea rows="5" maxLength={5000} value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} placeholder="Share a short introduction" /></label>
          <label>Skills <span className="field-hint">Separate skills with commas</span><input maxLength={1000} value={form.skills} onChange={(event) => setForm({ ...form, skills: event.target.value })} placeholder="Product strategy, React, fundraising" /></label>
          <label>Organization<input maxLength={150} value={form.organization} onChange={(event) => setForm({ ...form, organization: event.target.value })} placeholder="Company or organization" /></label>
          <button className="button button-primary" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</button>
        </form>
      )}
    </main>
  )
}
