
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { GLASS_STYLES } from '../lib/styles';
import API_BASE_URL from '../lib/api';
import { TechIcons, FeatureIcons, TEAM, TEAM_NAMES, TECH_STACK } from '../lib/about-assets';

export default function AboutTab() {
    const [contributors, setContributors] = useState([]);
    const [loading, setLoading] = useState(true);

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

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h2 className="font-[family-name:var(--font-great-vibes)] text-4xl mb-2 bg-gradient-to-r from-violet-600 via-cyan-600 to-emerald-600 bg-clip-text text-transparent drop-shadow-sm">
                    Built Different
                </h2>
                <p className="text-slate-400 text-sm mb-6 tracking-widest italic font-medium">the technology behind the magic ✨</p>

                <div className="relative py-4">
                    <div className="flex items-center justify-between gap-2">

                        <div className="flex flex-col items-center gap-2">
                            <div className="w-14 h-14 rounded-xl bg-violet-50/50 border border-violet-200/50 flex items-center justify-center shadow-[inset_0_2px_5px_rgba(139,92,246,0.15),0_1px_1px_rgba(255,255,255,1)]">
                                <svg viewBox="0 0 24 24" className="w-6 h-6 stroke-violet-600 fill-none drop-shadow-sm" strokeWidth="2">
                                    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                                    <circle cx="12" cy="13" r="4" />
                                </svg>
                            </div>
                            <span className="text-xs text-slate-500 font-bold uppercase tracking-wide">Capture</span>
                        </div>

                        <div className="flex-1 h-0.5 bg-gradient-to-r from-violet-300 to-cyan-300 relative rounded-full">
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rotate-45 border-t-2 border-r-2 border-cyan-400" />
                        </div>

                        <div className="flex flex-col items-center gap-2">
                            <div className="w-14 h-14 rounded-xl bg-cyan-50/50 border border-cyan-200/50 flex items-center justify-center shadow-[inset_0_2px_5px_rgba(6,182,212,0.15),0_1px_1px_rgba(255,255,255,1)]">
                                <svg viewBox="0 0 24 24" className="w-6 h-6 stroke-cyan-600 fill-none drop-shadow-sm" strokeWidth="2">
                                    <circle cx="12" cy="10" r="6" />
                                    <path d="M12 16v4M8 22h8" />
                                    <circle cx="10" cy="9" r="1" fill="currentColor" />
                                    <circle cx="14" cy="9" r="1" fill="currentColor" />
                                </svg>
                            </div>
                            <span className="text-xs text-slate-500 font-bold uppercase tracking-wide">Detect</span>
                        </div>

                        <div className="flex-1 h-0.5 bg-gradient-to-r from-cyan-300 to-amber-300 relative rounded-full">
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rotate-45 border-t-2 border-r-2 border-amber-400" />
                        </div>

                        <div className="flex flex-col items-center gap-2">
                            <div className="w-14 h-14 rounded-xl bg-amber-50/50 border border-amber-200/50 flex items-center justify-center shadow-[inset_0_2px_5px_rgba(245,158,11,0.15),0_1px_1px_rgba(255,255,255,1)]">
                                <svg viewBox="0 0 24 24" className="w-6 h-6 stroke-amber-600 fill-none drop-shadow-sm" strokeWidth="2">
                                    <path d="M12 2a4 4 0 014 4v2a4 4 0 01-8 0V6a4 4 0 014-4z" />
                                    <path d="M6 10v1a6 6 0 0012 0v-1" />
                                    <path d="M12 17v4M8 21h8" />
                                </svg>
                            </div>
                            <span className="text-xs text-slate-500 font-bold uppercase tracking-wide">Recognize</span>
                        </div>

                        <div className="flex-1 h-0.5 bg-gradient-to-r from-amber-300 to-emerald-300 relative rounded-full">
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rotate-45 border-t-2 border-r-2 border-emerald-400" />
                        </div>

                        <div className="flex flex-col items-center gap-2">
                            <div className="w-14 h-14 rounded-xl bg-emerald-50/50 border border-emerald-200/50 flex items-center justify-center shadow-[inset_0_2px_5px_rgba(16,185,129,0.15),0_1px_1px_rgba(255,255,255,1)]">
                                <svg viewBox="0 0 24 24" className="w-6 h-6 stroke-emerald-600 fill-none drop-shadow-sm" strokeWidth="2.5">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            </div>
                            <span className="text-xs text-slate-500 font-bold uppercase tracking-wide">Logged</span>
                        </div>
                    </div>
                </div>

                <div className="mt-4 p-5 bg-slate-50 rounded-xl border border-slate-200 shadow-[inset_0_2px_4px_rgba(0,0,0,0.03),0_1px_1px_rgba(255,255,255,1)]">
                    <p className="text-[13px] text-slate-600 text-center leading-relaxed tracking-wide">
                        Powered by <span className="font-semibold text-amber-600">state-of-the-art ArcFace</span> neural networks, <span className="font-semibold text-orange-600">industry-grade Firebase</span> infrastructure & <span className="font-semibold text-cyan-600">sub-second</span> processing - AttendX doesn't just take attendance, it <span className="bg-gradient-to-r from-violet-600 to-pink-600 bg-clip-text text-transparent font-bold">redefines</span> it.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2 mt-6">
                    {TECH_STACK.map((tech, i) => (
                        <div
                            key={i}
                            className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 border border-slate-200 text-slate-700 shadow-[inset_0_2px_4px_rgba(0,0,0,0.04),0_1px_1px_rgba(255,255,255,1)] rounded-lg hover:bg-slate-50 transition-colors"
                        >
                            {TechIcons[tech.icon]}
                            <span className="text-sm font-bold">{tech.name}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 shadow-sm p-5 text-center rounded-2xl">
                    <div className="flex justify-center mb-4">
                        <div className="w-12 h-12 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-slate-500 shadow-[inset_0_2px_5px_rgba(0,0,0,0.06),0_1px_1px_rgba(255,255,255,1)]">{FeatureIcons.accuracy}</div>
                    </div>
                    <div className="text-3xl font-black tracking-tighter text-violet-600 drop-shadow-sm">98.7%</div>
                    <div className="text-[11px] text-slate-400 mt-1.5 uppercase tracking-widest font-bold">Accuracy</div>
                    <div className="text-[10px] text-slate-400/80 mt-1 italic tracking-wide">Near-perfect, always</div>
                </div>
                <div className="bg-white border border-slate-200 shadow-sm p-5 text-center rounded-2xl">
                    <div className="flex justify-center mb-4">
                        <div className="w-12 h-12 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-slate-500 shadow-[inset_0_2px_5px_rgba(0,0,0,0.06),0_1px_1px_rgba(255,255,255,1)]">{FeatureIcons.response}</div>
                    </div>
                    <div className="text-3xl font-black tracking-tighter text-cyan-600 drop-shadow-sm">&lt;1s</div>
                    <div className="text-[11px] text-slate-400 mt-1.5 uppercase tracking-widest font-bold">Response</div>
                    <div className="text-[10px] text-slate-400/80 mt-1 italic tracking-wide">Blink and it's done</div>
                </div>
                <div className="bg-white border border-slate-200 shadow-sm p-5 text-center rounded-2xl">
                    <div className="flex justify-center mb-4">
                        <div className="w-12 h-12 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-slate-500 shadow-[inset_0_2px_5px_rgba(0,0,0,0.06),0_1px_1px_rgba(255,255,255,1)]">{FeatureIcons.multiface}</div>
                    </div>
                    <div className="text-3xl font-black tracking-tighter text-amber-500 drop-shadow-sm">Multi</div>
                    <div className="text-[11px] text-slate-400 mt-1.5 uppercase tracking-widest font-bold">Face Detection</div>
                    <div className="text-[10px] text-slate-400/80 mt-1 italic tracking-wide">One frame, unlimited</div>
                </div>
                <div className="bg-white border border-slate-200 shadow-sm p-5 text-center rounded-2xl">
                    <div className="flex justify-center mb-4">
                        <div className="w-12 h-12 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-slate-500 shadow-[inset_0_2px_5px_rgba(0,0,0,0.06),0_1px_1px_rgba(255,255,255,1)]">{FeatureIcons.sync}</div>
                    </div>
                    <div className="text-3xl font-black tracking-tighter text-emerald-600 drop-shadow-sm">Real-time</div>
                    <div className="text-[11px] text-slate-400 mt-1.5 uppercase tracking-widest font-bold">Sync</div>
                    <div className="text-[10px] text-slate-400/80 mt-1 italic tracking-wide">Instant, everywhere</div>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2 tracking-tight">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current text-slate-700 fill-none" strokeWidth="1.5">
                        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                    </svg>
                    <span className="bg-gradient-to-r from-violet-600 to-cyan-600 bg-clip-text text-transparent drop-shadow-sm">Team AttendX</span>
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {TEAM.map((member, i) => (
                        <div key={i} className="flex flex-col items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 shadow-[inset_0_2px_4px_rgba(0,0,0,0.03),0_1px_1px_rgba(255,255,255,1)]">
                            <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-[inset_0_2px_5px_rgba(0,0,0,0.1),0_2px_4px_rgba(0,0,0,0.05)]">
                                <Image
                                    src={member.photo}
                                    alt={member.name}
                                    fill
                                    className="object-cover"
                                    sizes="64px"
                                    style={{ objectPosition: member.pos }}
                                />
                            </div>
                            <div className="text-center mt-1">
                                <p className="text-sm font-bold text-slate-700">{member.name}</p>
                                <p className="text-xs font-semibold text-slate-400">{member.role}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h2 className="text-lg font-bold mb-3 flex items-center gap-2 tracking-tight">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-pink-500 fill-pink-500/20" strokeWidth="1.5">
                        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                    </svg>
                    <span className="bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent drop-shadow-sm">To Our Contributors</span>
                    <span className="ml-auto text-[10px] text-slate-400 font-bold uppercase tracking-widest">{contributors.filter(s => !TEAM_NAMES.includes(s.name?.toLowerCase())).length} people</span>
                </h2>

                <div className="mb-4 p-5 bg-slate-50 rounded-xl border border-slate-200 shadow-[inset_0_2px_4px_rgba(0,0,0,0.03),0_1px_1px_rgba(255,255,255,1)]">
                    <p className="text-[13px] text-slate-600 leading-[1.8] tracking-wide font-medium">
                        <span className="font-bold text-pink-500 text-sm">This project breathes because of you.</span>
                        <br /><br />
                        Every photo you shared, every idea you contributed, and every moment you trusted us with your privacy - all came together to bring <span className="font-bold text-slate-700">AttendX</span> to life.
                        <br /><br />
                        In a world where privacy is precious, you chose to share yours with us. That's not just contribution - that's <span className="font-bold bg-gradient-to-r from-violet-500 to-pink-500 bg-clip-text text-transparent drop-shadow-sm">trust</span>. And we don't take it lightly.
                    </p>
                    <p className="mt-5 text-right">
                        <span className="font-[family-name:var(--font-great-vibes)] text-2xl bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent pr-2 drop-shadow-sm">— Bapi</span>
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
                                className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-lg border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                            >
                                <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 shadow-[inset_0_2px_5px_rgba(0,0,0,0.06),0_1px_1px_rgba(255,255,255,1)] flex items-center justify-center text-sm font-extrabold text-slate-700">
                                    {student.name?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                                <p className="text-sm font-bold text-slate-700">{student.name}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-slate-400 font-medium py-4">No contributors yet. Register students to see them here!</p>
                )}
            </div>

            <div className="text-center space-y-1 pt-4 pb-4">
                <p className="text-[11px] text-slate-400 tracking-widest uppercase font-bold">Built for Hackathon 2026</p>
                <p className="text-[10px] text-slate-400/60 font-semibold tracking-wide">© Team AttendX</p>
            </div>
        </div>
    );
}
