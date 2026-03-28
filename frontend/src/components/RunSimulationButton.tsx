import { Gauge } from 'lucide-react';

interface RunSimulationButtonProps {
    onClick: () => void;
}

const RunSimulationButton = ({ onClick }: RunSimulationButtonProps) => (
    <div className="flex flex-col items-center justify-center -mt-14 z-20">
        <button onClick={onClick} className="group relative">
            <div className="absolute inset-0 bg-red-600 blur-3xl opacity-20 group-hover:opacity-40 transition-all rounded-full" />
            <div className="relative flex items-center gap-6 px-16 py-6 bg-black hover:bg-neutral-900 text-white font-black italic rounded-none border-2 border-red-600 shadow-2xl transition-all active:scale-95 overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-red-600/50 animate-[scan_2s_linear_infinite]" />
                <div className="flex flex-col items-start leading-none">
                    <span className="text-[10px] not-italic tracking-[0.3em] text-red-600 mb-1">SIM_ENGINE_INIT</span>
                    <span className="text-2xl tracking-tighter uppercase">Run Simulation</span>
                </div>
                <Gauge size={28} className="text-red-600 group-hover:rotate-[360deg] transition-transform duration-1000" />
            </div>
        </button>
    </div>
);

export default RunSimulationButton;