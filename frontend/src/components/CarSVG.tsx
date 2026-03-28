interface CarSVGProps {
  width?: number | string;
  className?: string;
}

const CarSVG = ({ width = "100%", className = "" }: CarSVGProps) => (
  <svg viewBox="0 0 1000 400" className={`${className} drop-shadow-[0_40px_80px_rgba(220,38,38,0.3)]`} style={{ width }}>
    <path d="M150 280 L850 280 L870 260 L130 260 Z" fill="#111" />
    <path d="M220 260 L350 180 L550 170 L750 210 L820 260 H220 Z" fill="#CC0000" />
    <path d="M380 260 L420 190 L550 185 L600 260 Z" fill="#FFFFFF" />
    <path d="M220 260 L100 270 L80 250 L200 220 Z" fill="#CC0000" />
    <path d="M80 250 L100 270 L60 270 L60 255 Z" fill="#000" />
    <path d="M480 175 Q520 130 580 175" fill="none" stroke="#000" strokeWidth="8" />
    <ellipse cx="530" cy="180" rx="40" ry="15" fill="#000" />
    <path d="M800 240 L850 240 L860 140 L780 145 Z" fill="#111" />
    <rect x="770" y="140" width="100" height="15" fill="#CC0000" />
    <g>
      <circle cx="260" cy="270" r="45" fill="#000" stroke="#333" strokeWidth="3" />
      <circle cx="260" cy="270" r="20" fill="#111" stroke="#FFF" strokeWidth="1" strokeDasharray="4" />
      <circle cx="720" cy="270" r="50" fill="#000" stroke="#333" strokeWidth="3" />
      <circle cx="720" cy="270" r="25" fill="#111" stroke="#FFF" strokeWidth="1" strokeDasharray="5" />
    </g>
    <path d="M40 275 H180 V255 L40 260 Z" fill="#111" />
    <rect x="40" y="260" width="140" height="4" fill="#CC0000" />
  </svg>
);

export default CarSVG;