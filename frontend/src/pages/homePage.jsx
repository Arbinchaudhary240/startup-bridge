import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Navbar from '../components/Navbar'
import HeroSection from '../components/HeroSection'
import HowItWorks from '../components/HowItWorks'
import Footer from '../components/Footer'

export default function HomePage() {
  const location = useLocation()

  useEffect(() => {
    if (location.hash !== '#how-it-works') return

    const frame = window.requestAnimationFrame(() => {
      document.getElementById('how-it-works')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    })

    return () => window.cancelAnimationFrame(frame)
  }, [location.hash])

  return (
    <div className="app-shell">
      <Navbar />
      <main>
        <HeroSection />
        <HowItWorks />
      </main>
      <Footer />
    </div>
  )
}
