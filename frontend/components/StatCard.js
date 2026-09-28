import { GLASS_STYLES } from '../lib/styles';

export default function StatCard({ label, value, icon }) {
    return (
        <div
            className="card flex flex-col items-center text-center gap-3 overflow-hidden"
            style={{
                ...GLASS_STYLES.card,
                transform: 'translateZ(0)', // Force GPU layer to prevent blur repaints
            }}
        >
            <div className="relative z-10 w-[50px] h-[50px] bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-700"
                style={GLASS_STYLES.iconContainer}>
                {icon}
            </div>
            <div className="relative z-10">
                <p className="text-slate-500 text-[0.7rem] font-bold uppercase tracking-wider mb-1">{label}</p>
                <p className="text-[2rem] font-bold tracking-tight text-slate-800">{value}</p>
            </div>
        </div>
    );
}
