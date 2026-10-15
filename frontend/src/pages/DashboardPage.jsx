import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getDashboardData, respondToRequest } from '../features/workspace/workspaceApi'
import ConnectionMessages from '../features/workspace/ConnectionMessages'
import { useAuth } from '../context/useAuth'

const PAGE_KEYS = [
  'startups',
  'receivedConnections',
  'sentConnections',
]
const PAGE_SIZE = 100
const FIRST_PAGE = Object.fromEntries(PAGE_KEYS.map((key) => [key, 1]))
const EMPTY_PAGE = { results: [], count: 0 }

function label(value = '') {
  return value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function SectionPagination({ page, count, onPageChange }) {
  const pageCount = Math.ceil(count / PAGE_SIZE)
  if (pageCount <= 1) return null

  const firstItem = (page - 1) * PAGE_SIZE + 1
  const lastItem = Math.min(page * PAGE_SIZE, count)

  return (
    <nav className="startup-pagination" aria-label="Workspace section pages">
      <p>Showing {firstItem}–{lastItem} of {count}</p>
      <div className="startup-pagination-controls">
        <button
          className="button button-secondary button-small"
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
        >
          Previous
        </button>
        <span aria-live="polite">Page {page} of {pageCount}</span>
        <button
          className="button button-secondary button-small"
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page === pageCount}
        >
          Next
        </button>
      </div>
    </nav>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const canPublishStartup = ['FOUNDER', 'BOTH'].includes(user?.role)
  const [data, setData] = useState({
    startups: EMPTY_PAGE,
    receivedConnections: EMPTY_PAGE,
    sentConnections: EMPTY_PAGE,
  })
  const [pages, setPages] = useState(FIRST_PAGE)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busyId, setBusyId] = useState('')
  const [selectedMessageConnectionId, setSelectedMessageConnectionId] = useState(null)
  const [reloadCount, setReloadCount] = useState(0)

  useEffect(() => {
    let active = true
    async function loadDashboard() {
      setLoading(true)
      setError('')
      try {
        const result = await getDashboardData(pages)
        if (active) {
          setData(result)
        }
      } catch (requestError) {
        if (active) setError(requestError.message || 'Could not load your workspace.')
      } finally {
        if (active) setLoading(false)
      }
    }
    loadDashboard()
    return () => { active = false }
  }, [pages, reloadCount])

  function refresh() {
    setReloadCount((count) => count + 1)
  }

  function changePage(section, page) {
    setPages((current) => ({ ...current, [section]: page }))
  }

  async function handleDecision(kind, item, decision) {
    setBusyId(item.id)
    setNotice('')
    try {
      await respondToRequest(kind, item.id, decision)
      setNotice(`Request ${decision.toLowerCase()}.`)
      setPages(FIRST_PAGE)
      refresh()
    } catch (requestError) {
      setError(requestError.message || 'Could not update this request.')
    } finally {
      setBusyId('')
    }
  }

  function renderConnection(connection, direction) {
    const isSent = direction === 'sent'
    return (
      <article className="list-row list-row-stack" key={connection.id}>
        <div className="list-row-top">
          <div>
            <h3>{connection.startup_title}</h3>
            <p>{isSent ? `Sent to ${connection.startup_title}` : `Received from ${connection.requester_username}`} · {label(connection.status)}</p>
          </div>
          <span className={`status-pill status-${connection.status?.toLowerCase()}`}>{label(connection.status)}</span>
        </div>
        {Array.isArray(connection.interests) && connection.interests.length > 0 && (
          <p className="row-description"><strong>Interested in:</strong> {connection.interests.map(label).join(', ')}</p>
        )}
        {connection.message && connection.status !== 'ACCEPTED' && <p className="row-description">{connection.message}</p>}
        {!isSent && connection.status === 'PENDING' && (
          <div className="row-actions">
            <button className="button button-primary button-small" disabled={busyId === connection.id} onClick={() => handleDecision('connections', connection, 'ACCEPTED')}>Accept</button>
            <button className="button button-secondary button-small" disabled={busyId === connection.id} onClick={() => handleDecision('connections', connection, 'REJECTED')}>Decline</button>
          </div>
        )}
      </article>
    )
  }

  const acceptedConnections = [...data.receivedConnections.results, ...data.sentConnections.results]
    .filter((connection) => connection.status === 'ACCEPTED')
    .sort((first, second) => new Date(second.created_at) - new Date(first.created_at))

  return (
    <main className="page-container">
      <header className="page-heading">
        <div>
          <p className="eyebrow">YOUR WORKSPACE</p>
          <h1>Dashboard</h1>
          <p>Publish startup ideas and manage connection requests with potential collaborators.</p>
          <a className="text-link" href="#messages">Go to your messages</a>
        </div>
        {canPublishStartup && <Link className="button button-primary" to="/startups/new">Publish a startup</Link>}
      </header>

      {notice && <p className="inline-notice" role="status">{notice}</p>}
      {error && <div className="state-panel error-panel" role="alert"><p>{error}</p><button className="button button-secondary" onClick={refresh}>Try again</button></div>}
      {loading && <p className="state-panel" role="status">Loading your workspace…</p>}

      {!loading && !error && (
        <div className="workspace-grid">
          <section className="workspace-panel">
            <div className="panel-heading">
              <div><p className="eyebrow">YOUR IDEAS</p><h2>Startup listings</h2></div>
              <div className="panel-heading-actions">
                {canPublishStartup && <Link to="/startups/new">Add listing</Link>}
              </div>
            </div>
            <div className="workspace-panel-content">
              {data.startups.count === 0 ? <p className="muted">No startup listings yet.</p> : data.startups.results.map((startup) => (
                <article className="list-row" key={startup.id}>
                  <div><h3>{startup.title}</h3><p>{label(startup.stage)} · {label(startup.status)}</p></div>
                  <Link className="button button-secondary button-small" to={`/startups/${startup.id}/edit`}>Edit</Link>
                </article>
              ))}
              <SectionPagination page={pages.startups} count={data.startups.count} onPageChange={(page) => changePage('startups', page)} />
            </div>
          </section>

          <section className="workspace-panel">
            <div className="panel-heading">
              <div><p className="eyebrow">BUILD TOGETHER</p><h2>Received requests</h2></div>
              <div className="panel-heading-actions">
                <span className="count-pill">{data.receivedConnections.count}</span>
              </div>
            </div>
            <div className="workspace-panel-content">
              {data.receivedConnections.count === 0 ? <p className="muted">No connection requests received yet.</p> : data.receivedConnections.results.map((connection) => renderConnection(connection, 'received'))}
              <SectionPagination page={pages.receivedConnections} count={data.receivedConnections.count} onPageChange={(page) => changePage('receivedConnections', page)} />
            </div>
          </section>

          <section className="workspace-panel">
            <div className="panel-heading">
              <div><p className="eyebrow">YOUR OUTREACH</p><h2>Sent requests</h2></div>
              <div className="panel-heading-actions">
                <span className="count-pill">{data.sentConnections.count}</span>
              </div>
            </div>
            <div className="workspace-panel-content">
              {data.sentConnections.count === 0 ? <p className="muted">You haven’t sent any connection requests yet.</p> : data.sentConnections.results.map((connection) => renderConnection(connection, 'sent'))}
              <SectionPagination page={pages.sentConnections} count={data.sentConnections.count} onPageChange={(page) => changePage('sentConnections', page)} />
            </div>
          </section>

          <section className="workspace-panel workspace-messages-panel" id="messages">
            <div className="panel-heading">
              <div><p className="eyebrow">KEEP IN TOUCH</p><h2>Messages</h2></div>
              <div className="panel-heading-actions">
                  <span className="count-pill">{acceptedConnections.length}</span>
              </div>
            </div>
            <div className="workspace-panel-content">
              <p className="muted">Conversations are available after a connection request is accepted. Open one to read and send messages.</p>
              {acceptedConnections.map((connection) => {
                    const isRequester = String(connection.requester) === String(user?.id)
                    const participantName = isRequester
                      ? connection.founder_username || 'Founder'
                      : connection.requester_username
                    const isSelected = selectedMessageConnectionId === connection.id
                    return (
                      <article className="list-row list-row-stack" key={connection.id}>
                        <div className="list-row-top">
                          <div>
                            <h3>{connection.startup_title}</h3>
                            <p>Conversation with {participantName}</p>
                          </div>
                          <span className="status-pill status-accepted">Connected</span>
                        </div>
                        <button
                          className="button button-secondary button-small"
                          type="button"
                          aria-expanded={isSelected}
                          onClick={() => setSelectedMessageConnectionId((current) => current === connection.id ? null : connection.id)}
                        >
                          {isSelected ? 'Close conversation' : 'Open conversation'}
                        </button>
                        {isSelected && <ConnectionMessages connection={connection} currentUser={user} />}
                      </article>
                    )
                  })}
                  {acceptedConnections.length === 0 && <p className="muted">No conversations yet. When a founder accepts a request, it will appear here.</p>}
            </div>
          </section>

        </div>
      )}
    </main>
  )
}
