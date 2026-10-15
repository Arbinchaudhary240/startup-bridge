
import {
  useCallback,
  useEffect,
  useState,
} from 'react'
import { AuthContext } from './AuthContext'
import { apiRequest } from '../lib/apiClient'


function clearStoredSession() {
  sessionStorage.removeItem('access_token')
  sessionStorage.removeItem('refresh_token')
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    function handleSessionExpired() {
      setUser(null)
      setAuthLoading(false)
    }

    window.addEventListener('startupbridge:session-expired', handleSessionExpired)
    return () => {
      window.removeEventListener('startupbridge:session-expired', handleSessionExpired)
    }
  }, [])

  // Always retrieve the profile from the server instead of trusting cached identity data.
  const fetchProfile = useCallback(async (token) => {
    const profile = await apiRequest('/profile/me/', { token })
    const authenticatedUser = profile?.user ?? profile

    setUser(authenticatedUser)
    return authenticatedUser
  }, [])

  // Restore the session when the application starts or reloads.
  useEffect(() => {
    let cancelled = false

    async function restoreSession() {
      const token = sessionStorage.getItem('access_token')

      if (!token && !sessionStorage.getItem('refresh_token')) {
        setAuthLoading(false)
        return
      }

      try {
        const profile = await apiRequest('/profile/me/', { token })

        if (!cancelled) {
          setUser(profile?.user ?? profile)
        }
      } catch {
        if (!cancelled) {
          setUser(null)
        }
      } finally {
        if (!cancelled) {
          setAuthLoading(false)
        }
      }
    }

    restoreSession()

    return () => {
      cancelled = true
    }
  }, [])

  // Login: Django issues the JWTs, then we fetch the actual user profile.
  const login = useCallback(async (username, password) => {
    const tokens = await apiRequest('/auth/token/', {
      method: 'POST',
      body: { username, password },
    })

    if (!tokens?.access) {
      throw new Error('The server did not return an access token.')
    }

    // Clear old tokens before saving the new session.
    clearStoredSession()
    // Keep bearer tokens tab-scoped instead of persisting them across browser sessions.
    sessionStorage.setItem('access_token', tokens.access)
    if (tokens.refresh) sessionStorage.setItem('refresh_token', tokens.refresh)

    try {
      return await fetchProfile(tokens.access)
    } catch (error) {
      if (error.status === 401) clearStoredSession()
      setUser(null)
      throw error
    }
  }, [fetchProfile])

  // Registration creates the account; the modal logs in afterward.
  const register = useCallback(async (formData) => {
    return apiRequest('/auth/register/', {
      method: 'POST',
      body: formData,
    })
  }, [])

  // Client-side logout clears this browser's tokens.
  // It does not revoke a copied JWT on the server.
  const logout = useCallback(() => {
    clearStoredSession()
    setUser(null)
  }, [])

  const value = {
    user,
    authLoading,
    login,
    register,
    logout,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
