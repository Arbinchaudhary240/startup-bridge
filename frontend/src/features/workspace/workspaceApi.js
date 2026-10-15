import { apiRequest } from '../../lib/apiClient'

const PAGE_SIZE = 100

async function getPage(path, page, filters = {}) {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(PAGE_SIZE),
    ...filters,
  })
  const data = await apiRequest(`${path}?${params}`)
  if (Array.isArray(data)) {
    return { results: data, count: data.length }
  }
  if (Array.isArray(data?.results) && Number.isInteger(data.count)) return data
  throw new Error('Unexpected list response from the server.')
}

export function getDashboardData(pages) {
  return Promise.all([
    getPage('/startups/mine/', pages.startups),
    getPage('/connections/', pages.receivedConnections, { direction: 'received' }),
    getPage('/connections/', pages.sentConnections, { direction: 'sent' }),
  ]).then(([startups, receivedConnections, sentConnections]) => ({
    startups,
    receivedConnections,
    sentConnections,
  }))
}

export function respondToRequest(kind, id, decision) {
  return apiRequest(`/${kind}/${id}/respond/`, {
    method: 'POST',
    body: { decision },
  })
}
