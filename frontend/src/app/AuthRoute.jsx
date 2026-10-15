import { useLocation, useNavigate } from 'react-router-dom'
import AuthModal from '../features/auth/AuthModal'

export default function AuthRoute({ mode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const returnPath = location.state?.from?.pathname
  const safeReturnPath = typeof returnPath === 'string'
    && returnPath.startsWith('/')
    && !returnPath.startsWith('//')
    ? returnPath
    : '/dashboard'

  return (
    <AuthModal
      mode={mode}
      onClose={() => navigate('/')}
      onAuthenticated={() => navigate(safeReturnPath, { replace: true })}
    />
  )
}
