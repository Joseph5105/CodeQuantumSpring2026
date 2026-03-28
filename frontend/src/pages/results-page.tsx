import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, Activity, Trophy, RotateCcw } from 'lucide-react';
import { mockQualities } from '../store/mockComponentData';

type ResultsViewProps = {
    qualities: {
        engine: number;
        aerodynamics: number;
        suspension: number;
        transmission: number;
        pitCrew: number;
    };
    onReturnToStudio: () => void;
};

type MetricBarProps = {
    label: string;
    value: number;
    color: string;
};

const MetricBar = ({ label, value, color }: MetricBarProps) => (
    <div className="space-y-2">
        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
            <span className="text-slate-500">{label}</span>
            <span>{Math.min(100, Number(value.toFixed(0)))}%</span>
        </div>
        <div className="h-1 w-full bg-white/5">
            <div
                className={`h-full transition-all duration-1000 ${color}`}
                style={{ width: `${Math.min(100, value)}%` }}
            />
        </div>
    </div>
);

const ResultsView = ({ qualities, onReturnToStudio }: ResultsViewProps) => {
    const lapTime = (
        105 -
        qualities.engine * 0.15 -
        qualities.aerodynamics * 0.12 -
        qualities.suspension * 0.05
    ).toFixed(3);

    const isChampion = qualities.engine > 70 && qualities.aerodynamics > 70;
    const isIndustryReady = qualities.engine > 40 && qualities.aerodynamics > 40;

    let rankLabel = 'PROTOTYPE PHASE A';
    let rankColor = 'bg-red-600';

    if (isChampion) {
        rankLabel = 'PISTON CUP CHAMPION';
        rankColor = 'bg-green-400';
    } else if (isIndustryReady) {
        rankLabel = 'INDUSTRY READY';
        rankColor = 'bg-yellow-500';
    }

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
                    </div>
                    <div className="text-right">
                        <p className="text-slate-500 text-[10px] uppercase tracking-widest font-black mb-1">
                            Average Lap Time
                        </p>
                        <p className="text-5xl font-mono font-black text-red-600 tracking-tighter">
                            1:{lapTime}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                    <div className="bg-white/5 border border-white/10 p-8">
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                            <Activity size={16} className="text-red-600" /> Performance Analysis
                        </h3>
                        <div className="space-y-6">
                            <MetricBar
                                label="Top Speed"
                                value={qualities.engine + qualities.transmission * 0.5}
                                color="bg-red-600"
                            />
                            <MetricBar
                                label="0 -> 60 Acceleration Time"
                                value={qualities.aerodynamics + qualities.suspension * 0.4}
                                color="bg-white"
                            />
                            <MetricBar
                                label="Pit Time"
                                value={qualities.suspension + qualities.aerodynamics * 0.3}
                                color="bg-red-600"
                            />
                            <MetricBar label="Total Lap Time" value={qualities.pitCrew} color="bg-white" />
                        </div>
                    </div>

                    <div className="flex flex-col gap-6">
                        <div className="bg-white/5 border border-white/10 p-6 flex-grow">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">
                                Engineer's Verdict
                            </p>
                            <p className="text-lg leading-relaxed italic text-slate-300">
                                "
                                {qualities.engine > 70
                                    ? 'The power unit is a masterpiece on the straights.'
                                    : "We're lacking top-end grunt compared to the field."}
                                {qualities.aerodynamics > 70
                                    ? ' The downforce package is aggressive but effective.'
                                    : ' The car feels light through the high-speed sectors.'}
                                "
                            </p>
                        </div>
                        <div className={`${rankColor} p-6 text-black flex items-center justify-between transition-colors duration-500`}>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-60">
                                    Constructor Ranking
                                </p>
                                <p className="text-2xl font-black italic">{rankLabel}</p>
                            </div>
                            <Trophy size={32} />
                        </div>
                    </div>
                </div>

                <div className="mt-auto flex justify-center">
                    <button
                        onClick={onReturnToStudio}
                        className="flex items-center gap-3 px-12 py-5 bg-white text-black font-black uppercase italic hover:bg-red-600 hover:text-white transition-all transform hover:-translate-y-1"
                    >
                        <RotateCcw size={20} /> Return to Studio
                    </button>
                </div>
            </div>
        </div>
    );
};

// Wrapper to handle routing state
const ResultsPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    // Cast qualities to the expected type if needed, or default to mock
    const qualities = (location.state?.qualities || mockQualities) as ResultsViewProps['qualities'];

    return (
        <ResultsView
            qualities={qualities}
            onReturnToStudio={() => navigate('/studio')}
        />
    );
};

export default ResultsPage;
