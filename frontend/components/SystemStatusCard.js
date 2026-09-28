import { GLASS_STYLES } from '../lib/styles';
import { MonitorIcon } from '../lib/icons';

export default function SystemStatusCard({ status }) {
    const isOnline = status === 'Online';
    return (
        <div
            className="card flex flex-col items-center text-center gap-3 overflow-hidden"
            style={{
                ...GLASS_STYLES.card,
                transform: 'translateZ(0)', // Force GPU layer to prevent blur repaints
            }}
        >
            <div className="relative z-10 w-[50px] h-[50px] bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-slate-500 shadow-[inset_0_2px_5px_rgba(0,0,0,0.06),0_1px_1px_rgba(255,255,255,1)]"
                style={GLASS_STYLES.iconContainer}>
                <MonitorIcon size="lg" />
            </div>
            <div className="relative z-10">
                <p className="text-slate-500 text-[0.7rem] font-bold uppercase tracking-wider mb-1">System Status</p>
                <div className="flex items-center justify-center gap-2">
                    <span
                        className="w-3.5 h-3.5 rounded-full border border-white/50"
                        style={{
                            background: isOnline ? 'radial-gradient(circle at 35% 35%, #6ee7b7, #10b981)' : 'radial-gradient(circle at 35% 35%, #fca5a5, #ef4444)',
                            boxShadow: isOnline 
                                ? 'inset 0 -2px 4px rgba(0,0,0,0.2), inset 0 2px 4px rgba(255,255,255,0.7), 0 0 12px rgba(16,185,129,0.6)' 
                                : 'inset 0 -2px 4px rgba(0,0,0,0.2), inset 0 2px 4px rgba(255,255,255,0.7), 0 0 12px rgba(239,68,68,0.6)'
                        }}
                    />
                    <span className="text-[2rem] font-bold tracking-tight text-slate-800">{status}</span>
                </div>
            </div>
        </div>
    );
}
