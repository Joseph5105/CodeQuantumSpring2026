import { useMemo } from 'react'
import { Trophy, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import '../styles/App.css'

const QUOTES = [
  { text: "If you no longer go for a gap that exists, you are no longer a racing driver.", author: "Ayrton Senna" },
  { text: "There is something beyond our mind which controls what happens. You go beyond the limit. Something happens and you suddenly can do it.", author: "Ayrton Senna" },
  { text: "I have no regrets. You make the best decision you can at the time, and whatever happens, happens.", author: "Niki Lauda" },
  { text: "Once something is a passion, the motivation is there. What's hard is when people are unwilling to invest in failure.", author: "Michael Schumacher" },
  { text: "I want to be the voice for those who don't have a voice. And I want to inspire kids who look like me to know they belong in this world.", author: "Lewis Hamilton" },
  { text: "The biggest thing is to not waste the opportunity you are given.", author: "Lewis Hamilton" },
  { text: "You don't need to be brave enough to not feel fear. You need to be brave enough to go on in spite of it.", author: "Sir Jackie Stewart" },
  { text: "The day I am no longer afraid, that's the day I become dangerous.", author: "Gilles Villeneuve" },
  { text: "I've always believed that you should never, ever, give up, and you should always keep fighting even when there's only a slender chance.", author: "Jim Clark" },
  { text: "The best driver is the one who never has an accident, because he drives well enough to avoid one.", author: "Alain Prost" }
]

const LandingPage = () => {
  const navigate = useNavigate();
  const activeQuote = useMemo(() => {
    return QUOTES[Math.floor(Math.random() * QUOTES.length)];
  }, []);

  return (
    <div className="relative min-h-screen bg-black flex flex-col items-center justify-center overflow-hidden font-sans">
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[70%] h-[70%] bg-red-900 blur-[180px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-white/5 blur-[150px] rounded-full" />
      </div>

      {/* Main Quote Content */}
      <div className="relative z-10 text-center px-8 max-w-5xl">
        <div className="flex items-center justify-center mb-16 opacity-50">
          <div className="h-[1px] w-24 bg-gradient-to-r from-transparent to-red-600 mr-4" />
          <Trophy size={16} className="text-red-600" />
          <div className="h-[1px] w-24 bg-gradient-to-l from-transparent to-red-600 ml-4" />
        </div>
        
        <div className="space-y-8 mb-20 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <h1 className="text-3xl md:text-5xl font-black text-white italic tracking-tight leading-tight">
            "{activeQuote.text}"
          </h1>
          <p className="text-red-600 font-mono text-sm tracking-[0.5em] uppercase font-bold">
            — {activeQuote.author}
          </p>
        </div>

        <button 
          onClick={() => navigate('/studio')}
          className="group relative inline-flex items-center justify-center px-16 py-6 font-black text-white transition-all duration-500 bg-transparent border border-white/20 hover:border-red-600 rounded-none overflow-hidden"
        >
          <div className="absolute inset-0 bg-red-600 translate-y-[101%] group-hover:translate-y-0 transition-transform duration-300 ease-out" />
          <span className="relative flex items-center uppercase tracking-[0.3em] text-xs">
            Begin Construction
            <ChevronRight className="ml-3 group-hover:translate-x-1 transition-transform" size={14} />
          </span>
        </button>
      </div>

      {/* Decorative Technical HUD corner elements */}
      <div className="absolute bottom-10 left-10 opacity-20 hidden md:block">
        <div className="flex flex-col gap-1 font-mono text-[8px] text-white uppercase tracking-widest text-left">
          <span>LAT: 44.8329 N</span>
          <span>LON: 11.6189 E</span>
          <span className="text-red-600">MARANELLO_HQ_LINK</span>
        </div>
      </div>
    </div>
  );
}

export default LandingPage
