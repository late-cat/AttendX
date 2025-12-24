import { GLASS_STYLES } from '../lib/styles';

export default function CircularProgress({ percentage, label }) {
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const progress = Math.min(100, Math.max(0, percentage));
    const offset = circumference - (progress / 100) * circumference;

    return (
        <div
            className="relative p-5 md:p-6 rounded-[22px] bg-white/[0.08] border border-white/[0.2] flex flex-col items-center gap-3 overflow-hidden transition-all duration-300 hover:-translate-y-1"
            style={GLASS_STYLES.card}
        >
            <div className="absolute top-0 left-0 right-0 h-[55%] bg-gradient-to-b from-white/10 to-transparent pointer-events-none rounded-t-[22px]" />

            <div className="relative z-10 w-[100px] h-[100px]">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    {/* Background circle */}
                    <circle
                        cx="50" cy="50" r={radius}
                        fill="none"
                        strokeWidth="6"
                        stroke="rgba(255,255,255,0.1)"
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
                    />
                    <defs>
                        <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#8b5cf6" />
                            <stop offset="100%" stopColor="#06b6d4" />
                        </linearGradient>
                    </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold">{progress.toFixed(1)}%</span>
                </div>
            </div>
            <p className="relative z-10 text-white/50 text-[0.7rem] font-medium uppercase tracking-wider">{label}</p>
        </div>
    );
}
