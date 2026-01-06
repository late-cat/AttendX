
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { GLASS_STYLES } from '../lib/styles';
import API_BASE_URL from '../lib/api';
import { TechIcons, FeatureIcons, TEAM, TEAM_NAMES, TECH_STACK } from '../lib/about-assets';

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
                            <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-white/20">
                                <Image
                                    src={member.photo}
                                    alt={member.name}
                                    fill
                                    className="object-cover"
                                    sizes="64px"
                                    style={{ objectPosition: member.pos }}
                                />
                            </div>
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
