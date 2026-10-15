
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext.jsx'
import AuthRoute from './AuthRoute'
import HomePage from '../pages/homePage.jsx'
import StartupDiscoveryPage from '../pages/StartupDiscoveryPage.jsx'
import DashboardPage from '../pages/DashboardPage.jsx'
import ProfilePage from '../pages/ProfilePage.jsx'
import StartupFormPage from '../pages/StartupFormPage.jsx'
import StartupDetailPage from '../pages/StartupDetailPage.jsx'
import NotFoundPage from '../pages/NotFoundPage.jsx'
import { useAuth } from '../context/useAuth.js'
import Navbar from '../components/Navbar.jsx'
import Footer from '../components/Footer.jsx'
import '../App.css'

function ProtectedLayout({ children }) {
  const { user, authLoading } = useAuth()
  const location = useLocation()

  if (authLoading) return <p className="state-panel" role="status">Checking your session…</p>
  // Preserve the requested in-app path so successful login returns to the page.
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />

  return <div className="app-shell"><Navbar />{children}<Footer /></div>
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/startups" element={<ProtectedLayout><StartupDiscoveryPage /></ProtectedLayout>} />
          <Route path="/login" element={<AuthRoute mode="login" />} />
          <Route path="/register" element={<AuthRoute mode="register" />} />
          <Route path="/dashboard" element={<ProtectedLayout><DashboardPage /></ProtectedLayout>} />
          <Route path="/profile" element={<ProtectedLayout><ProfilePage /></ProtectedLayout>} />
          <Route path="/startups/new" element={<ProtectedLayout><StartupFormPage /></ProtectedLayout>} />
          <Route path="/startups/:startupId" element={<ProtectedLayout><StartupDetailPage /></ProtectedLayout>} />
          <Route path="/startups/:startupId/edit" element={<ProtectedLayout><StartupFormPage /></ProtectedLayout>} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
