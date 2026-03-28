import { useState, type CSSProperties } from 'react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ComponentSliders from '../components/ComponentSliders';
import Navbar from '../components/Navbar';
import { mockQualities, getMockRemainingBudget, mockComponents } from '../store/mockComponentData';
import {
  type BudgetConfig,
  type BudgetExceededDetail,
  type DriverMeta,
  type SimulationResponse,
  simulationService,
} from '../services/api';
import '../styles/design-studio.css';

// ── Inline CarSVG with animatable refs ──
const CarSVG = ({
  width = '100%',
  spinWheels = false,
  spinSpeed = 0.8,
}: {
  width?: string | number;
  spinWheels?: boolean;
  spinSpeed?: number;
}) => {
  const wheelStyle: CSSProperties = spinWheels
    ? {
      animation: `wheelSpin ${spinSpeed}s linear infinite`,
      transformBox: 'fill-box',
      transformOrigin: 'center',
    }
    : {};

  return (
    <svg
      viewBox="0 0 1000 400"
      style={{ width, filter: 'drop-shadow(0 30px 60px rgba(220,38,38,0.25))' }}
    >
      <path d="M150 280 L850 280 L870 260 L130 260 Z" fill="#2a2d30" />
      <path d="M220 260 L350 180 L550 170 L750 210 L820 260 H220 Z" fill="#CC0000" />
      <path d="M380 260 L420 190 L550 185 L600 260 Z" fill="#e8ecf0" />
      <path d="M220 260 L100 270 L80 250 L200 220 Z" fill="#CC0000" />
      <path d="M80 250 L100 270 L60 270 L60 255 Z" fill="#1c1f22" />
      <path d="M480 175 Q520 130 580 175" fill="none" stroke="#1c1f22" strokeWidth="8" />
      <ellipse cx="530" cy="180" rx="40" ry="15" fill="#1c1f22" />
      <path d="M800 240 L850 240 L860 140 L780 145 Z" fill="#2a2d30" />
      <rect x="770" y="140" width="100" height="15" fill="#CC0000" />

      {/* Front wheel */}
      <g style={wheelStyle}>
        <circle cx="260" cy="270" r="45" fill="#1a1d20" stroke="#3a3d40" strokeWidth="3" />
        <circle cx="260" cy="270" r="30" fill="none" stroke="#2a2d30" strokeWidth="8" />
        <circle cx="260" cy="270" r="14" fill="#2a2d30" stroke="#555" strokeWidth="1" />
        <line x1="260" y1="242" x2="260" y2="298" stroke="#555" strokeWidth="2" />
        <line x1="232" y1="270" x2="288" y2="270" stroke="#555" strokeWidth="2" />
        <line x1="240" y1="250" x2="280" y2="290" stroke="#555" strokeWidth="1.5" />
        <line x1="240" y1="290" x2="280" y2="250" stroke="#555" strokeWidth="1.5" />
      </g>

      {/* Rear wheel */}
      <g style={wheelStyle}>
        <circle cx="720" cy="270" r="52" fill="#1a1d20" stroke="#3a3d40" strokeWidth="3" />
        <circle cx="720" cy="270" r="35" fill="none" stroke="#2a2d30" strokeWidth="10" />
        <circle cx="720" cy="270" r="16" fill="#2a2d30" stroke="#555" strokeWidth="1" />
        <line x1="720" y1="236" x2="720" y2="304" stroke="#555" strokeWidth="2.5" />
        <line x1="686" y1="270" x2="754" y2="270" stroke="#555" strokeWidth="2.5" />
        <line x1="696" y1="246" x2="744" y2="294" stroke="#555" strokeWidth="2" />
        <line x1="696" y1="294" x2="744" y2="246" stroke="#555" strokeWidth="2" />
      </g>

      <path d="M40 275 H180 V255 L40 260 Z" fill="#2a2d30" />
      <rect x="40" y="260" width="140" height="4" fill="#CC0000" />
    </svg>
  );
};

// Removed 'engine' from HoverEffect
type HoverEffect = 'none' | 'aero' | 'suspension' | 'transmission';

