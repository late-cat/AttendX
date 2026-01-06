'use client';

import { useState, useEffect } from 'react';
import { GLASS_STYLES } from '../lib/styles';
import API_BASE_URL from '../lib/api';

// SVG Icons for Tech Stack
const TechIcons = {
    nextjs: (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
            <path d="M11.572 0c-.176 0-.31.001-.358.007a19.76 19.76 0 01-.364.033C7.443.346 4.25 2.185 2.228 5.012a11.875 11.875 0 00-2.119 5.243c-.096.659-.108.854-.108 1.747s.012 1.089.108 1.748c.652 4.506 3.86 8.292 8.209 9.695.779.251 1.6.422 2.534.525.363.04 1.935.04 2.299 0 1.611-.178 2.977-.577 4.323-1.264.207-.106.247-.134.219-.158-.02-.013-.9-1.193-1.955-2.62l-1.919-2.592-2.404-3.558a338.739 338.739 0 00-2.422-3.556c-.009-.002-.018 1.579-.023 3.51-.007 3.38-.01 3.515-.052 3.595a.426.426 0 01-.206.214c-.075.037-.14.044-.495.044H7.81l-.108-.068a.438.438 0 01-.157-.171l-.05-.106.006-4.703.007-4.705.072-.092a.645.645 0 01.174-.143c.096-.047.134-.051.54-.051.478 0 .558.018.682.154.035.038 1.337 1.999 2.895 4.361a10760.433 10760.433 0 004.735 7.17l1.9 2.879.096-.063a12.317 12.317 0 002.466-2.163 11.944 11.944 0 002.824-6.134c.096-.66.108-.854.108-1.748 0-.893-.012-1.088-.108-1.747-.652-4.506-3.859-8.292-8.208-9.695a12.597 12.597 0 00-2.499-.523A33.119 33.119 0 0011.572 0z" />
        </svg>
    ),
    react: (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#61DAFB">
            <path d="M12 10.11c1.03 0 1.87.84 1.87 1.89 0 1-.84 1.85-1.87 1.85S10.13 13 10.13 12c0-1.05.84-1.89 1.87-1.89M7.37 20c.63.38 2.01-.2 3.6-1.7-.52-.59-1.03-1.23-1.51-1.9a22.7 22.7 0 01-2.4-.36c-.51 2.14-.32 3.61.31 3.96m.71-5.74l-.29-.51c-.11.29-.22.58-.29.86.27.06.57.11.88.16l-.3-.51m6.54-.76l.81-1.5-.81-1.5c-.3-.53-.62-1-.91-1.47C13.17 9 12.6 9 12 9c-.6 0-1.17 0-1.71.03-.29.47-.61.94-.91 1.47L8.57 12l.81 1.5c.3.53.62 1 .91 1.47.54.03 1.11.03 1.71.03.6 0 1.17 0 1.71-.03.29-.47.61-.94.91-1.47M12 6.78c-.19.22-.39.45-.59.72h1.18c-.2-.27-.4-.5-.59-.72m0 10.44c.19-.22.39-.45.59-.72h-1.18c.2.27.4.5.59.72M16.62 4c-.62-.38-2 .2-3.59 1.7.52.59 1.03 1.23 1.51 1.9.82.08 1.63.2 2.4.36.51-2.14.32-3.61-.32-3.96m-.7 5.74l.29.51c.11-.29.22-.58.29-.86-.27-.06-.57-.11-.88-.16l.3.51m1.45-7.05c1.47.84 1.63 3.05 1.01 5.63 2.54.75 4.37 1.99 4.37 3.68 0 1.69-1.83 2.93-4.37 3.68.62 2.58.46 4.79-1.01 5.63-1.46.84-3.45-.12-5.37-1.95-1.92 1.83-3.91 2.79-5.38 1.95-1.46-.84-1.62-3.05-1-5.63-2.54-.75-4.37-1.99-4.37-3.68 0-1.69 1.83-2.93 4.37-3.68-.62-2.58-.46-4.79 1-5.63 1.47-.84 3.46.12 5.38 1.95 1.92-1.83 3.91-2.79 5.37-1.95M17.08 12c.34.75.64 1.5.89 2.26 2.1-.63 3.28-1.53 3.28-2.26 0-.73-1.18-1.63-3.28-2.26-.25.76-.55 1.51-.89 2.26M6.92 12c-.34-.75-.64-1.5-.89-2.26-2.1.63-3.28 1.53-3.28 2.26 0 .73 1.18 1.63 3.28 2.26.25-.76.55-1.51.89-2.26m9 2.26l-.3.51c.31-.05.61-.1.88-.16-.07-.28-.18-.57-.29-.86l-.29.51m-2.89 4.04c1.59 1.5 2.97 2.08 3.59 1.7.64-.35.83-1.82.32-3.96-.77.16-1.58.28-2.4.36-.48.67-.99 1.31-1.51 1.9M8.08 9.74l.3-.51c-.31.05-.61.1-.88.16.07.28.18.57.29.86l.29-.51m2.89-4.04C9.38 4.2 8 3.62 7.37 4c-.63.35-.82 1.82-.31 3.96a22.7 22.7 0 012.4-.36c.48-.67.99-1.31 1.51-1.9z" />
        </svg>
    ),
    tailwind: (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#06B6D4">
            <path d="M12.001 4.8c-3.2 0-5.2 1.6-6 4.8 1.2-1.6 2.6-2.2 4.2-1.8.913.228 1.565.89 2.288 1.624C13.666 10.618 15.027 12 18.001 12c3.2 0 5.2-1.6 6-4.8-1.2 1.6-2.6 2.2-4.2 1.8-.913-.228-1.565-.89-2.288-1.624C16.337 6.182 14.976 4.8 12.001 4.8zm-6 7.2c-3.2 0-5.2 1.6-6 4.8 1.2-1.6 2.6-2.2 4.2-1.8.913.228 1.565.89 2.288 1.624 1.177 1.194 2.538 2.576 5.512 2.576 3.2 0 5.2-1.6 6-4.8-1.2 1.6-2.6 2.2-4.2 1.8-.913-.228-1.565-.89-2.288-1.624C10.337 13.382 8.976 12 6.001 12z" />
        </svg>
    ),
    python: (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#3776AB">
            <path d="M14.25.18l.9.2.73.26.59.3.45.32.34.34.25.34.16.33.1.3.04.26.02.2-.01.13V8.5l-.05.63-.13.55-.21.46-.26.38-.3.31-.33.25-.35.19-.35.14-.33.1-.3.07-.26.04-.21.02H8.77l-.69.05-.59.14-.5.22-.41.27-.33.32-.27.35-.2.36-.15.37-.1.35-.07.32-.04.27-.02.21v3.06H3.17l-.21-.03-.28-.07-.32-.12-.35-.18-.36-.26-.36-.36-.35-.46-.32-.59-.28-.73-.21-.88-.14-1.05-.05-1.23.06-1.22.16-1.04.24-.87.32-.71.36-.57.4-.44.42-.33.42-.24.4-.16.36-.1.32-.05.24-.01h.16l.06.01h8.16v-.83H6.18l-.01-2.75-.02-.37.05-.34.11-.31.17-.28.25-.26.31-.23.38-.2.44-.18.51-.15.58-.12.64-.1.71-.06.77-.04.84-.02 1.27.05zm-6.3 1.98l-.23.33-.08.41.08.41.23.34.33.22.41.09.41-.09.33-.22.23-.34.08-.41-.08-.41-.23-.33-.33-.22-.41-.09-.41.09zm13.09 3.95l.28.06.32.12.35.18.36.27.36.35.35.47.32.59.28.73.21.88.14 1.04.05 1.23-.06 1.23-.16 1.04-.24.86-.32.71-.36.57-.4.45-.42.33-.42.24-.4.16-.36.09-.32.05-.24.02-.16-.01h-8.22v.82h5.84l.01 2.76.02.36-.05.34-.11.31-.17.29-.25.25-.31.24-.38.2-.44.17-.51.15-.58.13-.64.09-.71.07-.77.04-.84.01-1.27-.04-1.07-.14-.9-.2-.73-.25-.59-.3-.45-.33-.34-.34-.25-.34-.16-.33-.1-.3-.04-.25-.02-.2.01-.13v-5.34l.05-.64.13-.54.21-.46.26-.38.3-.32.33-.24.35-.2.35-.14.33-.1.3-.06.26-.04.21-.02.13-.01h5.84l.69-.05.59-.14.5-.21.41-.28.33-.32.27-.35.2-.36.15-.36.1-.35.07-.32.04-.28.02-.21V6.07h2.09l.14.01zm-6.47 14.25l-.23.33-.08.41.08.41.23.33.33.23.41.08.41-.08.33-.23.23-.33.08-.41-.08-.41-.23-.33-.33-.23-.41-.08-.41.08z" />
        </svg>
    ),
    fastapi: (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#009688">
            <path d="M12 0C5.375 0 0 5.375 0 12c0 6.627 5.375 12 12 12 6.626 0 12-5.373 12-12 0-6.625-5.373-12-12-12zm-.624 21.62v-7.528H7.19L13.203 2.38v7.528h4.029L11.376 21.62z" />
        </svg>
    ),
    firebase: (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#FFCA28">
            <path d="M3.89 15.672L6.255.461A.542.542 0 017.27.288l2.543 4.771zm16.794 3.692l-2.25-14a.54.54 0 00-.919-.295L3.316 19.365l7.856 4.427a1.621 1.621 0 001.588 0zM14.3 7.147l-1.82-3.482a.542.542 0 00-.96 0L3.53 17.984z" />
        </svg>
    ),
    docker: (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#2496ED">
            <path d="M13.983 11.078h2.119a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.119a.185.185 0 00-.185.185v1.888c0 .102.083.185.185.185m-2.954-5.43h2.118a.186.186 0 00.186-.186V3.574a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.186m0 2.716h2.118a.187.187 0 00.186-.186V6.29a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.887c0 .102.082.185.185.186m-2.93 0h2.12a.186.186 0 00.184-.186V6.29a.185.185 0 00-.185-.185H8.1a.185.185 0 00-.185.185v1.887c0 .102.083.185.185.186m-2.964 0h2.119a.186.186 0 00.185-.186V6.29a.185.185 0 00-.185-.185H5.136a.186.186 0 00-.186.185v1.887c0 .102.084.185.186.186m5.893 2.715h2.118a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185m-2.93 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.083.185.185.185m-2.964 0h2.119a.185.185 0 00.185-.185V9.006a.185.185 0 00-.184-.186h-2.12a.186.186 0 00-.186.186v1.887c0 .102.084.185.186.185m-2.92 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.082.185.185.185M23.763 9.89c-.065-.051-.672-.51-1.954-.51-.338.001-.676.03-1.01.087-.248-1.7-1.653-2.53-1.716-2.566l-.344-.199-.226.327c-.284.438-.49.922-.612 1.43-.23.97-.09 1.882.403 2.661-.595.332-1.55.413-1.744.42H.751a.751.751 0 00-.75.748 11.376 11.376 0 00.692 4.062c.545 1.428 1.355 2.48 2.41 3.124 1.18.723 3.1 1.137 5.275 1.137.983.003 1.963-.086 2.93-.266a12.248 12.248 0 003.823-1.389c.98-.567 1.86-1.288 2.61-2.136 1.252-1.418 1.998-2.997 2.553-4.4h.221c1.372 0 2.215-.549 2.68-1.009.309-.293.55-.65.707-1.046l.098-.288z" />
        </svg>
    ),
    huggingface: (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#FFD21E">
            <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-1.5 6a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm3 0a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm-5 5.5c0-.276.5-.5.5-.5h6s.5.224.5.5c0 1.93-1.57 3.5-3.5 3.5S5.5 15.43 5.5 13.5z" />
        </svg>
    ),
    vercel: (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
            <path d="M24 22.525H0l12-21.05 12 21.05z" />
        </svg>
    ),
    arcface: (
        <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current fill-none" strokeWidth="1.5">
            <circle cx="12" cy="8" r="5" />
            <path d="M3 21v-2a7 7 0 0114 0v2" />
        </svg>
    ),
};

