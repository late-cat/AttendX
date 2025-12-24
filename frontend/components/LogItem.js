import { formatTime } from '../lib/utils';

export default function LogItem({ log }) {
    return (
        <div className="flex items-center justify-between p-3.5 rounded-[14px] bg-white/[0.05] border border-transparent hover:bg-white/[0.1] hover:border-white/[0.1] transition-all">
            <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-white/90 text-purple-600 flex items-center justify-center text-sm font-bold shadow-md">
                    {log.Name?.[0]}
                </div>
                <div>
                    <p className="font-medium text-[0.94rem]">{log.Name}</p>
                    <p className="text-xs text-white/40">{formatTime(log.Time)}</p>
                </div>
            </div>
            <span className="text-xs font-medium px-3.5 py-1.5 rounded-full bg-white/[0.14] border border-white/[0.12]"
                style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)' }}>
                Verified
            </span>
        </div>
    );
}
