import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import ConnectionRequestModal from '../features/startups/ConnectionRequestModal.jsx'
import { apiRequest } from '../lib/apiClient.js'

function formatLabel(value = '') {
  return value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export default function StartupDetailPage() {
  const { startupId } = useParams()
  const { user } = useAuth()
  const [startup, setStartup] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [requestSent, setRequestSent] = useState(false)
  const [showRequestForm, setShowRequestForm] = useState(false)

  useEffect(() => {
    let active = true
    apiRequest(`/startups/${startupId}/`)
      .then((result) => { if (active) setStartup(result) })
      .catch((requestError) => { if (active) setError(requestError.message || 'Could not load this startup.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [startupId])

  const isOwner = startup?.founder_username === user?.username

  return (
    <main className="page-container narrow-page">
      <p className="back-link"><Link to="/startups">← Back to startup discovery</Link></p>
      {loading && <p className="state-panel" role="status">Loading startup…</p>}
      {!loading && error && !startup && <p className="form-error" role="alert">{error}</p>}
      {startup && <>
        <article className="startup-detail-page">
          <div className="startup-card-meta">
            <span className="startup-stage">{formatLabel(startup.stage)}</span>
          </div>
          <p className="eyebrow">{formatLabel(startup.status)} OPPORTUNITY</p>
          <h1>{startup.title}</h1>
          <p className="startup-detail-byline">Founded by {startup.founder_username}</p>
          <section><h2>The problem</h2><p>{startup.problem}</p></section>
          <section><h2>The solution</h2><p>{startup.solution}</p></section>
          {Array.isArray(startup.looking_for) && startup.looking_for.length > 0 && <section><h2>Looking for</h2><ul className="detail-needs">{startup.looking_for.map((need) => <li key={need}>{formatLabel(need)}</li>)}</ul></section>}
          <div className="detail-page-footer">
            <span className="field-hint">Connect directly with the founder to explore the idea.</span>
            {isOwner ? <Link className="button button-secondary" to={`/startups/${startup.id}/edit`}>Edit startup</Link> : startup.status === 'OPEN' && (requestSent ? <span className="owner-label">Request sent</span> : <button className="button button-primary" onClick={() => setShowRequestForm(true)}>Request to connect</button>)}
          </div>
          {error && startup && <p className="form-error" role="alert">{error}</p>}
        </article>
        {showRequestForm && <ConnectionRequestModal
          startup={startup}
          onClose={() => setShowRequestForm(false)}
          onSent={() => { setRequestSent(true); setShowRequestForm(false) }}
        />}
      </>}
    </main>
  )
}
