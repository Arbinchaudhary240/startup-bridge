import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { apiRequest } from '../lib/apiClient'
import { useAuth } from '../context/useAuth'

const EMPTY_STARTUP = {
  title: '',
  problem: '',
  solution: '',
  stage: 'IDEA',
}

const WORD_LIMITS = {
  title: 12,
  problem: 100,
  solution: 100,
}

function countWords(value) {
  return value.trim() ? value.trim().split(/\s+/).length : 0
}

export default function StartupFormPage() {
  const { startupId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const canPublish = ['FOUNDER', 'BOTH'].includes(user?.role)
  const [form, setForm] = useState(EMPTY_STARTUP)
  const [loading, setLoading] = useState(Boolean(startupId && canPublish))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const wordCounts = {
    title: countWords(form.title),
    problem: countWords(form.problem),
    solution: countWords(form.solution),
  }
  const exceedsWordLimit = Object.entries(wordCounts).some(
    ([field, count]) => count > WORD_LIMITS[field],
  )

  useEffect(() => {
    if (!startupId || !canPublish) return
    let active = true
    apiRequest(`/startups/${startupId}/`)
      .then((startup) => {
        if (active) setForm({
          ...EMPTY_STARTUP,
          ...startup,
        })
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'Could not load this startup.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [startupId, canPublish])

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    const payload = {
      title: form.title.trim(),
      problem: form.problem.trim(),
      solution: form.solution.trim(),
      stage: form.stage,
    }
    try {
      await apiRequest(startupId ? `/startups/${startupId}/` : '/startups/', {
        method: startupId ? 'PATCH' : 'POST',
        body: payload,
      })
      navigate('/dashboard', { replace: true })
    } catch (requestError) {
      setError(requestError.message || 'Could not save your startup.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="page-container narrow-page">
      <header className="page-heading"><div><p className="eyebrow">FOUNDER TOOLS</p><h1>{startupId ? 'Edit startup' : 'Publish a startup idea'}</h1><p>Share the problem, your solution, and the current stage. People can reach out to explore working together.</p></div></header>
      {!canPublish && <section className="form-panel access-panel"><h2>Founder access required</h2><p>Only founder accounts can publish startup listings.</p><Link className="button button-secondary" to="/dashboard">Back to dashboard</Link></section>}
      {canPublish && <>
      {loading ? <p className="state-panel" role="status">Loading startup…</p> : (
        startupId && error ? <p className="form-error" role="alert">{error}</p> : <form className="form-panel" onSubmit={handleSubmit}>
          {error && <p className="form-error" role="alert">{error}</p>}
          <label>Startup name <span className={`field-hint${wordCounts.title > WORD_LIMITS.title ? ' word-count-error' : ''}`}>{wordCounts.title}/{WORD_LIMITS.title} words</span><input required maxLength={200} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
          <label>Problem you are solving <span className={`field-hint${wordCounts.problem > WORD_LIMITS.problem ? ' word-count-error' : ''}`}>{wordCounts.problem}/{WORD_LIMITS.problem} words</span><textarea required maxLength={5000} rows="4" value={form.problem} onChange={(event) => setForm({ ...form, problem: event.target.value })} /></label>
          <label>Your solution <span className={`field-hint${wordCounts.solution > WORD_LIMITS.solution ? ' word-count-error' : ''}`}>{wordCounts.solution}/{WORD_LIMITS.solution} words</span><textarea required maxLength={5000} rows="4" value={form.solution} onChange={(event) => setForm({ ...form, solution: event.target.value })} /></label>
          <label>Stage<select value={form.stage} onChange={(event) => setForm({ ...form, stage: event.target.value })}><option value="IDEA">Idea</option><option value="DEVELOPMENT">Development</option><option value="COMPLETED">Completed</option></select></label>
          <p className="field-hint">Idea and Development listings welcome developers, mentors, and sponsors. Completed ideas can connect with sponsors.</p>
          <div className="form-actions"><Link className="button button-secondary" to="/dashboard">Cancel</Link><button className="button button-primary" disabled={saving || exceedsWordLimit}>{saving ? 'Saving…' : startupId ? 'Save changes' : 'Publish startup'}</button></div>
        </form>
      )}
      </>}
    </main>
  )
}
