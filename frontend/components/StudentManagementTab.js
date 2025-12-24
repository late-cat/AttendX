import { useState, useEffect } from 'react';
import API_BASE_URL from '../lib/api';
import {
    UserPlusIcon, CheckIcon, UsersIcon, AlertIcon, TrashIcon
} from '../lib/icons';

export default function StudentManagementTab() {
    const [studentName, setStudentName] = useState('');
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [isRegistering, setIsRegistering] = useState(false);
    const [message, setMessage] = useState('');

    // New: Student list state
    const [students, setStudents] = useState([]);
    const [loadingStudents, setLoadingStudents] = useState(true);
    const [deletingStudent, setDeletingStudent] = useState(null);

    // Fetch students on mount
    useEffect(() => {
        fetchStudents();
    }, []);

    const fetchStudents = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/students`);
            if (res.ok) {
                const data = await res.json();
                setStudents(data.students || []);
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
            selectedFiles.forEach(file => formData.append('files', file));

            const res = await fetch(`${API_BASE_URL}/register-student`, {
                method: 'POST',
                body: formData
            });

            if (!res.ok) throw new Error('Registration failed');

            const data = await res.json();
            setMessage(data.message);
            setStudentName('');
            setSelectedFiles([]);

            // Refresh student list
            fetchStudents();
        } catch (e) {
            setMessage('Registration failed. Check console for details.');
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
            const res = await fetch(`${API_BASE_URL}/delete-student/${encodeURIComponent(name)}`, {
                method: 'DELETE'
            });

            if (!res.ok) throw new Error('Delete failed');

            const data = await res.json();
            setMessage(data.message);

            // Remove from local state
            setStudents(prev => prev.filter(s => s.name !== name));
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
                    <div className="w-10 h-10 bg-white/[0.12] border border-white/[0.15] rounded-[12px] flex items-center justify-center" style={{ boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.2)' }}>
                        <UserPlusIcon />
                    </div>
                    <h2 className="m-0">Register New Student</h2>
                </div>
                <p className="text-secondary mb-8">Add student photos to enable face recognition</p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                    <div>
                        <label className="block text-sm font-medium mb-2">Student Name</label>
                        <input
                            type="text"
                            value={studentName}
                            onChange={(e) => setStudentName(e.target.value)}
                            className="w-full bg-white/5 border border-glass-border rounded px-4 py-3 focus:outline-none focus:border-blue-500"
                            placeholder="Enter full name"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Upload Photos (3-5 recommended)</label>
                        <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handleFileChange}
                            className="w-full bg-white/[0.08] border border-white/[0.15] rounded-lg px-4 py-3 text-white/70 file:mr-4 file:py-2.5 file:px-5 file:rounded-lg file:border file:border-white/[0.25] file:bg-white/[0.12] file:text-white file:font-medium file:cursor-pointer hover:file:bg-white/[0.18] file:transition-colors file:shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]"
                            style={{ boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.1), 0 2px 8px rgba(0,0,0,0.15)', backdropFilter: 'blur(12px)' }}
                            required
                        />
                        {selectedFiles.length > 0 && (
                            <p className="text-sm text-secondary mt-2">{selectedFiles.length} file(s) selected</p>
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
                        <div className="w-9 h-9 bg-white/[0.12] border border-white/[0.12] rounded-[11px] flex items-center justify-center" style={{ boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.2)' }}>
                            <UsersIcon size="lg" strokeColor="white" />
                        </div>
                        <h2 className="m-0">Registered Students</h2>
                    </div>
                    <span className="text-sm text-secondary">{students.length} total</span>
                </div>

                {loadingStudents ? (
                    <div className="text-center py-8 text-secondary">Loading students...</div>
                ) : students.length === 0 ? (
                    <div className="text-center py-8 border border-dashed border-glass-border rounded-lg bg-white/5">
                        <p className="text-secondary">No students registered yet.</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {students.map((student) => (
                            <div
                                key={student.name}
                                className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-glass-border hover:bg-white/10 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-sm font-bold">
                                        {student.name?.[0]?.toUpperCase() || '?'}
                                    </div>
                                    <div>
                                        <p className="font-medium">{student.name}</p>
                                        <p className="text-xs text-secondary">
                                            {student.image_count} photos • {student.has_embedding ? <span className="inline-flex items-center gap-1 text-green-400"><CheckIcon size="sm" /> Ready</span> : <span className="inline-flex items-center gap-1 text-yellow-400"><AlertIcon /> No embedding</span>}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(student.name)}
                                    disabled={deletingStudent === student.name}
                                    className="px-3 py-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-colors text-sm font-medium disabled:opacity-50"
                                >
                                    {deletingStudent === student.name ? 'Deleting...' : <span className="flex items-center gap-1.5"><TrashIcon /> Delete</span>}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
