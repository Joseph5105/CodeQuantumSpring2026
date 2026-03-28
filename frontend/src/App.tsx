import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/landing-page'
import StudioPage from './pages/design-studio'
import RaceSimulationPage from './pages/race-simulation'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/studio" element={<StudioPage />} />
        <Route path="/race-simulation" element={<RaceSimulationPage />} />
      </Routes>
    </Router>
  )
}

export default App