// Tech Stack Data
const TECH_STACK = [
    { name: 'Next.js', icon: 'nextjs' },
    { name: 'React', icon: 'react' },
    { name: 'TailwindCSS', icon: 'tailwind' },
    { name: 'FastAPI', icon: 'fastapi' },
    { name: 'Python', icon: 'python' },
    { name: 'Firebase', icon: 'firebase' },
    { name: 'ArcFace', icon: 'arcface' },
    { name: 'Docker', icon: 'docker' },
    { name: 'Hugging Face', icon: 'huggingface' },
    { name: 'Vercel', icon: 'vercel' },
];
// Firebase Storage base URL for team photos
const FIREBASE_TEAM_URL = 'https://storage.googleapis.com/attendx-572c8.firebasestorage.app/team_faces';

// Team Members
const TEAM = [
    { name: 'Bapi Mondal', role: 'Lead', photo: `${FIREBASE_TEAM_URL}/bapi_mondal.jpg`, pos: 'center' },
    { name: 'Sourjo Ghosh', role: 'Developer', photo: `${FIREBASE_TEAM_URL}/sourjo_ghosh.jpg`, pos: 'center' },
    { name: 'Mondrita Dutta', role: 'Developer', photo: `${FIREBASE_TEAM_URL}/mondrita_dutta.jpg`, pos: 'top' },
    { name: 'Srijita Ghosh', role: 'Developer', photo: `${FIREBASE_TEAM_URL}/srijita_ghosh.jpg`, pos: 'top' },
];

