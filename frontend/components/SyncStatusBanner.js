'use client';

// Inline SVG icons to match the rest of the codebase
const CheckIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const RefreshIcon = ({ className = "" }) => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polyline points="23 4 23 10 17 10" />
        <polyline points="1 20 1 14 7 14" />
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
);

const AlertIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
);

/**
 * SyncStatusBanner - Shows real-time sync status for attendance data
 * 
 * States:
 * - 'synced': Data is up to date (green indicator)
 * - 'syncing': Currently fetching new data (yellow, animated)
 * - 'new-updates': New updates available, click to refresh (blue with button)
 */
export default function SyncStatusBanner({ status, onRefresh }) {
    if (status === 'synced') {
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium
        bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <CheckIcon />
                <span>Up to date</span>
            </div>
        );
    }

    if (status === 'syncing') {
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium
        bg-amber-500/10 border border-amber-500/20 text-amber-400 animate-pulse">
                <RefreshIcon className="animate-spin" />
                <span>Syncing...</span>
            </div>
        );
    }

    if (status === 'new-updates') {
        return (
            <button
                onClick={onRefresh}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium
          bg-violet-500/15 border border-violet-500/30 text-violet-300
          hover:bg-violet-500/25 hover:border-violet-400/40 
          transition-all duration-200 cursor-pointer group"
            >
                <AlertIcon />
                <span>New updates</span>
                <RefreshIcon className="group-hover:rotate-180 transition-transform duration-300" />
            </button>
        );
    }

    // Default/offline state
    return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium
      bg-white/5 border border-white/10 text-white/40">
            <span>•</span>
            <span>Offline</span>
        </div>
    );
}
