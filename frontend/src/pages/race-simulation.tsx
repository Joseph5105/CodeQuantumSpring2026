import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import type { DriverSimulationResult, SimulationResponse } from '../services/api';
import '../styles/race-simulation.css';

type RaceSimulationLocationState = {
  simulationResult?: SimulationResponse;
  selectedDriverNumber?: string;
};

type LapPoint = {
  lap: number;
  lapTime: number;
  cumulativeTime: number;
};

type PitIncidentEvent = {
  lap: number;
  addedSeconds: number;
  roll: number;
};

type PitIncidentSeries = {
  events: PitIncidentEvent[];
  riskProbability: number;
  perLapChance: number;
};

const PIT_FAILURE_DQ_THRESHOLD = 3;

const SPEED_OPTIONS = [1, 2, 4];

const getLapCount = (totalFinishTime: number): number => {
  return Math.min(72, Math.max(45, Math.round(totalFinishTime / 90)));
};

const seededUnit = (seedInput: string): number => {
  let hash = 2166136261;
  for (let i = 0; i < seedInput.length; i += 1) {
    hash ^= seedInput.charCodeAt(i);
    hash +=
      (hash << 1) +
      (hash << 4) +
      (hash << 7) +
      (hash << 8) +
      (hash << 24);
  }
  return (hash >>> 0) / 4294967295;
};

const derivePitIncidents = (
  driver: DriverSimulationResult,
  simulationId: number,
  lapCount: number
): PitIncidentSeries => {
  const riskProbability = Math.max(0, driver.expected_risk_event_probability);
  // Keep incidents bounded but allow much higher pit-failure frequency when risk spikes.
  const perLapChance = Math.min(.03, riskProbability * 1.25 + 0.02);
  const baseSeed = `${simulationId}:${driver.driver_number}:${driver.expected_predicted_finish_time_s.toFixed(3)}`;
  const baselineRiskPenalty = Math.max(1.8, driver.expected_risk_time_penalty_s);
  const events: PitIncidentEvent[] = [];

  for (let lap = 4; lap < lapCount; lap += 1) {
    const roll = seededUnit(`${baseSeed}:lap-trigger:${lap}`);
    if (roll >= perLapChance) {
      continue;
    }

    const penaltyRoll = seededUnit(`${baseSeed}:lap-penalty:${lap}`);
    const addedSeconds = Number(
      (baselineRiskPenalty * (0.35 + penaltyRoll * 1.05)).toFixed(3)
    );

    events.push({
      lap,
      addedSeconds,
      roll,
    });
  }

  return {
    events,
    riskProbability,
    perLapChance,
  };
};

const buildLapTimeline = (driver: DriverSimulationResult, pitIncidents: PitIncidentSeries): LapPoint[] => {
  const modeledBaseFinish = Math.max(
    1,
    driver.expected_predicted_finish_time_s - Math.max(0, driver.expected_risk_time_penalty_s)
  );
  const totalPitDelay = pitIncidents.events.reduce((sum, event) => sum + event.addedSeconds, 0);
  const totalFinishTime =
    modeledBaseFinish + totalPitDelay;
  const lapCount = getLapCount(totalFinishTime);
  const baseLapTime = totalFinishTime / lapCount;
  const confidencePenalty = (1 - driver.confidence) * 0.65;
  const delayByLap = new Map<number, number>();

  for (const event of pitIncidents.events) {
    delayByLap.set(event.lap, (delayByLap.get(event.lap) ?? 0) + event.addedSeconds);
  }

  const lapTimes: number[] = [];
  for (let i = 0; i < lapCount; i += 1) {
    const wave = Math.sin((i / lapCount) * Math.PI * 2) * 0.35;
    const fatigue = i > lapCount * 0.82 ? 0.14 : 0;
    let lapTime = baseLapTime + wave + confidencePenalty + fatigue;
    lapTime += delayByLap.get(i + 1) ?? 0;
    lapTimes.push(Math.max(50, lapTime));
  }

  let cumulative = 0;
  return lapTimes.map((lapTime, index) => {
    cumulative += lapTime;
    return {
      lap: index + 1,
      lapTime,
      cumulativeTime: cumulative,
    };
  });
};

