import { useCallback, useEffect, useRef, useState } from 'react'
import { apiRequest } from '../../lib/apiClient'

const PAGE_SIZE = 100
const MEET_INVITATION = 'Would you be available for a quick Google Meet to discuss this idea?'

function countWords(value) {
  return value.trim() ? value.trim().split(/\s+/).length : 0
}

export default function ConnectionMessages({ connection, currentUser }) {
  const [messages, setMessages] = useState([])
  const [message, setMessage] = useState('')
  const [nextPage, setNextPage] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [sending, setSending] = useState(false)
  const messageInputRef = useRef(null)
  const loadedThroughPage = useRef(1)
  const wordCount = countWords(message)
  const basePath = `/connections/${connection.id}/messages/`

  const loadLatest = useCallback(async () => {
    try {
      const data = await apiRequest(`${basePath}?page=1&page_size=${PAGE_SIZE}`)
      const latestMessages = data.results || data
      setMessages((current) => {
        const latestIds = new Set(latestMessages.map((item) => item.id))
        return [
          ...latestMessages,
          ...current.filter((item) => !latestIds.has(item.id)),
        ]
      })
      if (loadedThroughPage.current === 1) {
        setNextPage(data.next ? 2 : null)
      }
      setError('')
    } catch (requestError) {
      setError(requestError.message || 'Could not load this conversation.')
    } finally {
      setLoading(false)
    }
  }, [basePath])

  useEffect(() => {
    const initialLoad = window.setTimeout(loadLatest, 0)
    const interval = window.setInterval(loadLatest, 10000)
    return () => {
      window.clearTimeout(initialLoad)
      window.clearInterval(interval)
    }
  }, [loadLatest])

  async function loadOlderMessages() {
    if (!nextPage || loadingOlder) return
    setLoadingOlder(true)
    setError('')
    try {
      const data = await apiRequest(`${basePath}?page=${nextPage}&page_size=${PAGE_SIZE}`)
      const olderMessages = data.results || data
      setMessages((current) => {
        const existingIds = new Set(current.map((item) => item.id))
        return [
          ...current,
          ...olderMessages.filter((item) => !existingIds.has(item.id)),
        ]
      })
      loadedThroughPage.current = nextPage
      setNextPage(data.next ? nextPage + 1 : null)
    } catch (requestError) {
      setError(requestError.message || 'Could not load older messages.')
    } finally {
      setLoadingOlder(false)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const body = message.trim()
    if (!body || wordCount > 300 || sending) return

    setSending(true)
    setError('')
    try {
      await apiRequest(basePath, { method: 'POST', body: { body } })
      setMessage('')
      await loadLatest()
    } catch (requestError) {
      setError(requestError.message || 'Could not send your message.')
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="connection-thread" aria-label={`Messages about ${connection.startup_title}`}>
      <div className="connection-thread-heading">
        <h4>Conversation</h4>
        <span>Messages refresh automatically</span>
      </div>
      <aside className="meet-suggestion" aria-label="Google Meet suggestion">
        <div>
          <strong>Ready to discuss this idea?</strong>
          <p>Create a Google Meet, then share its link in this conversation.</p>
        </div>
        <div className="meet-suggestion-actions">
          <a
            className="button button-primary button-small"
            href="https://meet.google.com/new"
            target="_blank"
            rel="noopener noreferrer"
          >
            Create a Meet
          </a>
          <button
            className="button button-secondary button-small"
            type="button"
            onClick={() => {
              setMessage(MEET_INVITATION)
              messageInputRef.current?.focus()
            }}
          >
            Suggest a time
          </button>
        </div>
      </aside>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="connection-message-list" aria-live="polite">
        {loading ? <p className="muted">Loading messages…</p> : messages.length === 0 ? (
          <p className="muted">No messages yet. Start the conversation below.</p>
        ) : (
          <>
            {nextPage && <button className="load-older-messages" type="button" onClick={loadOlderMessages} disabled={loadingOlder}>
              {loadingOlder ? 'Loading…' : 'Load older messages'}
            </button>}
            {[...messages].reverse().map((item) => {
              const isCurrentUser = item.sender_username === currentUser?.username
              return (
                <article className={`connection-message${isCurrentUser ? ' own-message' : ''}`} key={item.id}>
                  <div className="connection-message-meta">
                    <strong>{isCurrentUser ? 'You' : item.sender_username}</strong>
                    <time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString()}</time>
                  </div>
                  <p>{item.body}</p>
                </article>
              )
            })}
          </>
        )}
      </div>
      <form className="connection-message-composer" onSubmit={handleSubmit}>
        <label htmlFor={`reply-${connection.id}`}>Write a message
          <textarea
            id={`reply-${connection.id}`}
            ref={messageInputRef}
            rows="3"
            maxLength={6000}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            required
          />
        </label>
        <div className="connection-composer-footer">
          <span className={wordCount > 300 ? 'word-count word-count-error' : 'word-count'}>{wordCount}/300 words</span>
          <button className="button button-primary button-small" type="submit" disabled={!wordCount || wordCount > 300 || sending}>
            {sending ? 'Sending…' : 'Send message'}
          </button>
        </div>
      </form>
    </section>
  )
}
