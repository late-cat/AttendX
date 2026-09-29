import { useState, useEffect } from 'react';
import API_BASE_URL, { authenticatedFetch } from '../lib/api';
import {
    UserPlusIcon, CheckIcon, UsersIcon, AlertIcon, TrashIcon
} from '../lib/icons';

export default function StudentManagementTab({ onDataChange }) {
    const [studentName, setStudentName] = useState('');
    const [studentClass, setStudentClass] = useState('');
    const [studentSection, setStudentSection] = useState('');
    const [studentRoll, setStudentRoll] = useState('');
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [isRegistering, setIsRegistering] = useState(false);
    const [message, setMessage] = useState('');

    // New: Student list state
    const [students, setStudents] = useState([]);
    const [loadingStudents, setLoadingStudents] = useState(true);
    const [deletingStudent, setDeletingStudent] = useState(null);
    const [hasFetched, setHasFetched] = useState(false);

    // Fetch students on mount (only if not already fetched)
    useEffect(() => {
        if (!hasFetched) {
            fetchStudents();
        }
    }, [hasFetched]);

    const fetchStudents = async (forceRefresh = false) => {
        // Skip if already loaded and not forcing refresh
        if (hasFetched && !forceRefresh && students.length > 0) {
            setLoadingStudents(false);
            return;
        }

        setLoadingStudents(true);
        try {
            const res = await fetch(`${API_BASE_URL}/students/with-attendance`);
            if (res.ok) {
                const data = await res.json();
                setStudents(data.students || []);
                setHasFetched(true);
            }
        } catch (e) {
            console.error("Failed to fetch students:", e);
        } finally {
            setLoadingStudents(false);
        }
    };

    const handleFileChange = (e) => {
        setSelectedFiles(Array.from(e.target.files));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!studentName || selectedFiles.length === 0) {
            setMessage('Please provide name and at least one image');
            return;
        }

        setIsRegistering(true);
        setMessage('Registering student...');

        try {
            const formData = new FormData();
            formData.append('name', studentName);
            formData.append('class_name', studentClass);
            formData.append('section', studentSection);
            formData.append('roll_number', studentRoll);
            selectedFiles.forEach(file => formData.append('files', file));

            const res = await authenticatedFetch('/register-student', {
                method: 'POST',
                body: formData
            });

            const data = await res.json();

            if (!res.ok) {
                setMessage(data.detail || 'Registration failed');
                return;
            }

            setMessage(data.message);
            setStudentName('');
            setStudentClass('');
            setStudentSection('');
            setStudentRoll('');
            setSelectedFiles([]);

            // Refresh student list and notify parent
            fetchStudents(true);
            if (onDataChange) onDataChange();
        } catch (e) {
            setMessage('Registration failed. Network error or server offline.');
            console.error(e);
        } finally {
            setIsRegistering(false);
        }
    };


    const handleDelete = async (name) => {
        if (!confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`)) {
            return;
        }

        setDeletingStudent(name);

        try {
            const res = await authenticatedFetch(`/delete-student/${encodeURIComponent(name)}`, {
                method: 'DELETE'
            });

            if (!res.ok) throw new Error('Delete failed');

            const data = await res.json();
            setMessage(data.message);

            // Remove from local state and notify parent
            setStudents(prev => prev.filter(s => s.name !== name));
            if (onDataChange) onDataChange();
        } catch (e) {
            setMessage('Delete failed. Check console for details.');
            console.error(e);
        } finally {
            setDeletingStudent(null);
        }
    };

    return (
        <div className="flex flex-col gap-8 animate-in">
            {/* Register New Student */}
            <div className="glass-panel p-8 max-w-2xl mx-auto w-full">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-700 shadow-sm">
                        <UserPlusIcon />
                    </div>
                    <h2 className="m-0">Register New Student</h2>
                </div>
                <p className="text-secondary mb-8">Add student photos to enable face recognition</p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                    <div>
                        <label className="block text-sm font-bold mb-2 text-slate-700">Student Name</label>
                        <input
                            type="text"
                            value={studentName}
                            onChange={(e) => setStudentName(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 focus:outline-none focus:border-slate-400 shadow-sm placeholder:text-slate-400"
                            placeholder="Enter full name"
                            required
                        />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-bold mb-2 text-slate-700">Class</label>
                            <div className="relative">
                                <select
                                    value={studentClass}
                                    onChange={(e) => setStudentClass(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 pr-10 text-slate-800 focus:outline-none focus:border-slate-400 shadow-sm appearance-none cursor-pointer"
                                    required
                                >
                                    <option value="" disabled>Select</option>
                                    {[5, 6, 7, 8, 9, 10, 11, 12].map(c => (
                                        <option key={c} value={String(c)}>Class {c}</option>
                                    ))}
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-2 text-slate-700">Section</label>
                            <div className="relative">
                                <select
                                    value={studentSection}
                                    onChange={(e) => setStudentSection(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 pr-10 text-slate-800 focus:outline-none focus:border-slate-400 shadow-sm appearance-none cursor-pointer"
                                    required
                                >
                                    <option value="" disabled>Select</option>
                                    {['A', 'B', 'C', 'D', 'E'].map(s => (
                                        <option key={s} value={s}>Section {s}</option>
                                    ))}
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-2 text-slate-700">Roll Number</label>
                            <input
                                type="text"
                                value={studentRoll}
                                onChange={(e) => setStudentRoll(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 focus:outline-none focus:border-slate-400 shadow-sm placeholder:text-slate-400"
                                placeholder="e.g. 12"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold mb-2 text-slate-700">Upload Photos (3-5 recommended)</label>
                        <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handleFileChange}
                            className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-slate-600 shadow-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-[var(--color-cotton-blue)] file:text-slate-700 file:font-bold file:cursor-pointer hover:file:bg-[var(--color-cotton-pink)] file:transition-colors file:text-sm"
                            required
                        />
                        {selectedFiles.length > 0 && (
                            <p className="text-sm text-slate-500 mt-2 font-medium">{selectedFiles.length} file(s) selected</p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={isRegistering}
                        className="btn btn-primary justify-center"
                    >
                        {isRegistering ? 'Processing...' : <><span className="flex items-center gap-2"><CheckIcon size="sm" /> Register Student</span></>}
                    </button>

                    {message && (
                        <div className="p-4 bg-white/5 rounded-lg border border-glass-border text-center">
                            <p className="font-medium">{message}</p>
                        </div>
                    )}
                </form>
            </div>

            {/* Registered Students List */}
            <div className="glass-panel p-8 max-w-2xl mx-auto w-full">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-700 shadow-sm">
                            <UsersIcon size="lg" strokeColor="currentColor" />
                        </div>
                        <h2 className="m-0">Registered Students</h2>
                    </div>
                    <span className="text-sm text-secondary">{students.length} total</span>
                </div>

                {loadingStudents ? (
                    <div className="flex flex-col gap-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="student-skeleton-card">
                                <div className="skeleton-avatar"></div>
                                <div className="skeleton-text-group">
                                    <div className="skeleton-text skeleton-name"></div>
                                    <div className="skeleton-text skeleton-detail"></div>
                                </div>
                                <div className="skeleton-badge"></div>
                            </div>
                        ))}
                    </div>
                ) : students.length === 0 ? (
                    <div className="text-center py-8 border border-dashed border-glass-border rounded-lg bg-white/5">
                        <p className="text-secondary">No students registered yet.</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {students.map((student) => {
                            const pct = student.attendance_pct || 0;
                            const colorClass = pct >= 75 ? 'liquid-green' : pct >= 50 ? 'liquid-yellow' : 'liquid-red';
                            return (
                                <div
                                    key={student.name}
                                    className={`student-liquid-card ${colorClass}`}
                                    style={{ '--fill-percent': `${pct}%` }}
                                >
                                    <div className="student-card-content">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div className="w-10 h-10 rounded-full bg-[var(--color-cotton-blue)] border border-slate-200/50 flex items-center justify-center text-sm font-bold text-slate-700 flex-shrink-0">
                                                {student.name?.[0]?.toUpperCase() || '?'}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="font-bold text-slate-800 truncate">{student.name}</p>
                                                <p className="text-xs text-slate-500">
                                                    Class {student.class_name || '?'} • Sec {student.section || '?'} • {student.image_count} photos • {student.has_embedding ? <span className="text-green-600 font-bold">✓ Ready</span> : <span className="text-amber-600 font-bold">⚠ No embedding</span>}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 shadow-sm">{pct}%</span>
                                            <button
                                                onClick={() => handleDelete(student.name)}
                                                disabled={deletingStudent === student.name}
                                                className="glass-delete-btn disabled:opacity-50"
                                                title="Delete student"
                                            >
                                                {deletingStudent === student.name ? (
                                                    <span className="text-xs">...</span>
                                                ) : (
                                                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="3 6 5 6 21 6"></polyline>
                                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                        <line x1="10" y1="11" x2="10" y2="17"></line>
                                                        <line x1="14" y1="11" x2="14" y2="17"></line>
                                                    </svg>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
