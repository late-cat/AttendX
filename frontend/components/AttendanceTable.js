import { formatDate, formatTime } from '../lib/utils';

export default function AttendanceTable({ data, viewType = 'students' }) {
    if (!data || data.length === 0) {
        return (
            <div className="text-center py-12 border border-dashed border-slate-300 rounded-2xl bg-white/40">
                <p className="text-slate-500 font-medium">No records found.</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 font-bold">
                    <tr>
                        <th className="px-6 py-4">{viewType === 'teachers' ? 'Teacher Name' : 'Student Name'}</th>
                        {viewType === 'students' && <th className="px-6 py-4">Class</th>}
                        <th className="px-6 py-4">Date</th>
                        {viewType === 'students' && <th className="px-6 py-4">Time</th>}
                        {viewType === 'teachers' && (
                            <>
                                <th className="px-6 py-4">Check In</th>
                                <th className="px-6 py-4">Check Out</th>
                            </>
                        )}
                        <th className="px-6 py-4">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {data.map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 font-bold text-slate-800 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-[var(--color-cotton-blue)] flex items-center justify-center text-xs font-bold text-slate-700 border border-slate-200/50">
                                    {row.Name?.[0]}
                                </div>
                                {row.Name}
                            </td>
                            {viewType === 'students' && (
                                <td className="px-6 py-4 text-slate-500">
                                    {row.Class ? (
                                        <span className="flex flex-col gap-1">
                                            <span className="font-bold text-slate-700">Class {row.Class}-{row.Section}</span>
                                            <span className="text-xs">{row.Subject}</span>
                                        </span>
                                    ) : (
                                        <span className="text-xs opacity-50">N/A</span>
                                    )}
                                </td>
                            )}
                            <td className="px-6 py-4 text-slate-500">{formatDate(row.Date)}</td>
                            {viewType === 'students' && (
                                <td className="px-6 py-4 font-mono text-slate-500">{formatTime(row.Time)}</td>
                            )}
                            {viewType === 'teachers' && (
                                <>
                                    <td className="px-6 py-4 font-mono text-slate-500">
                                        {row['Check In'] && row['Check In'] !== '-' ? formatTime(row['Check In']) : '-'}
                                    </td>
                                    <td className="px-6 py-4 font-mono text-slate-500">
                                        {row['Check Out'] && row['Check Out'] !== '-' ? formatTime(row['Check Out']) : '-'}
                                    </td>
                                </>
                            )}
                            <td className="px-6 py-4">
                                <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                                    Present
                                </span>
                                {row.Source === 'Manual_Override' && (
                                    <span className="ml-2 px-2 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                                        Manual
                                    </span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
