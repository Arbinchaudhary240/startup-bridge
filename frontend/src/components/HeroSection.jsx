import { Link } from 'react-router-dom'

export default function HeroSection() {
  return (
    <section className="hero-section">
      <div className="hero-content">
        <span className="hero-eyebrow">
          Build something meaningful
        </span>

        <h1>
          Great ideas grow
          <br />
          <span>with the right people.</span>
        </h1>

        <p>
          Connect startup founders with developers, mentors, and
          sponsors to turn promising ideas into real products.
        </p>

        <div className="hero-actions">
          <Link className="hero-primary-button" to="/startups">
            Explore startups
          </Link>
          <Link className="hero-secondary-button" to="/register">
            Join StartupBridge
          </Link>
        </div>
      </div>
    </section>
  )
}
