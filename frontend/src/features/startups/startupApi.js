import { apiRequest } from '../../lib/apiClient'

export async function getStartups({
  search = '',
  stage = '',
  page = 1,
  pageSize = 6,
  signal,
} = {}) {
  const params = new URLSearchParams()

  if (search.trim()) params.set('search', search.trim())
  if (stage) params.set('stage', stage)
  params.set('page', String(page))
  params.set('page_size', String(pageSize))

  const data = await apiRequest(`/startups/?${params.toString()}`, { signal })

  if (Array.isArray(data)) {
    return { results: data, count: data.length, next: null, previous: null }
  }
  if (Array.isArray(data?.results) && Number.isInteger(data.count)) return data

  throw new Error('Unexpected startup list response from the server.')
}

export function expressInterest(startupId, token, { interests, message }) {
  return apiRequest(`/startups/${startupId}/interest/`, {
    method: 'POST',
    token,
    body: { interests, message },
  })
}
