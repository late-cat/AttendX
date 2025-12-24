/**
 * Shared SVG Icons for AttendX Dashboard
 * Centralized icon definitions to avoid duplication
 */

// ============================================
// SIDEBAR ICONS (17px)
// ============================================
export const HomeIcon = () => (
    <svg viewBox="0 0 24 24" className="w-[17px] h-[17px] stroke-current fill-none" strokeWidth="1.5">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
);

export const CameraIcon = ({ size = 'sm' }) => {
    const sizes = { sm: 'w-[17px] h-[17px]', md: 'w-5 h-5', lg: 'w-[25px] h-[25px]' };
    return (
        <svg viewBox="0 0 24 24" className={`${sizes[size]} stroke-current fill-none`} strokeWidth="1.5">
            <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
            <circle cx="12" cy="13" r="4" />
        </svg>
    );
};

export const CalendarIcon = ({ size = 'sm' }) => {
    const sizes = { sm: 'w-[17px] h-[17px]', md: 'w-5 h-5' };
    return (
        <svg viewBox="0 0 24 24" className={`${sizes[size]} stroke-current fill-none`} strokeWidth="1.5">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
    );
};

export const LogsIcon = () => (
    <svg viewBox="0 0 24 24" className="w-[17px] h-[17px] stroke-current fill-none" strokeWidth="1.5">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
);

export const UsersIcon = ({ size = 'sm', strokeColor = 'current' }) => {
    const sizes = { sm: 'w-[17px] h-[17px]', lg: 'w-[25px] h-[25px]' };
    const stroke = strokeColor === 'white' ? 'stroke-white' : 'stroke-current';
    return (
        <svg viewBox="0 0 24 24" className={`${sizes[size]} ${stroke} fill-none`} strokeWidth="1.5">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 00-3-3.87" />
            <path d="M16 3.13a4 4 0 010 7.75" />
        </svg>
    );
};

export const SettingsIcon = () => (
    <svg viewBox="0 0 24 24" className="w-[17px] h-[17px] stroke-current fill-none" strokeWidth="1.5">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
);

// ============================================
// STAT CARD ICONS (25px, white stroke)
// ============================================
export const CheckCircleIcon = () => (
    <svg viewBox="0 0 24 24" className="w-[25px] h-[25px] stroke-white fill-none" strokeWidth="1.5">
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
);

export const ChartIcon = () => (
    <svg viewBox="0 0 24 24" className="w-[25px] h-[25px] stroke-white fill-none" strokeWidth="1.5">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
);

export const MonitorIcon = () => (
    <svg viewBox="0 0 24 24" className="w-[25px] h-[25px] stroke-white fill-none" strokeWidth="1.5">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
);

export const BellIcon = () => (
    <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] stroke-white fill-none" strokeWidth="1.5">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
);

// ============================================
// ACTION ICONS (20px)
// ============================================
export const VideoIcon = () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current fill-none" strokeWidth="1.5">
        <polygon points="23 7 16 12 23 17 23 7" />
        <rect x="1" y="5" width="15" height="14" rx="2" />
    </svg>
);

export const UploadIcon = () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current fill-none" strokeWidth="1.5">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
);

export const DownloadIcon = () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current fill-none" strokeWidth="1.5">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
);

export const TrashIcon = () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current fill-none" strokeWidth="1.5">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
    </svg>
);

export const FileIcon = () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current fill-none" strokeWidth="1.5">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
);

export const UserPlusIcon = () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current fill-none" strokeWidth="1.5">
        <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="8.5" cy="7" r="4" />
        <line x1="20" y1="8" x2="20" y2="14" />
        <line x1="23" y1="11" x2="17" y2="11" />
    </svg>
);

export const AlertIcon = () => (
    <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
);

export const CheckIcon = ({ size = 'sm' }) => {
    const sizes = { xs: 'w-3 h-3', sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-6 h-6' };
    return (
        <svg viewBox="0 0 24 24" className={`${sizes[size]} stroke-current fill-none`} strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    );
};

export const CloseIcon = ({ size = 'md' }) => {
    const sizes = { sm: 'w-4 h-4', md: 'w-5 h-5' };
    return (
        <svg viewBox="0 0 24 24" className={`${sizes[size]} stroke-current fill-none`} strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    );
};

export const RefreshIcon = () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current fill-none" strokeWidth="1.5">
        <polyline points="23 4 23 10 17 10" />
        <polyline points="1 20 1 14 7 14" />
        <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
    </svg>
);

export const ConstructionIcon = () => (
    <svg viewBox="0 0 24 24" className="w-6 h-6 stroke-current fill-none" strokeWidth="1.5">
        <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
        <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
    </svg>
);

export const MenuIcon = () => (
    <svg viewBox="0 0 24 24" className="w-6 h-6 stroke-current fill-none" strokeWidth="2">
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
);

export const ChevronDownIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/60">
        <path d="M6 9l6 6 6-6" />
    </svg>
);

export const SearchIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/50">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
    </svg>
);

// ============================================
// RESULT/STATUS ICONS
// ============================================
export const SuccessIcon = () => (
    <svg viewBox="0 0 24 24" className="w-6 h-6 stroke-green-400 fill-none" strokeWidth="2">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

export const ErrorIcon = () => (
    <svg viewBox="0 0 24 24" className="w-6 h-6 stroke-red-400 fill-none" strokeWidth="2">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);