const StudioPage = () => {
  const navigate = useNavigate();
  const [qualities, setQualities] = useState(mockQualities);
  const [hoverEffect, setHoverEffect] = useState<HoverEffect>('none');
  const [budgetConfig, setBudgetConfig] = useState<BudgetConfig | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [drivers, setDrivers] = useState<DriverMeta[]>([]);
  const [selectedDriverNumber, setSelectedDriverNumber] = useState('');
  const [driverLoadError, setDriverLoadError] = useState<string | null>(null);
  const [driverSelectionError, setDriverSelectionError] = useState<string | null>(null);
  const [budgetError, setBudgetError] = useState<BudgetExceededDetail | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const sliderToBackendKey: Record<string, string> = {
    engine: 'engine',
    aerodynamics: 'aero',
    suspension: 'suspension',
    transmission: 'transmission',
    pitCrew: 'pitcrew',
  };

  const payloadSliders = {
    engine: qualities.engine,
    aero: qualities.aerodynamics,
    suspension: qualities.suspension,
    transmission: qualities.transmission,
    pitcrew: qualities.pitCrew,
  };

  const livePackageCosts = (() => {
    if (!budgetConfig) {
      return Object.fromEntries(
        Object.entries(qualities).map(([key, value]) => [key, value * (mockComponents[key]?.costPerPoint ?? 0)])
      );
    }
    return Object.fromEntries(
      Object.entries(qualities).map(([key, value]) => {
        const backendKey = sliderToBackendKey[key];
        const maxCost = budgetConfig.package_max_costs[backendKey] ?? 0;
        const ratio = Math.max(0, Math.min(1, value / 100));
        return [key, maxCost * ratio ** budgetConfig.package_cost_gamma];
      })
    );
  })();

  const liveTotalCost = Object.values(livePackageCosts).reduce((sum, value) => sum + value, 0);
  const remainingBudget = budgetConfig
    ? budgetConfig.budget_cap - liveTotalCost
    : getMockRemainingBudget(qualities);

  useEffect(() => {
    const loadBudgetConfig = async () => {
      try {
        const config = await simulationService.getBudgetConfig();
        setBudgetConfig(config);
      } catch {
        setBudgetConfig(null);
      }
    };
    void loadBudgetConfig();
  }, []);

  useEffect(() => {
    const loadDrivers = async () => {
      setDriverLoadError(null);
      try {
        const fetchedDrivers = await simulationService.getDrivers();
        const sorted = [...fetchedDrivers].sort((a, b) => {
          const byTeam = a.team_name.localeCompare(b.team_name);
          if (byTeam !== 0) {
            return byTeam;
          }
          return a.driver_name.localeCompare(b.driver_name);
        });
        setDrivers(sorted);
      } catch {
        setDriverLoadError('Unable to load driver list. Please check backend connection.');
      }
    };
    void loadDrivers();
  }, []);

  const handleSliderChange = (key: string, value: string) => {
    const val = parseInt(value);
    const oldValue = qualities[key];

    if (val <= oldValue) {
      setQualities(prev => ({ ...prev, [key]: val }));
      return;
    }

    const costIncrease = (val - oldValue) * mockComponents[key].costPerPoint;

    if (costIncrease <= remainingBudget) {
      setQualities(prev => ({ ...prev, [key]: val }));
    } else {
      const extra = Math.floor(remainingBudget / mockComponents[key].costPerPoint);
      setQualities(prev => ({ ...prev, [key]: oldValue + extra }));
    }
  };

  const handleRunSimulation = () => {
    if (!selectedDriverNumber) {
      setDriverSelectionError('Choose your driver before running simulation.');
      return;
    }

    const run = async () => {
      setIsRunning(true);
      setDriverSelectionError(null);
      setBudgetError(null);
      setErrorMessage(null);
      try {
        const response: SimulationResponse = await simulationService.simulate({
          sliders: payloadSliders,
          selected_driver_number: selectedDriverNumber,
        });
        navigate('/race-simulation', {
          state: {
            simulationResult: response,
            selectedDriverNumber,
          },
        });
      } catch (error) {
        const detail = (error as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
        if (
          typeof detail === 'object' &&
          detail !== null &&
          (detail as { error?: string }).error === 'BUDGET_EXCEEDED'
        ) {
          setBudgetError(detail as BudgetExceededDetail);
        } else {
          setErrorMessage('Simulation failed. Check backend logs for details.');
        }
      } finally {
        setIsRunning(false);
      }
    };
    void run();
  };

  // Suspension bounce — height and speed scale with quality
  const bounceHeight = Math.max(2, Math.round(qualities.suspension * 0.12));
  const bounceDuration = Math.max(0.25, 0.8 - qualities.suspension * 0.005);

  // Transmission spin speed — faster = higher quality
  const spinSpeed = Math.max(0.08, 1.0 - qualities.transmission * 0.009);

  // Aero wind streams — more streams at higher quality
  const windStreamCount = Math.max(3, Math.round(qualities.aerodynamics * 0.1));

  // Engine now does nothing
  const effectMap: Record<string, HoverEffect> = {
    aerodynamics: 'aero',
    engine: 'none',
    suspension: 'suspension',
    transmission: 'transmission',
    pitCrew: 'none',
  };

  return (
    <div className="studio-root">
      <Navbar remainingBudget={remainingBudget} onLogoClick={() => navigate('/')} />

      <div className="studio-body">
        {/* ── CAR SHOWCASE ── */}
        <div className="car-showcase">
          <div className="car-label">Live Render · CAR_MODEL_v2.4</div>

          {/* Aero wind streams */}
          <div className={`wind-streams ${hoverEffect === 'aero' ? 'active' : ''}`}>
            {[...Array(windStreamCount)].map((_, i) => (
              <div
                key={i}
                className="wind-stream"
                style={{
                  top: `${18 + i * (60 / windStreamCount)}%`,
                  animationDuration: `${0.5 + i * 0.06}s`,
                  animationDelay: `${i * 0.07}s`,
                  height: i % 3 === 0 ? '2px' : '1px',
                  opacity: 0.4 + (i % 3) * 0.2,
                }}
              />
            ))}
          </div>

          {/* Car wrapper — handles bounce */}
          <div
            className={`car-wrapper ${hoverEffect === 'suspension' ? 'bouncing' : ''}`}
            style={
              {
                '--bounce-height': `-${bounceHeight}px`,
                '--bounce-duration': `${bounceDuration}s`,
              } as CSSProperties
            }
          >
            <CarSVG
              width="100%"
              spinWheels={hoverEffect === 'transmission'}
              spinSpeed={spinSpeed}
            />
          </div>

          <div className="car-glow" />

          <div className="car-stats-overlay">
            <div className="car-stat">
              chassis · <span>TLD-2026-A</span>
            </div>
            <div className="car-stat">
              config · <span>QUALIFYING</span>
            </div>
            <div className="car-stat">
              fuel load · <span>105 KG</span>
            </div>
          </div>
        </div>

        {/* ── CONTROL PANEL ── */}
        <div className="control-panel">
          {/* Telemetry strip */}
          <div className="telem-strip">
            {[
              { label: 'Power Unit', value: `${qualities.engine}%` },
              { label: 'Aero', value: `${qualities.aerodynamics}%` },
              { label: 'Suspension', value: `${qualities.suspension}%` },
              { label: 'Transmission', value: `${qualities.transmission}%` },
              { label: 'Pit Crew', value: `${qualities.pitCrew}%` },
            ].map(({ label, value }) => (
              <div key={label} className="telem-cell">
                <span className="telem-label">{label}</span>
                <span className="telem-value red">{value}</span>
              </div>
            ))}
          </div>


          {/* Controls row — sliders full width + run button */}
          <div className="controls-row">
            {/* Sliders */}
            <div className="sliders-block">
              <div className="panel-section-label">Component Allocation</div>
              <ComponentSliders
                qualities={qualities}
                onSliderChange={handleSliderChange}
                onHoverKey={key => setHoverEffect(effectMap[key] ?? 'none')}
                onHoverEnd={() => setHoverEffect('none')}
              />
            </div>

            {/* Run */}
            <div className="run-block">
              <div className="panel-section-label">Simulate</div>

              <div className="driver-select-block">
                <label className="driver-select-label" htmlFor="selected-driver">
                  Driver Focus
                </label>
                <select
                  id="selected-driver"
                  className="driver-select"
                  value={selectedDriverNumber}
                  onChange={(event) => {
                    setSelectedDriverNumber(event.target.value);
                    if (event.target.value) {
                      setDriverSelectionError(null);
                    }
                  }}
                >
                  <option value="">Select a driver</option>
                  {drivers.map((driver) => (
                    <option key={driver.driver_number} value={driver.driver_number}>
                      {driver.driver_name} · {driver.team_name} · #{driver.driver_number}
                    </option>
                  ))}
                </select>
              </div>

              <button
                className="run-btn"
                onClick={handleRunSimulation}
                disabled={isRunning || !selectedDriverNumber || drivers.length === 0}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
                {isRunning ? 'Running Simulation...' : 'Run Simulation'}
              </button>
              <div className="run-btn-sub">SIM_ENGINE · READY · v4.1.0</div>

              {driverLoadError && (
                <div style={{ marginTop: '0.8rem', color: '#fca5a5', fontSize: '0.85rem' }}>
                  {driverLoadError}
                </div>
              )}

              {driverSelectionError && (
                <div style={{ marginTop: '0.8rem', color: '#fca5a5', fontSize: '0.85rem' }}>
                  {driverSelectionError}
                </div>
              )}

              {budgetError && (
                <div style={{ marginTop: '0.8rem', color: '#fca5a5', fontSize: '0.85rem' }}>
                  Budget exceeded by ${Math.round(budgetError.over_budget_by).toLocaleString()}
                </div>
              )}

              {errorMessage && (
                <div style={{ marginTop: '0.8rem', color: '#fca5a5', fontSize: '0.85rem' }}>
                  {errorMessage}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudioPage;