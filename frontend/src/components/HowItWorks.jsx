import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

const STEPS = {
  founder: [
    {
      number: '01',
      title: 'Publish your startup',
      description: 'Share the problem, your solution, and whether the idea is in development or completed.',
    },
    {
      number: '02',
      title: 'Review people interested',
      description: 'Review each person’s interest type and message in your workspace.',
    },
    {
      number: '03',
      title: 'Connect directly',
      description: 'Accept a request to make an introduction, then arrange collaboration outside StartupBridge.',
    },
  ],
  sponsor: [
    {
      number: '01',
      title: 'Discover local startups',
      description: 'Browse opportunities founded in your registered country.',
    },
    {
      number: '02',
      title: 'Choose how to help',
      description: 'Completed ideas are looking for sponsors; earlier ideas may also need developers or mentors.',
    },
    {
      number: '03',
      title: 'Send a sponsor request',
      description: 'Tell the founder how you could support them, then discuss any partnership directly after connecting.',
    },
  ],
}

export default function HowItWorks() {
  const { user } = useAuth()
  const [selectedAudience, setSelectedAudience] = useState(null)
  const audience = selectedAudience
    ?? (user?.role === 'SPONSOR' ? 'sponsor' : 'founder')

  return (
    <section className="how-section" id="how-it-works">
      <div className="section-heading">
        <div>
          <span className="section-eyebrow">Your StartupBridge guide</span>
          <h2>How it works for {audience === 'sponsor' ? 'sponsors' : 'founders'}</h2>
          <p>
            {audience === 'sponsor'
              ? 'Find promising local teams and support the right opportunity.'
              : 'Share your idea and connect with people who can help.'}
          </p>
        </div>
      </div>

      <div className="how-audience-switch" role="group" aria-label="Choose how to view the process">
        <button
          type="button"
          className={audience === 'founder' ? 'is-active' : ''}
          aria-pressed={audience === 'founder'}
          onClick={() => setSelectedAudience('founder')}
        >
          I’m a founder
        </button>
        <button
          type="button"
          className={audience === 'sponsor' ? 'is-active' : ''}
          aria-pressed={audience === 'sponsor'}
          onClick={() => setSelectedAudience('sponsor')}
        >
          I’m a sponsor
        </button>
      </div>

      <div className="how-grid">
        {STEPS[audience].map((step) => (
          <article className="how-card" key={step.number}>
            <span className="how-number">{step.number}</span>
            <h3>{step.title}</h3>
            <p>{step.description}</p>
          </article>
        ))}
      </div>
      <div className="how-actions">
        <Link className="button button-primary" to={audience === 'sponsor' ? '/startups' : '/startups/new'}>
          {audience === 'sponsor' ? 'Discover startups' : 'Publish your startup'}
        </Link>
      </div>
    </section>
  )
}
