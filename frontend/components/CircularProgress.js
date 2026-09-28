import { GLASS_STYLES } from '../lib/styles';

export default function CircularProgress({ percentage, label }) {
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const progress = Math.min(100, Math.max(0, percentage));
    const offset = circumference - (progress / 100) * circumference;

    return (
        <div
            className="card flex flex-col items-center gap-3 overflow-hidden"
            style={{
                ...GLASS_STYLES.card,
                transform: 'translateZ(0)',
            }}
        >

            <div className="relative z-10 w-[100px] h-[100px]">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    {/* Engraved Background circle */}
                    <circle
                        cx="50" cy="50" r={radius}
                        fill="none"
                        strokeWidth="6"
                        stroke="#f1f5f9"
                        filter="url(#innerShadow)"
                    />
                    {/* Progress circle */}
                    <circle
                        cx="50" cy="50" r={radius}
                        fill="none"
                        strokeWidth="6"
                        stroke="url(#progressGradient)"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                        className="drop-shadow-[0_2px_4px_rgba(139,92,246,0.3)]"
                    />
                    <defs>
                        <filter id="innerShadow" x="-20%" y="-20%" width="140%" height="140%">
                            <feOffset dx="0" dy="2"/>
                            <feGaussianBlur stdDeviation="2" result="offset-blur"/>
                            <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse"/>
                            <feFlood floodColor="black" floodOpacity="0.15" result="color"/>
                            <feComposite operator="in" in="color" in2="inverse" result="shadow"/>
                            <feComposite operator="over" in="shadow" in2="SourceGraphic"/>
                        </filter>
                        <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#8b5cf6" />
                            <stop offset="100%" stopColor="#06b6d4" />
                        </linearGradient>
                    </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-bold text-slate-800">{progress.toFixed(1)}%</span>
                </div>
            </div>
            <p className="relative z-10 text-slate-500 text-[0.7rem] font-bold uppercase tracking-wider">{label}</p>
        </div>
    );
}
