import { useState } from 'react'
import './App.css'
import {
  simulationService,
  type NextTrackProbability,
  type SimulationResponse,
  type Sliders,
} from './services/api'

const defaultSliders: Sliders = {
  engine: 50,
  aero: 50,
  suspension: 50,
  transmission: 50,
  pitcrew: 50,
}

const sliderLabels: Record<keyof Sliders, string> = {
  engine: 'Engine Package',
  aero: 'Aerodynamics Package',
  suspension: 'Suspension Package',
  transmission: 'Transmission Package',
  pitcrew: 'Pit Crew Package',
}

function formatSeconds(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds)) return 'N/A'
  const value = Math.max(0, totalSeconds)
  const minutes = Math.floor(value / 60)
  const seconds = value - minutes * 60
  return `${minutes}:${seconds.toFixed(3).padStart(6, '0')}`
}

function App() {
  const [sliders, setSliders] = useState<Sliders>(defaultSliders)
  const [result, setResult] = useState<SimulationResponse | null>(null)
  const [nextTracks, setNextTracks] = useState<NextTrackProbability[]>([])
  const [submitting, setSubmitting] = useState(false)

  const onSliderChange = (key: keyof Sliders, value: number) => {
    setSliders((prev) => ({ ...prev, [key]: value }))
  }

  const runSimulation = async (e: React.FormEvent) => {
    e.preventDefault()

    setSubmitting(true)
    try {
      const [trackProbabilities, simulation] = await Promise.all([
        simulationService.getNextTrackProbabilities(),
        simulationService.simulate({ sliders }),
      ])

      setNextTracks(trackProbabilities)
      setResult(simulation)
    } catch (error) {
      console.error('Simulation failed:', error)
      alert('Simulation failed. Check backend logs for details.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container">
      <header>
        <h1>F1 Predictive Build Simulator</h1>
        <p>Set your package sliders and get probability-weighted next-race predictions.</p>
      </header>

      <main>
        <section className="form-section">
          <h2>Build Configuration</h2>
          <form onSubmit={runSimulation}>
            {Object.entries(sliderLabels).map(([key, label]) => {
              const sliderKey = key as keyof Sliders
              const value = sliders[sliderKey]
              return (
                <label key={sliderKey}>
                  {label}: {value}%
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={value}
                    onChange={(e) => onSliderChange(sliderKey, Number(e.target.value))}
                  />
                </label>
              )
            })}

            <button type="submit" className="add-btn" disabled={submitting}>
              {submitting ? 'Running Simulation...' : 'Run Simulation'}
            </button>
          </form>
        </section>

        <section className="list-section">
          <h2>Next Track Probabilities</h2>
          {nextTracks.length > 0 ? (
            <ul>
              {nextTracks.map((track) => (
                <li key={track.round}>
                  Round {track.round} - {track.event_name} ({track.location}, {track.country}):{' '}
                  {(track.probability * 100).toFixed(1)}%
                </li>
              ))}
            </ul>
          ) : (
            <p>Run a simulation to view the probability model for the next track set.</p>
          )}
        </section>

        <section className="list-section">
          <h2>Top Predicted Results (Weighted)</h2>
          {result ? (
            <div className="item-card">
              <p>Simulation ID: {result.simulation_id}</p>
              <p>Model Version: {result.model_version}</p>

              <h4>Top 10 Drivers</h4>
              <ul>
                {result.top_results.map((driver, idx) => (
                  <li key={driver.driver_number}>
                    P{idx + 1} - {driver.driver_name} ({driver.team_name}) | Predicted:{' '}
                    {formatSeconds(driver.expected_predicted_finish_time_s)} | Delta:{' '}
                    {driver.expected_delta_s >= 0 ? '+' : ''}
                    {driver.expected_delta_s.toFixed(3)}s | Est Rank:{' '}
                    {driver.expected_rank_estimate.toFixed(1)} | Pit Risk:{' '}
                    {(driver.expected_pit_error_risk * 100).toFixed(1)}%
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p>Run your first simulation to see weighted race outcome predictions.</p>
          )}
        </section>
      </main>
    </div>
  )
}

export default App
