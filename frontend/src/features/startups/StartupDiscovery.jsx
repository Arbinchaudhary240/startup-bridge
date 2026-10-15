import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getStartups } from './startupApi'
import StartupCard from './StartupCard'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { useAuth } from '../../context/useAuth'

const STAGES = [
  { value: '', label: 'All stages' },
  { value: 'IDEA', label: 'Idea' },
  { value: 'DEVELOPMENT', label: 'Development' },
  { value: 'COMPLETED', label: 'Completed' },
]

const STARTUPS_PER_PAGE = 6

export default function StartupDiscovery({
  onInterest,
  interestSentIds = [],
}) {
  const { user, authLoading } = useAuth()
  const isCountryRestricted = user?.role === 'SPONSOR'
  const [search, setSearch] = useState('')
  const [stage, setStage] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageData, setPageData] = useState({ results: [], count: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retryCount, setRetryCount] = useState(0)

  // Wait briefly before fetching after search input changes.
  const debouncedSearch = useDebouncedValue(search, 300)
  const startups = pageData.results
  const pageCount = Math.ceil(pageData.count / STARTUPS_PER_PAGE)
  const pageStart = (currentPage - 1) * STARTUPS_PER_PAGE

  function resetPageAndUpdate(setter, value) {
    setCurrentPage(1)
    setter(value)
  }

  useEffect(() => {
    const controller = new AbortController()

    async function loadStartups() {
      if (authLoading || !user) {
        setPageData({ results: [], count: 0 })
        setLoading(authLoading)
        return
      }

      setLoading(true)
      setError('')

      try {
        const resultPage = await getStartups({
          search: debouncedSearch,
          stage,
          page: currentPage,
          pageSize: STARTUPS_PER_PAGE,
          signal: controller.signal,
        })

        setPageData(resultPage)
      } catch (requestError) {
        if (requestError.name === 'AbortError') return

        setError(
          requestError.message || 'Could not load startups.',
        )
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadStartups()

    // Cancel the previous request if filters change or the page unmounts.
    return () => controller.abort()
  }, [authLoading, user, debouncedSearch, stage, currentPage, retryCount])

  if (!authLoading && !user) {
    return (
      <section className="discovery-section" id="discover">
        <div className="section-heading">
          <div>
            <span className="section-eyebrow">Explore opportunities</span>
            <h2>Discover startups</h2>
            <p>Sign in to discover startup opportunities.</p>
          </div>
        </div>
        <div className="empty-state">
          <p>Startup listings are available after sign-in.</p>
          <Link className="button button-primary" to="/login" state={{ from: { pathname: '/' } }}>Sign in to discover</Link>
        </div>
      </section>
    )
  }

  return (
    <section className="discovery-section" id="discover">
      <div className="section-heading">
        <div>
          <span className="section-eyebrow">Explore opportunities</span>
          <h2>Discover startups</h2>
          <p>
            {isCountryRestricted
              ? 'As a sponsor, you’ll see startup opportunities in your registered country.'
              : 'Explore startup opportunities across all countries and find ideas and teams that match your skills.'}
          </p>
        </div>
      </div>

      <div className="filter-panel">
        <label className="filter-control filter-search" htmlFor="startup-search">
          <span>Search startups</span>
          <input id="startup-search" type="search" placeholder="Search by title or problem..." value={search} onChange={(event) => resetPageAndUpdate(setSearch, event.target.value)} />
        </label>
        <label className="filter-control" htmlFor="startup-stage">
          <span>Stage</span>
          <select id="startup-stage" value={stage} onChange={(event) => resetPageAndUpdate(setStage, event.target.value)}>
            {STAGES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      </div>

      {loading && (
        <p className="discovery-status" role="status">
          Loading startups...
        </p>
      )}

      {!loading && error && (
        <div className="discovery-error" role="alert">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => setRetryCount((count) => count + 1)}
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !error && startups.length === 0 && (
        <div className="empty-state">
          <h3>No startups found</h3>
          <p>Try changing your search or filters.</p>
          <button
            type="button"
            onClick={() => {
              setCurrentPage(1)
              setSearch('')
              setStage('')
            }}
          >
            Clear filters
          </button>
        </div>
      )}

      {!loading && !error && startups.length > 0 && (
        <div className="startup-grid">
          {startups.map((startup) => (
            <StartupCard
              key={startup.id}
              startup={startup}
              onInterest={() => onInterest(startup)}
              interestSent={interestSentIds.includes(startup.id)}
            />
          ))}
        </div>
      )}

      {!loading && !error && pageCount > 1 && (
        <nav className="startup-pagination" aria-label="Startup pages">
          <p>
            Showing {pageStart + 1}–{Math.min(pageStart + startups.length, pageData.count)} of {pageData.count} startups
          </p>
          <div className="startup-pagination-controls">
            <button
              className="button button-secondary button-small"
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <span aria-live="polite">Page {currentPage} of {pageCount}</span>
            <button
              className="button button-secondary button-small"
              type="button"
              onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}
              disabled={currentPage === pageCount}
            >
              Next
            </button>
          </div>
        </nav>
      )}
    </section>
  )
}
