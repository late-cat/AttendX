import { formatTime } from '../lib/utils';

export default function LogItem({ log }) {
    return (
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
            <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-sm font-extrabold shadow-[inset_0_2px_4px_rgba(0,0,0,0.08),0_1px_2px_rgba(255,255,255,1)] border border-slate-200/50">
                    {log.Name?.[0]}
                </div>
                <div>
                    <p className="font-bold text-[0.94rem] text-slate-800">{log.Name}</p>
                    <p className="text-xs text-slate-500 font-bold">{formatTime(log.Time)}</p>
                </div>
            </div>
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 border border-slate-200 shadow-[inset_0_2px_5px_rgba(0,0,0,0.08),0_1px_2px_rgba(255,255,255,1)]" title="Verified">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500 drop-shadow-[0_1px_0px_rgba(255,255,255,1)]">
                    <polyline points="20 6 9 17 4 12" />
                </svg>
            </div>
        </div>
    );
}
