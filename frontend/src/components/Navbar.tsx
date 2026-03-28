import { Trophy, Radio, Lock } from 'lucide-react';

interface NavbarProps {
    remainingBudget: number;
    onLogoClick: () => void;
}

const Navbar = ({ remainingBudget, onLogoClick }: NavbarProps) => (
    <nav className="border-b border-white/5 bg-[#121214]/90 backdrop-blur-2xl px-10 py-5 flex justify-between items-center z-50 shadow-xl">
        <div className="flex items-center gap-4 cursor-pointer group" onClick={onLogoClick}>
            <div className="bg-red-600 p-2 rounded-none transform -skew-x-12">
                <Trophy size={20} className="text-white skew-x-12" />
            </div>
            <div className="flex flex-col leading-none">
                <span className="font-black italic tracking-tighter text-2xl uppercase">F1 Studio Garage</span>
                <span className="text-[8px] font-mono text-red-600 tracking-[0.4em] mt-1 uppercase">Advanced Engineering Lab</span>
            </div>
        </div>
        <div className="flex items-center gap-10">
            <div className="hidden lg:flex flex-col items-end mr-4">
                <span className="text-[9px] uppercase tracking-[0.2em] text-slate-400 font-black mb-1">Satellite Link</span>
                <p className="text-[10px] text-emerald-500 font-mono font-bold tracking-widest flex items-center gap-2">
                    <Radio size={12} className="animate-pulse" />
                    SYSTEMS ONLINE
                </p>
            </div>
            <div className={`relative px-8 py-3 rounded-none border-l-4 transition-all duration-500 bg-white/5 ${remainingBudget < 500000 ? 'border-red-600' : 'border-white/20'}`}>
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black mb-1">Budget Allocation</p>
                <p className="text-3xl font-mono font-black tabular-nums tracking-tighter">
                    ${remainingBudget.toLocaleString()}
                </p>
                {remainingBudget < 100000 && <Lock size={12} className="absolute top-2 right-2 text-red-600 animate-pulse" />}
            </div>
        </div>
    </nav>
);

export default Navbar;