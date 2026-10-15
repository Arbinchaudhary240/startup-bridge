import { useAuth } from '../../context/useAuth'
import { Link } from 'react-router-dom'

function formatLabel(value) {
  if (!value) return ''

  return String(value)
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function getFounderName(startup) {
  const founder = startup.founder

  // Avoid showing a UUID as if it were the founder's name.
  if (founder && typeof founder === 'object') {
    return founder.full_name || founder.username || 'Founder'
  }

  return startup.founder_username || startup.founder_name || 'Founder'
}

export default function StartupCard({
  startup,
  onInterest,
  interestSent = false,
}) {
  const { user } = useAuth()
  const resources = Array.isArray(startup.looking_for) ? startup.looking_for : []
  const isOwner = startup.founder_username === user?.username
  const canExpressInterest = startup.status === 'OPEN' && !isOwner

  return (
    <article className="startup-card">
      <Link
        className="startup-card-stretched-link"
        to={`/startups/${startup.id}`}
        aria-label={`Read the full ${startup.title || 'startup'} idea`}
        tabIndex={-1}
      />
      <div className="startup-card-meta">
        {startup.stage && (
          <span className="startup-stage">
            {formatLabel(startup.stage)}
          </span>
        )}
      </div>

      <h3><Link className="startup-title-link" to={`/startups/${startup.id}`}>{startup.title || 'Untitled startup'}</Link></h3>

      {startup.problem && (
        <div className="startup-detail">
          <h4>Problem</h4>
          <p>{startup.problem}</p>
        </div>
      )}

      {startup.solution && (
        <div className="startup-detail">
          <h4>Solution</h4>
          <p>{startup.solution}</p>
        </div>
      )}

      {resources.length > 0 && (
        <div className="startup-resources">
          <h4>Looking for</h4>
          <ul>
            {resources.map((resource, index) => (
              <li key={`${resource}-${index}`}>
                {formatLabel(resource)}
              </li>
            ))}
          </ul>
        </div>
      )}


      <div className="startup-card-footer">
        <div>
          <span className="startup-founder">
            By {getFounderName(startup)}
          </span>
        </div>

        {canExpressInterest && !interestSent ? (
          <button
            type="button"
            className="interest-button"
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              onInterest()
            }}
            disabled={!startup.id}
          >
            Show interest
          </button>
        ) : isOwner ? <span className="owner-label">Your startup</span> : interestSent ? <span className="owner-label">Request sent</span> : null}
      </div>
    </article>
  )
}
