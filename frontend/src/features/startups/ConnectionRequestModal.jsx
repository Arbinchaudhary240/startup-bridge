import { useState } from 'react'
import { expressInterest } from './startupApi'

const INTEREST_OPTIONS = [
  { value: 'DEVELOPMENT', label: 'Develop or contribute' },
  { value: 'MENTORSHIP', label: 'Mentor' },
  { value: 'SPONSORSHIP', label: 'Sponsor' },
]
const SUGGESTED_MESSAGE = 'Can we discuss more about this idea?'

function countWords(value) {
  return value.trim() ? value.trim().split(/\s+/).length : 0
}

export default function ConnectionRequestModal({ startup, onClose, onSent }) {
  const [interests, setInterests] = useState([])
  const [message, setMessage] = useState(SUGGESTED_MESSAGE)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const interestOptions = startup.stage === 'COMPLETED'
    ? INTEREST_OPTIONS.filter((option) => option.value === 'SPONSORSHIP')
    : INTEREST_OPTIONS
  const wordCount = countWords(message)

  function toggleInterest(value) {
    setInterests((current) => current.includes(value)
      ? current.filter((interest) => interest !== value)
      : [...current, value])
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!interests.length || !wordCount || wordCount > 300 || busy) return

    setBusy(true)
    setError('')
    try {
      await expressInterest(
        startup.id,
        sessionStorage.getItem('access_token'),
        { interests, message: message.trim() },
      )
      onSent()
    } catch (requestError) {
      setError(requestError.message || 'Could not send your connection request.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="connection-modal-overlay" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className="connection-modal" role="dialog" aria-modal="true" aria-labelledby="connection-modal-title">
        <button className="auth-close" type="button" aria-label="Close request form" onClick={onClose}>×</button>
        <p className="eyebrow">START A CONVERSATION</p>
        <h2 id="connection-modal-title">Connect with {startup.title}</h2>
        <p className="auth-subtitle">Choose how you would like to help and send the founder a message. You can edit the suggested text.</p>
        <form className="connection-request-form" onSubmit={handleSubmit}>
          <fieldset>
            <legend>I’m interested in</legend>
            {interestOptions.map((option) => (
              <label className="interest-choice" key={option.value}>
                <input
                  type="checkbox"
                  value={option.value}
                  checked={interests.includes(option.value)}
                  onChange={() => toggleInterest(option.value)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </fieldset>
          <label className="message-field" htmlFor="connection-message">Required message to the founder
            <textarea
              id="connection-message"
              rows="4"
              maxLength={6000}
              required
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
            <span className={wordCount > 300 ? 'word-count word-count-error' : 'word-count'} aria-live="polite">
              {wordCount}/300 words
            </span>
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="form-actions">
            <button className="button button-secondary" type="button" onClick={onClose}>Cancel</button>
            <button className="button button-primary" type="submit" disabled={busy || !interests.length || !wordCount || wordCount > 300}>
              {busy ? 'Sending…' : 'Send connection request'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
