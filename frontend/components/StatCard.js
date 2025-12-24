import { GLASS_STYLES } from '../lib/styles';

export default function StatCard({ label, value, icon }) {
    return (
        <div
            className="relative p-5 md:p-6 rounded-[22px] bg-white/[0.08] border border-white/[0.2] flex flex-col items-center text-center gap-3 overflow-hidden transition-all duration-300 hover:-translate-y-1"
            style={GLASS_STYLES.card}
        >
            {/* Glass gradient overlay */}
            <div className="absolute top-0 left-0 right-0 h-[55%] bg-gradient-to-b from-white/10 to-transparent pointer-events-none rounded-t-[22px]" />

            <div className="relative z-10 w-[50px] h-[50px] bg-white/[0.12] border border-white/[0.15] rounded-[14px] flex items-center justify-center"
                style={GLASS_STYLES.iconContainer}>
                {icon}
            </div>
            <div className="relative z-10">
                <p className="text-white/50 text-[0.7rem] font-medium uppercase tracking-wider mb-1">{label}</p>
                <p className="text-[1.6rem] font-semibold tracking-tight">{value}</p>
            </div>
        </div>
    );
}
