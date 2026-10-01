import { useState, useEffect } from 'react';
import API_BASE_URL, { authenticatedFetch } from '../lib/api';
import { UserPlusIcon, CheckIcon, UsersIcon } from '../lib/icons';

export default function TeacherManagementTab({ onDataChange }) {
    const [teacherName, setTeacherName] = useState('');
    const [teacherDepartment, setTeacherDepartment] = useState('');
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [isRegistering, setIsRegistering] = useState(false);
    const [message, setMessage] = useState('');

    const [teachers, setTeachers] = useState([]);
    const [loadingTeachers, setLoadingTeachers] = useState(true);
    const [deletingTeacher, setDeletingTeacher] = useState(null);
    const [hasFetched, setHasFetched] = useState(false);

    useEffect(() => {
        if (!hasFetched) {
            fetchTeachers();
        }
    }, [hasFetched]);

    const fetchTeachers = async (forceRefresh = false) => {
        if (hasFetched && !forceRefresh && teachers.length > 0) {
            setLoadingTeachers(false);
            return;
        }

        setLoadingTeachers(true);
        try {
            const res = await fetch(`${API_BASE_URL}/teachers`);
            if (res.ok) {
                const data = await res.json();
                setTeachers(data.teachers || []);
                setHasFetched(true);
            }
        } catch (e) {
            console.error("Failed to fetch teachers:", e);
        } finally {
            setLoadingTeachers(false);
        }
    };

    const handleFileChange = (e) => {
        setSelectedFiles(Array.from(e.target.files));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!teacherName || selectedFiles.length === 0) {
            setMessage('Please provide name and at least one image');
            return;
        }

        setIsRegistering(true);
        setMessage('Registering teacher...');

        try {
            const formData = new FormData();
            formData.append('name', teacherName);
            formData.append('department', teacherDepartment);
            selectedFiles.forEach(file => formData.append('files', file));

            const res = await authenticatedFetch('/register-teacher', {
                method: 'POST',
                body: formData
            });

            const data = await res.json();

            if (!res.ok) {
                setMessage(data.detail || 'Registration failed');
                return;
            }

            setMessage(data.message);
            setTeacherName('');
            setTeacherDepartment('');
            setSelectedFiles([]);

            fetchTeachers(true);
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

        setDeletingTeacher(name);

        try {
            const res = await authenticatedFetch(`/delete-teacher/${encodeURIComponent(name)}`, {
                method: 'DELETE'
            });

            if (!res.ok) throw new Error('Delete failed');

            const data = await res.json();
            setMessage(data.message);

            setTeachers(prev => prev.filter(t => t.name !== name));
            if (onDataChange) onDataChange();
        } catch (e) {
            setMessage('Delete failed. Check console for details.');
            console.error(e);
        } finally {
            setDeletingTeacher(null);
        }
    };

    return (
        <div className="flex flex-col gap-8 animate-in">

            <div className="glass-panel p-8 max-w-2xl mx-auto w-full">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-700 shadow-sm">
                        <UserPlusIcon />
                    </div>
                    <h2 className="m-0">Register New Teacher</h2>
                </div>
                <p className="text-secondary mb-8">Add teacher photos to enable face recognition check-in</p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                    <div>
                        <label className="block text-sm font-bold mb-2 text-slate-700">Teacher Name</label>
                        <input
                            type="text"
                            value={teacherName}
                            onChange={(e) => setTeacherName(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 focus:outline-none focus:border-slate-400 shadow-sm placeholder:text-slate-400"
                            placeholder="Enter full name"
                            required
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-bold mb-2 text-slate-700">Department / Role</label>
                        <input
                            type="text"
                            value={teacherDepartment}
                            onChange={(e) => setTeacherDepartment(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 focus:outline-none focus:border-slate-400 shadow-sm placeholder:text-slate-400"
                            placeholder="e.g. Mathematics"
                            required
                        />
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
                        {isRegistering ? 'Processing...' : <><span className="flex items-center gap-2"><CheckIcon size="sm" /> Register Teacher</span></>}
                    </button>

                    {message && (
                        <div className="p-4 bg-white/5 rounded-lg border border-glass-border text-center">
                            <p className="font-medium">{message}</p>
                        </div>
                    )}
                </form>
            </div>

            <div className="glass-panel p-8 max-w-2xl mx-auto w-full">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-700 shadow-sm">
                            <UsersIcon size="lg" strokeColor="currentColor" />
                        </div>
                        <h2 className="m-0">Registered Teachers</h2>
                    </div>
                    <span className="text-sm text-secondary">{teachers.length} total</span>
                </div>

                {loadingTeachers ? (
                    <div className="text-secondary text-sm">Loading...</div>
                ) : teachers.length === 0 ? (
                    <div className="text-center py-8 border border-dashed border-glass-border rounded-lg bg-white/5">
                        <p className="text-secondary">No teachers registered yet.</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {teachers.map((teacher) => (
                            <div
                                key={teacher.name}
                                className="student-liquid-card liquid-green"
                                style={{ '--fill-percent': `100%` }}
                            >
                                <div className="student-card-content">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className="w-10 h-10 rounded-full bg-[var(--color-cotton-lavender)] border border-slate-200/50 flex items-center justify-center text-sm font-bold text-slate-700 flex-shrink-0">
                                            {teacher.name?.[0]?.toUpperCase() || '?'}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-bold text-slate-800 truncate">{teacher.name}</p>
                                            <p className="text-xs text-slate-500">
                                                {teacher.image_count} photos • {teacher.department || 'No Dept'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <button
                                            onClick={() => handleDelete(teacher.name)}
                                            disabled={deletingTeacher === teacher.name}
                                            className="glass-delete-btn disabled:opacity-50"
                                            title="Delete teacher"
                                        >
                                            {deletingTeacher === teacher.name ? (
                                                <span className="text-xs">...</span>
                                            ) : (
                                                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-red-400">
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
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
