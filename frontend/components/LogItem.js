import { formatTime } from '../lib/utils';

export default function LogItem({ log }) {
    return (
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/60 border border-slate-200 hover:bg-white transition-all shadow-sm">
            <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-[var(--color-cotton-blue)] text-slate-800 flex items-center justify-center text-sm font-bold shadow-sm border border-slate-200/50">
                    {log.Name?.[0]}
                </div>
                <div>
                    <p className="font-bold text-[0.94rem] text-slate-800">{log.Name}</p>
                    <p className="text-xs text-slate-500 font-medium">{formatTime(log.Time)}</p>
                </div>
            </div>
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-sm" title="Verified">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                </svg>
            </div>
        </div>
    );
}
