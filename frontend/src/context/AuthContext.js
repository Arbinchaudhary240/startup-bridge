import { createContext } from 'react'

// Shared authentication context.
// Keep this separate from AuthProvider to satisfy the Fast Refresh lint rule.
export const AuthContext = createContext(null)
