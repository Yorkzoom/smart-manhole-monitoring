import { useState } from 'react'
import { useSocket } from './hooks/useSocket'
import LoadingScreen from './components/LoadingScreen'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import MapSection from './components/MapSection'
import StatsBar from './components/StatsBar'
import SensorGrid from './components/SensorGrid'
import ChartSection from './components/ChartSection'
import AiAnalysisPanel from './components/AiAnalysisPanel'
import AlertsPanel from './components/AlertsPanel'
import Footer from './components/Footer'

export default function App() {
  const [loading, setLoading] = useState(true)
  const {
    connected, currentData, history, alerts,
    locationName, mapCenter, aiAnalysis,
    saveLocation, moveMarker,
  } = useSocket()

  return (
    <>
      {loading && <LoadingScreen onComplete={() => setLoading(false)} />}

      <div className="min-h-screen bg-bg text-text-primary font-body">
        <Navbar
          connected={connected}
          locationName={locationName}
          onSaveLocation={saveLocation}
        />
        <Hero data={currentData} />
        <MapSection
          center={mapCenter}
          currentData={currentData}
          onMoveMarker={moveMarker}
        />
        <StatsBar data={currentData} />
        <SensorGrid data={currentData} />
        <ChartSection history={history} />
        <AiAnalysisPanel analysis={aiAnalysis} />
        <AlertsPanel alerts={alerts} />
        <Footer />
      </div>
    </>
  )
}
