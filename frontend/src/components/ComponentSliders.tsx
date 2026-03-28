import { mockComponents } from '../store/mockComponentData';

interface ComponentSlidersProps {
    qualities: Record<string, number>;
    onSliderChange: (key: string, value: string) => void;
    onHoverKey?: (key: string) => void;
    onHoverEnd?: () => void;
}

const ComponentSliders = ({
    qualities,
    onSliderChange,
    onHoverKey,
    onHoverEnd,
}: ComponentSlidersProps) => (
    <div style={{ display: 'flex', flexDirection: 'row', gap: '0', width: '100%' }}>
        {Object.entries(mockComponents).map(([key, data]) => (
            <div
                key={key}
                className="slider-item"
                onMouseEnter={() => onHoverKey?.(key)}
                onMouseLeave={() => onHoverEnd?.()}
            >
                <div className="slider-header">
                    <span className="slider-name">{data.label}</span>
                    <span className="slider-value">{qualities[key]}%</span>
                </div>
                <div className="slider-desc">{data.description}</div>
                <div className="slider-track">
                    <div className="slider-track-bg" />
                    <div className="slider-track-fill" style={{ width: `${qualities[key]}%` }} />
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={qualities[key]}
                        onChange={(e) => onSliderChange(key, e.target.value)}
                        className="hud-slider"
                    />
                </div>
            </div>
        ))}
    </div>
);

export default ComponentSliders;