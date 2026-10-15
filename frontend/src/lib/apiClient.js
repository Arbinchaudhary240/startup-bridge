const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'
).replace(/\/+$/, '')

if (
  typeof window !== 'undefined'
  && window.location.protocol === 'https:'
  && API_BASE_URL.startsWith('http://')
) {
  throw new Error('The API must use HTTPS when StartupBridge is served over HTTPS.')
}

const SESSION_EXPIRED_EVENT = 'startupbridge:session-expired'
let refreshPromise

// Custom error so components can inspect HTTP status codes.
export class ApiError extends Error {
  constructor(message, status, data) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

function clearStoredSession() {
  sessionStorage.removeItem('access_token')
  sessionStorage.removeItem('refresh_token')
}

async function readResponseData(response) {
  if (response.status === 204) return null

  const contentType = response.headers.get('content-type') || ''
  return contentType.includes('application/json')
    ? response.json()
    : response.text()
}

function getErrorMessage(data, status) {
  let message = `Request failed (${status})`

  if (data && typeof data === 'object') {
    if (typeof data.detail === 'string') return data.detail

    const firstMessage = (value) => {
      if (typeof value === 'string') return value
      if (Array.isArray(value)) {
        for (const item of value) {
          const nestedMessage = firstMessage(item)
          if (nestedMessage) return nestedMessage
        }
      } else if (value && typeof value === 'object') {
        for (const item of Object.values(value)) {
          const nestedMessage = firstMessage(item)
          if (nestedMessage) return nestedMessage
        }
      }
      return ''
    }
    message = firstMessage(data) || message
  } else if (typeof data === 'string' && data.trim()) {
    message = data
  }

  return message
}

async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise

  const refreshToken = sessionStorage.getItem('refresh_token')
  if (!refreshToken) {
    if (sessionStorage.getItem('access_token')) {
      clearStoredSession()
      window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT))
    }
    return null
  }

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh: refreshToken }),
      })
      const data = await readResponseData(response)

      if (!response.ok || !data?.access) {
        clearStoredSession()
        window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT))
        return null
      }

      sessionStorage.setItem('access_token', data.access)
      if (data.refresh) {
        sessionStorage.setItem('refresh_token', data.refresh)
      }
      return data.access
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error(
          `Could not reach the API while refreshing your session. (${error.message})`,
          { cause: error },
        )
      }
      clearStoredSession()
      window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT))
      throw error
    } finally {
      refreshPromise = undefined
    }
  })()

  return refreshPromise
}

async function sendRequest(path, { method, body, signal }, accessToken) {
  const headers = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`

  try {
    return await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    if (error instanceof TypeError) {
      throw new Error(
        `Could not reach the API. Check that the backend is running and allows this website's origin. (${error.message})`,
        { cause: error },
      )
    }
    throw error
  }
}

export async function apiRequest(
  path,
  { method = 'GET', body, token, signal, skipAuth = false } = {},
) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const canRefresh = !skipAuth
    && !normalizedPath.startsWith('/auth/')
    && !signal?.aborted
  let accessToken = token || (
    skipAuth || normalizedPath.startsWith('/auth/')
      ? null
      : sessionStorage.getItem('access_token')
  )

  let response = await sendRequest(
    normalizedPath,
    { method, body, signal },
    accessToken,
  )

  if (response.status === 401 && canRefresh) {
    const refreshedToken = await refreshAccessToken()
    if (refreshedToken && !signal?.aborted) {
      accessToken = refreshedToken
      response = await sendRequest(
        normalizedPath,
        { method, body, signal },
        accessToken,
      )
    }
  }

  const data = await readResponseData(response)
  if (!response.ok) {
    throw new ApiError(getErrorMessage(data, response.status), response.status, data)
  }

  return data
}
