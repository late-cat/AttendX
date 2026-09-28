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
            <div className="relative z-10 w-[50px] h-[50px] bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-700"
                style={GLASS_STYLES.iconContainer}>
                <MonitorIcon size="lg" />
            </div>
            <div className="relative z-10">
                <p className="text-slate-500 text-[0.7rem] font-bold uppercase tracking-wider mb-1">System Status</p>
                <div className="flex items-center justify-center gap-2">
                    <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{
                            backgroundColor: isOnline ? '#10b981' : '#ef4444',
                            boxShadow: isOnline ? '0 0 8px #10b981' : '0 0 8px #ef4444'
                        }}
                    />
                    <span className="text-[2rem] font-bold tracking-tight text-slate-800">{status}</span>
                </div>
            </div>
        </div>
    );
}
