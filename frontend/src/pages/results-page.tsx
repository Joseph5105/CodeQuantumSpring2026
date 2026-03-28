import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, Trophy, RotateCcw, AlertTriangle, Users, Play } from 'lucide-react';
import { useMemo } from 'react';
import type { RaceReportMetrics, SimulationResponse } from '../services/api';

type ResultsLocationState = {
  simulationResult?: SimulationResponse;
  selectedDriverNumber?: string;
    reportMetrics?: RaceReportMetrics | null;
};

const formatTime = (seconds: number): string => {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes}:${remainingSeconds.toFixed(3).padStart(6, '0')}`;
};

const getLapCount = (totalFinishTime: number): number => {
    return Math.min(72, Math.max(45, Math.round(totalFinishTime / 90)));
};

export default function ResultsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as ResultsLocationState | null;

  const simulationResult = state?.simulationResult;
  const selectedDriverNumber = state?.selectedDriverNumber || simulationResult?.selected_driver_number;
    const passedReportMetrics = state?.reportMetrics ?? null;

  const selectedDriver = useMemo(() => {
    if (!simulationResult || !selectedDriverNumber) return null;
    return simulationResult.top_results.find(d => d.driver_number === selectedDriverNumber) || null;
  }, [simulationResult, selectedDriverNumber]);

  if (!simulationResult || !selectedDriver) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-10 font-sans">
         <h1 className="text-3xl font-black mb-4">No Simulation Data</h1>
         <button onClick={() => navigate('/studio')} className="px-6 py-3 bg-red-600 font-bold uppercase">Return to Studio</button>
      </div>
    );
  }

  const lapCount = getLapCount(selectedDriver.expected_predicted_finish_time_s);
  const backendReportMetrics = simulationResult.selected_driver_playback?.report_metrics ?? null;
  const reportMetrics = passedReportMetrics ?? backendReportMetrics;

  const avgLapTime = reportMetrics?.avg_lap_time_s ?? (selectedDriver.expected_predicted_finish_time_s / lapCount);
  const totalRaceTime = reportMetrics?.total_race_time_s ?? selectedDriver.expected_predicted_finish_time_s;
  const totalPitTime = reportMetrics?.total_pit_time_s ?? selectedDriver.expected_risk_time_penalty_s;
  const topSpeed = reportMetrics?.top_speed_kph ?? null;
  const zeroToSixty = reportMetrics?.zero_to_sixty_s ?? null;
  const fakePlacementRanking = reportMetrics?.fake_placement_ranking ?? `P${selectedDriver.expected_rank_estimate.toFixed(1)}`;

  const parsedRank = Number(fakePlacementRanking.replace(/^P/i, ''));
  const effectiveRank = Number.isFinite(parsedRank) ? parsedRank : selectedDriver.expected_rank_estimate;

  const rank = effectiveRank;
  const isPodium = rank <= 3.5;
  const isTop10 = rank <= 10.5;
  
  let rankLabel = 'OUT OF POINTS';
  let rankColor = 'bg-stone-800 text-white';
  if (isPodium) {
    rankLabel = 'PODIUM CONTENDER';
    rankColor = 'bg-yellow-500 text-black';
  } else if (isTop10) {
    rankLabel = 'POINTS FINISHER';
    rankColor = 'bg-red-600 text-white';
  }

  const top3 = [...simulationResult.top_results]
    .sort((a, b) => a.expected_predicted_finish_time_s - b.expected_predicted_finish_time_s)
    .slice(0, 3);

  return (
        <div className="min-h-screen bg-[#050505] text-white flex flex-col p-10 font-sans">
            <div className="max-w-4xl mx-auto w-full flex-grow flex flex-col">
                <div className="flex justify-between items-end mb-12 border-b border-white/10 pb-8">
                    <div>
                        <div className="flex items-center gap-2 text-red-600 mb-2">
                            <CheckCircle2 size={18} />
                            <span className="text-xs font-black tracking-widest uppercase">
                                Simulation Complete
                            </span>
                        </div>
                        <h1 className="text-6xl font-black italic tracking-tighter uppercase">
                            Race Report
                        </h1>
                        <p className="text-slate-400 mt-2 font-mono uppercase tracking-widest text-sm">
                            {selectedDriver.driver_name} · {selectedDriver.team_name}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-slate-500 text-[10px] uppercase tracking-widest font-black mb-1">
                            Average Lap Time
                        </p>
                        <p className="text-5xl font-mono font-black text-red-600 tracking-tighter">
                            {formatTime(avgLapTime)}
                        </p>
                        <p className="text-slate-500 mt-2 text-xs font-mono">
                            Total Time: {formatTime(totalRaceTime)}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
                    <div className="bg-white/5 border border-white/10 p-4">
                        <p className="text-[10px] uppercase tracking-widest text-slate-500">Top Speed</p>
                        <p className="text-2xl font-mono font-black text-red-500">{topSpeed !== null ? `${topSpeed.toFixed(1)} km/h` : '--'}</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 p-4">
                        <p className="text-[10px] uppercase tracking-widest text-slate-500">0-60 Acceleration</p>
                        <p className="text-2xl font-mono font-black">{zeroToSixty !== null ? `${zeroToSixty.toFixed(3)}s` : '--'}</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 p-4">
                        <p className="text-[10px] uppercase tracking-widest text-slate-500">Total Pit Time</p>
                        <p className="text-2xl font-mono font-black">{totalPitTime.toFixed(3)}s</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 p-4">
                        <p className="text-[10px] uppercase tracking-widest text-slate-500">Total Race Time</p>
                        <p className="text-2xl font-mono font-black">{formatTime(totalRaceTime)}</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 p-4">
                        <p className="text-[10px] uppercase tracking-widest text-slate-500">Average Lap Time</p>
                        <p className="text-2xl font-mono font-black">{formatTime(avgLapTime)}</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 p-4">
                        <p className="text-[10px] uppercase tracking-widest text-slate-500">Fake Placement Ranking</p>
                        <p className="text-2xl font-black italic">{fakePlacementRanking}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                    <div className="bg-white/5 border border-white/10 p-8 flex flex-col">
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                            <Trophy size={16} className="text-yellow-500" /> Race Podium
                        </h3>
                        <div className="space-y-4 flex-grow">
                            {top3.map((d, i) => (
                                <div key={d.driver_number} className={`flex justify-between items-center p-3 border-l-4 ${d.driver_number === selectedDriverNumber ? 'border-red-600 bg-red-600/10' : 'border-white/20 bg-black/40'}`}>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl font-black italic text-slate-600">P{i + 1}</span>
                                        <span className="font-bold uppercase tracking-wider text-sm">{d.driver_name}</span>
                                    </div>
                                    <span className="font-mono text-sm">{formatTime(d.expected_predicted_finish_time_s)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col gap-6">
                        <div className="bg-white/5 border border-white/10 p-6 flex-grow">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 flex gap-2 items-center">
                                <AlertTriangle size={14} /> Engineer's Verdict
                            </p>
                            <p className="text-lg leading-relaxed italic text-slate-300">
                                "
                                {selectedDriver.expected_delta_s < 0 
                                    ? `We found some great pace today! Running ${Math.abs(selectedDriver.expected_delta_s).toFixed(2)}s faster than expected.` 
                                    : `We struggled out there. Dropped ${selectedDriver.expected_delta_s.toFixed(2)}s due to setup tradeoffs or pit issues.`}
                                {selectedDriver.expected_pit_error_risk > 0.05 && ' Pit stops were a high risk area today.'}
                                "
                            </p>
                            <div className="mt-6 pt-4 border-t border-white/10 grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">Est. Rank</p>
                                    <p className="text-xl font-mono font-bold">{fakePlacementRanking}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">Perf Delta</p>
                                    <p className={`text-xl font-mono font-bold ${selectedDriver.expected_delta_s < 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        {selectedDriver.expected_delta_s > 0 ? '+' : ''}{selectedDriver.expected_delta_s.toFixed(3)}s
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className={`${rankColor} p-6 flex items-center justify-between transition-colors duration-500`}>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-60">
                                    Final Classification
                                </p>
                                <p className="text-2xl font-black italic">{rankLabel}</p>
                            </div>
                            <Users size={32} />
                        </div>
                    </div>
                </div>

                <div className="mt-auto flex justify-center gap-4">
                    <button
                        onClick={() => navigate('/studio')}
                        className="flex items-center gap-3 px-8 py-4 bg-white text-black font-black uppercase italic hover:bg-red-600 hover:text-white transition-all transform hover:-translate-y-1"
                    >
                        <RotateCcw size={20} /> Back to Studio
                    </button>
                    <button
                        onClick={() => navigate('/race-simulation', { state })}
                        className="flex items-center gap-3 px-8 py-4 bg-transparent border border-white/20 text-white font-black uppercase italic hover:bg-white/10 transition-all transform hover:-translate-y-1"
                    >
                        <Play size={20} /> View Playback
                    </button>
                </div>
            </div>
        </div>
  );
}