const formatTime = (seconds: number): string => {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes}:${remainingSeconds.toFixed(3).padStart(6, '0')}`;
};

const RaceSimulationPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const navigationState = (location.state ?? null) as RaceSimulationLocationState | null;

  const simulationResult = navigationState?.simulationResult;
  const selectedDriverNumber =
    navigationState?.selectedDriverNumber ?? simulationResult?.selected_driver_number ?? null;

  const selectedDriver = useMemo(() => {
    if (!simulationResult || !selectedDriverNumber) {
      return null;
    }

    return (
      simulationResult.top_results.find(
        (driver) => driver.driver_number === selectedDriverNumber
      ) ?? simulationResult.top_results.find((driver) => driver.is_selected_driver) ?? null
    );
  }, [simulationResult, selectedDriverNumber]);

  const pitIncidents = useMemo(() => {
    if (!selectedDriver || !simulationResult) {
      return null;
    }
    const estimatedLapCount = getLapCount(selectedDriver.expected_predicted_finish_time_s);
    return derivePitIncidents(selectedDriver, simulationResult.simulation_id, estimatedLapCount);
  }, [selectedDriver, simulationResult]);

  const lapTimeline = useMemo(() => {
    if (!selectedDriver || !pitIncidents) {
      return [];
    }
    return buildLapTimeline(selectedDriver, pitIncidents);
  }, [selectedDriver, pitIncidents]);

  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [lapIndex, setLapIndex] = useState(0);

  const pitEvents = pitIncidents?.events ?? [];
  const disqualifiedEvent =
    pitEvents.length > PIT_FAILURE_DQ_THRESHOLD
      ? pitEvents[PIT_FAILURE_DQ_THRESHOLD]
      : null;
  const disqualifiedLap = disqualifiedEvent?.lap ?? null;

  useEffect(() => {
    if (!isPlaying || lapTimeline.length === 0) {
      return;
    }

    const intervalMs = Math.max(140, Math.round(900 / speed));
    const timer = window.setInterval(() => {
      setLapIndex((current) => {
        const maxPlayableIndex =
          disqualifiedLap !== null
            ? Math.min(disqualifiedLap - 1, lapTimeline.length - 1)
            : lapTimeline.length - 1;

        if (current >= maxPlayableIndex) {
          setIsPlaying(false);
          return current;
        }

        if (current >= lapTimeline.length - 1) {
          setIsPlaying(false);
          return current;
        }

        const next = current + 1;
        if (next >= maxPlayableIndex || next >= lapTimeline.length - 1) {
          setIsPlaying(false);
        }
        return next;
      });
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [disqualifiedLap, isPlaying, speed, lapTimeline.length]);

  const currentLap = lapTimeline[lapIndex] ?? null;
  const totalLaps = lapTimeline.length;
  const completedLaps = totalLaps > 0 ? lapIndex + 1 : 0;
  const progressPercent = totalLaps > 0 ? (completedLaps / totalLaps) * 100 : 0;
  const currentLapNumber = currentLap?.lap ?? 0;

  const raceTerminatedByDq = disqualifiedLap !== null && completedLaps >= disqualifiedLap;
  const currentLapIncident = pitEvents.find((event) => event.lap === currentLapNumber) ?? null;
  const occurredPitEvents = pitEvents.filter((event) => event.lap <= completedLaps);
  const totalPitDelayApplied = occurredPitEvents.reduce(
    (sum, event) => sum + event.addedSeconds,
    0
  );

  const pitIncidentActive = currentLapIncident !== null;

  const raceDataMissing = !simulationResult || !selectedDriverNumber || !selectedDriver;

  if (raceDataMissing) {
    return (
      <div className="race-root">
        <Navbar remainingBudget={0} onLogoClick={() => navigate('/')} />
        <main className="race-empty-shell">
          <section className="race-empty-card">
            <h1 className="race-empty-title">Race Simulation Unavailable</h1>
            <p className="race-empty-copy">
              We need a completed Design Studio run with a selected driver before race playback can start.
            </p>
            <button className="race-cta" onClick={() => navigate('/studio')}>
              Return To Design Studio
            </button>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="race-root">
      <Navbar
        remainingBudget={simulationResult.remaining_budget ?? 0}
        onLogoClick={() => navigate('/')}
      />

      <main className="race-main">
        <section className="race-header-panel">
          <div>
            <p className="race-kicker">Race Simulation</p>
            <h1 className="race-title">{selectedDriver.driver_name}</h1>
            <p className="race-subtitle">
              {selectedDriver.team_name} · Driver #{selectedDriver.driver_number}
            </p>
          </div>
          <div className="race-actions">
            <button className="race-ghost-btn" onClick={() => navigate('/studio')}>
              Back To Studio
            </button>
          </div>
        </section>

        <section className="race-grid">
          <article className="race-playback-card">
            <header className="race-card-header">
              <h2>Lap Playback</h2>
              <p>{completedLaps}/{totalLaps} Laps</p>
            </header>

            <div className="race-progress-track">
              <div className="race-progress-fill" style={{ width: `${progressPercent}%` }} />
            </div>

            {occurredPitEvents.length > 0 && (
              <div className="pit-log-wrap">
                <div className="pit-log-title">Pit Failure Log</div>
                <div className="pit-log-list">
                  {occurredPitEvents
                    .slice()
                    .reverse()
                    .map((event, index) => (
                      <div
                        key={`${event.lap}-${event.roll}-${index}`}
                        className={`pit-log-item ${pitIncidentActive && currentLapIncident?.lap === event.lap ? 'live' : ''}`}
                      >
                        <span className="pit-log-lap">Lap {event.lap}</span>
                        <span className="pit-log-delta">+{event.addedSeconds.toFixed(3)}s</span>
                        <span className="pit-log-roll">roll {(event.roll * 100).toFixed(2)}%</span>
                      </div>
                    ))}
                </div>
                {raceTerminatedByDq && disqualifiedLap !== null && (
                  <div className="pit-log-dq">Disqualified at lap {disqualifiedLap} after 4th pit failure.</div>
                )}
              </div>
            )}

            <div className="race-live-strip">
              <div>
                <span className="strip-label">Current Lap</span>
                <strong className="strip-value">{currentLap?.lap ?? 0}</strong>
              </div>
              <div>
                <span className="strip-label">Lap Time</span>
                <strong className={`strip-value ${pitIncidentActive ? 'warn' : ''}`}>
                  {currentLap ? `${currentLap.lapTime.toFixed(3)}s` : '--'}
                </strong>
              </div>
              <div>
                <span className="strip-label">Cumulative</span>
                <strong className="strip-value">{currentLap ? formatTime(currentLap.cumulativeTime) : '--'}</strong>
              </div>
            </div>

            <div className="race-controls">
              <button className="race-control-btn" onClick={() => setIsPlaying((v) => !v)}>
                {isPlaying ? 'Pause' : 'Play'}
              </button>
              <button
                className="race-control-btn"
                onClick={() => {
                  setLapIndex(0);
                  setIsPlaying(false);
                }}
              >
                Reset
              </button>

              <div className="race-speed-group" role="group" aria-label="Playback speed">
                {SPEED_OPTIONS.map((option) => (
                  <button
                    key={option}
                    className={`race-speed-btn ${speed === option ? 'active' : ''}`}
                    onClick={() => setSpeed(option)}
                  >
                    {option}x
                  </button>
                ))}
              </div>
            </div>
          </article>

          <aside className="race-telemetry-card">
            <h2>Driver Telemetry</h2>
            <div className="telemetry-list">
              <div className="telemetry-item">
                <span>Predicted Finish</span>
                <strong>
                  {raceTerminatedByDq
                    ? 'DISQUALIFIED'
                    : formatTime(selectedDriver.expected_predicted_finish_time_s)}
                </strong>
              </div>
              <div className="telemetry-item">
                <span>Performance Delta</span>
                <strong className={selectedDriver.expected_delta_s <= 0 ? 'good' : 'warn'}>
                  {selectedDriver.expected_delta_s.toFixed(3)}s
                </strong>
              </div>
              <div className="telemetry-item">
                <span>Estimated Rank</span>
                <strong>{raceTerminatedByDq ? 'DQ' : `P${selectedDriver.expected_rank_estimate.toFixed(1)}`}</strong>
              </div>
              <div className="telemetry-item">
                <span>Pit Error Risk</span>
                <strong>{(selectedDriver.expected_risk_event_probability * 100).toFixed(1)}%</strong>
              </div>
              <div className="telemetry-item">
                <span>Pit Failure Chance</span>
                <strong>
                  {pitIncidents
                    ? `${(pitIncidents.perLapChance * 100).toFixed(2)}% per lap`
                    : '--'}
                </strong>
              </div>
              <div className="telemetry-item">
                <span>Pit Failures Triggered</span>
                <strong>
                  {occurredPitEvents.length}
                </strong>
              </div>
              <div className="telemetry-item">
                <span>Risk Time Penalty</span>
                <strong>
                  +{totalPitDelayApplied.toFixed(3)}s
                </strong>
              </div>
              <div className="telemetry-item">
                <span>Confidence</span>
                <strong>{(selectedDriver.confidence * 100).toFixed(1)}%</strong>
              </div>
            </div>
            
            <button 
              className="race-control-btn" 
              style={{ marginTop: '1.5rem', width: '100%', padding: '12px', background: 'rgba(220, 38, 38, 0.15)', borderColor: 'rgba(220, 38, 38, 0.4)' }}
              onClick={() => navigate('/results', { state: { simulationResult, selectedDriverNumber } })}
            >
              View Detailed Report
            </button>

          </aside>
        </section>
      </main>
    </div>
  );
};

export default RaceSimulationPage;