// Team names to filter from contributors list
const TEAM_NAMES = TEAM.map(m => m.name.toLowerCase());

// Feature Icons
const FeatureIcons = {
    accuracy: (
        <svg viewBox="0 0 24 24" className="w-7 h-7 stroke-violet-400 fill-none" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" fill="currentColor" />
        </svg>
    ),
    response: (
        <svg viewBox="0 0 24 24" className="w-7 h-7 stroke-cyan-400 fill-none" strokeWidth="1.5">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
    ),
    multiface: (
        <svg viewBox="0 0 24 24" className="w-7 h-7 stroke-amber-400 fill-none" strokeWidth="1.5">
            <circle cx="9" cy="7" r="4" />
            <path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
            <circle cx="17" cy="7" r="3" />
            <path d="M21 21v-2a3 3 0 00-3-3h-1" />
        </svg>
    ),
    sync: (
        <svg viewBox="0 0 24 24" className="w-7 h-7 stroke-emerald-400 fill-none" strokeWidth="1.5">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
        </svg>
    ),
};

export default function AboutTab() {
    const [contributors, setContributors] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch registered students as contributors
    useEffect(() => {
        const fetchContributors = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/students`);
                if (res.ok) {
                    const data = await res.json();
                    setContributors(data.students || []);
                }
            } catch (e) {
                console.error('Failed to fetch contributors:', e);
            } finally {
                setLoading(false);
            }
        };
        fetchContributors();
    }, []);

    return (
        <div className="space-y-6 animate-in pb-8">
            {/* Architecture + Tech Superiority */}
            <div className="glass-panel p-6" style={{ ...GLASS_STYLES.card, transform: 'translateZ(0)' }}>
                <h2 className="font-[family-name:var(--font-great-vibes)] text-4xl mb-2 bg-gradient-to-r from-violet-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                    Built Different
                </h2>
                <p className="text-white/50 text-sm mb-6 tracking-widest italic">the technology behind the magic ✨</p>

                {/* Flowchart */}
                <div className="relative py-4">
                    <div className="flex items-center justify-between gap-2">
                        {/* Camera Input */}
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-600/10 border border-violet-500/30 flex items-center justify-center">
                                <svg viewBox="0 0 24 24" className="w-6 h-6 stroke-violet-400 fill-none" strokeWidth="1.5">
                                    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                                    <circle cx="12" cy="13" r="4" />
                                </svg>
                            </div>
                            <span className="text-xs text-white/60 font-medium">Capture</span>
                        </div>

                        <div className="flex-1 h-0.5 bg-gradient-to-r from-violet-500/50 to-cyan-500/50 relative">
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rotate-45 border-t-2 border-r-2 border-cyan-500/50" />
                        </div>

                        {/* Face Detection */}
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/30 flex items-center justify-center">
                                <svg viewBox="0 0 24 24" className="w-6 h-6 stroke-cyan-400 fill-none" strokeWidth="1.5">
                                    <circle cx="12" cy="10" r="6" />
                                    <path d="M12 16v4M8 22h8" />
                                    <circle cx="10" cy="9" r="1" fill="currentColor" />
                                    <circle cx="14" cy="9" r="1" fill="currentColor" />
                                </svg>
                            </div>
                            <span className="text-xs text-white/60 font-medium">Detect</span>
                        </div>

                        <div className="flex-1 h-0.5 bg-gradient-to-r from-cyan-500/50 to-amber-500/50 relative">
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rotate-45 border-t-2 border-r-2 border-amber-500/50" />
                        </div>

                        {/* ArcFace Model */}
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 flex items-center justify-center">
                                <svg viewBox="0 0 24 24" className="w-6 h-6 stroke-amber-400 fill-none" strokeWidth="1.5">
                                    <path d="M12 2a4 4 0 014 4v2a4 4 0 01-8 0V6a4 4 0 014-4z" />
                                    <path d="M6 10v1a6 6 0 0012 0v-1" />
                                    <path d="M12 17v4M8 21h8" />
                                </svg>
                            </div>
                            <span className="text-xs text-white/60 font-medium">Recognize</span>
                        </div>

                        <div className="flex-1 h-0.5 bg-gradient-to-r from-amber-500/50 to-emerald-500/50 relative">
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rotate-45 border-t-2 border-r-2 border-emerald-500/50" />
                        </div>

                        {/* Attendance Logged */}
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 flex items-center justify-center">
                                <svg viewBox="0 0 24 24" className="w-6 h-6 stroke-emerald-400 fill-none" strokeWidth="2">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            </div>
                            <span className="text-xs text-white/60 font-medium">Logged</span>
                        </div>
                    </div>
                </div>

                {/* Superiority Tagline */}
                <div className="mt-4 p-5 bg-gradient-to-r from-violet-500/10 via-cyan-500/10 to-emerald-500/10 rounded-xl border border-white/[0.08]">
                    <p className="text-[13px] text-white/60 text-center leading-relaxed tracking-wide">
                        Powered by <span className="font-semibold text-amber-300">state-of-the-art ArcFace</span> neural networks, <span className="font-semibold text-orange-300">industry-grade Firebase</span> infrastructure & <span className="font-semibold text-cyan-300">sub-second</span> processing - AttendX doesn't just take attendance, it <span className="bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent font-bold">redefines</span> it.
                    </p>
                </div>

                {/* Tech Stack Pills */}
                <div className="flex flex-wrap gap-2 mt-6">
                    {TECH_STACK.map((tech, i) => (
                        <div
                            key={i}
                            className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.06] border border-white/[0.12] rounded-lg hover:bg-white/[0.1] transition-colors"
                        >
                            {TechIcons[tech.icon]}
                            <span className="text-sm font-medium">{tech.name}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Key Features with Icons */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-panel p-5 text-center" style={{ ...GLASS_STYLES.card, transform: 'translateZ(0)' }}>
                    <div className="flex justify-center mb-3">{FeatureIcons.accuracy}</div>
                    <div className="text-3xl font-black tracking-tighter text-violet-400">98.7%</div>
                    <div className="text-[11px] text-white/50 mt-1.5 uppercase tracking-widest font-medium">Accuracy</div>
                    <div className="text-[10px] text-white/30 mt-1 italic tracking-wide">Near-perfect, always</div>
                </div>
                <div className="glass-panel p-5 text-center" style={{ ...GLASS_STYLES.card, transform: 'translateZ(0)' }}>
                    <div className="flex justify-center mb-3">{FeatureIcons.response}</div>
                    <div className="text-3xl font-black tracking-tighter text-cyan-400">&lt;1s</div>
                    <div className="text-[11px] text-white/50 mt-1.5 uppercase tracking-widest font-medium">Response</div>
                    <div className="text-[10px] text-white/30 mt-1 italic tracking-wide">Blink and it's done</div>
                </div>
                <div className="glass-panel p-5 text-center" style={{ ...GLASS_STYLES.card, transform: 'translateZ(0)' }}>
                    <div className="flex justify-center mb-3">{FeatureIcons.multiface}</div>
                    <div className="text-3xl font-black tracking-tighter text-amber-400">Multi</div>
                    <div className="text-[11px] text-white/50 mt-1.5 uppercase tracking-widest font-medium">Face Detection</div>
                    <div className="text-[10px] text-white/30 mt-1 italic tracking-wide">One frame, unlimited</div>
                </div>
                <div className="glass-panel p-5 text-center" style={{ ...GLASS_STYLES.card, transform: 'translateZ(0)' }}>
                    <div className="flex justify-center mb-3">{FeatureIcons.sync}</div>
                    <div className="text-3xl font-black tracking-tighter text-emerald-400">Real-time</div>
                    <div className="text-[11px] text-white/50 mt-1.5 uppercase tracking-widest font-medium">Sync</div>
                    <div className="text-[10px] text-white/30 mt-1 italic tracking-wide">Instant, everywhere</div>
                </div>
            </div>

            {/* Team */}
            <div className="glass-panel p-6" style={{ ...GLASS_STYLES.card, transform: 'translateZ(0)' }}>
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2 tracking-tight">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current fill-none" strokeWidth="1.5">
                        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                    </svg>
                    <span className="bg-gradient-to-r from-violet-300 to-cyan-300 bg-clip-text text-transparent">Team AttendX</span>
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {TEAM.map((member, i) => (
                        <div key={i} className="flex flex-col items-center gap-2 p-3 bg-white/[0.04] rounded-xl border border-white/[0.08]">
                            <img
                                src={member.photo}
                                alt={member.name}
                                className="w-16 h-16 rounded-full object-cover border-2 border-white/20"
                                style={{ objectPosition: member.pos }}
                            />
                            <div className="text-center">
                                <p className="text-sm font-medium">{member.name}</p>
                                <p className="text-xs text-white/40">{member.role}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Contributors with Thank You Note */}
            <div className="glass-panel p-6" style={{ ...GLASS_STYLES.card, transform: 'translateZ(0)' }}>
                <h2 className="text-lg font-bold mb-3 flex items-center gap-2 tracking-tight">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-pink-400 fill-pink-400/20" strokeWidth="1.5">
                        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                    </svg>
                    <span className="bg-gradient-to-r from-pink-300 to-violet-300 bg-clip-text text-transparent">To Our Contributors</span>
                    <span className="ml-auto text-[10px] text-white/40 font-medium uppercase tracking-widest">{contributors.filter(s => !TEAM_NAMES.includes(s.name?.toLowerCase())).length} people</span>
                </h2>

                {/* Thank You Note */}
                <div className="mb-4 p-5 bg-gradient-to-br from-pink-500/10 via-violet-500/8 to-purple-500/10 rounded-xl border border-pink-500/20">
                    <p className="text-[13px] text-white/60 leading-[1.8] tracking-wide">
                        <span className="font-bold text-pink-400 text-sm">This project breathes because of you.</span>
                        <br /><br />
                        Every photo you shared, every idea you contributed, and every moment you trusted us with your privacy - all came together to bring <span className="font-semibold text-white/80">AttendX</span> to life.
                        <br /><br />
                        In a world where privacy is precious, you chose to share yours with us. That's not just contribution - that's <span className="font-bold bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">trust</span>. And we don't take it lightly.
                    </p>
                    <p className="mt-5 text-right">
                        <span className="font-[family-name:var(--font-great-vibes)] text-2xl bg-gradient-to-r from-pink-400 to-violet-400 bg-clip-text text-transparent">— Bapi</span>
                    </p>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="w-6 h-6 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
                    </div>
                ) : contributors.filter(s => !TEAM_NAMES.includes(s.name?.toLowerCase())).length > 0 ? (
                    <div className="max-h-48 overflow-y-auto pr-2 space-y-2">
                        {contributors.filter(s => !TEAM_NAMES.includes(s.name?.toLowerCase())).map((student, i) => (
                            <div
                                key={i}
                                className="flex items-center gap-3 p-2.5 bg-white/[0.04] rounded-lg border border-white/[0.06]"
                            >
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500/30 to-violet-500/30 border border-white/20 flex items-center justify-center text-sm font-medium">
                                    {student.name?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                                <p className="text-sm font-medium">{student.name}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-white/40 py-4">No contributors yet. Register students to see them here!</p>
                )}
            </div>

            {/* Footer */}
            <div className="text-center space-y-1 pt-4">
                <p className="text-[11px] text-white/40 tracking-widest uppercase font-medium">Built for Hackathon 2026</p>
                <p className="text-[10px] text-white/25 tracking-wide">© Team AttendX</p>
            </div>
        </div>
    );
}
