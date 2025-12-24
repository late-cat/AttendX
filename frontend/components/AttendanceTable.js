import { formatDate, formatTime } from '../lib/utils';

export default function AttendanceTable({ data }) {
    if (!data || data.length === 0) {
        return (
            <div className="text-center py-12 border border-dashed border-glass-border rounded-lg bg-white/5">
                <p className="text-secondary">No records found.</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto rounded-lg border border-glass-border">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-secondary uppercase bg-white/5 font-medium">
                    <tr>
                        <th className="px-6 py-4">Student Name</th>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Time</th>
                        <th className="px-6 py-4">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-glass-border bg-black/20">
                    {data.map((row, i) => (
                        <tr key={i} className="hover:bg-white/5 transition-colors">
                            <td className="px-6 py-4 font-medium text-white flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-600/30 flex items-center justify-center text-xs border border-blue-500/30">
                                    {row.Name?.[0]}
                                </div>
                                {row.Name}
                            </td>
                            <td className="px-6 py-4 text-secondary">{formatDate(row.Date)}</td>
                            <td className="px-6 py-4 font-mono text-secondary">{formatTime(row.Time)}</td>
                            <td className="px-6 py-4">
                                <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/30">
                                    Present
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
