import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import Footer from '../components/Footer.jsx'

export default function NotFoundPage() {
  return (
    <div className="app-shell">
      <Navbar />
      <main className="page-container not-found-page">
        <span className="not-found-code">404</span>
        <h1>We couldn’t find that page</h1>
        <p>The link may be incorrect, or the page may have moved.</p>
        <Link className="button button-primary" to="/">Back to StartupBridge</Link>
      </main>
      <Footer />
    </div>
  )
}
