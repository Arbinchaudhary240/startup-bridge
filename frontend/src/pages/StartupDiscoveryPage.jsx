import { useState } from 'react'
import StartupDiscovery from '../features/startups/StartupDiscovery'
import ConnectionRequestModal from '../features/startups/ConnectionRequestModal'

export default function StartupDiscoveryPage() {
  const [selectedStartup, setSelectedStartup] = useState(null)
  const [interestSentIds, setInterestSentIds] = useState([])

  function handleSent() {
    setInterestSentIds((current) => [...new Set([...current, selectedStartup.id])])
    setSelectedStartup(null)
  }

  return (
    <main>
      <StartupDiscovery
        onInterest={setSelectedStartup}
        interestSentIds={interestSentIds}
      />
      {selectedStartup && <ConnectionRequestModal
        startup={selectedStartup}
        onClose={() => setSelectedStartup(null)}
        onSent={handleSent}
      />}
    </main>
  )
}
