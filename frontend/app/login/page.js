
'use client';
import { useAuth } from '@/components/AuthContext';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const { user, login, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && user) {
            router.push('/');
        }
    }, [user, loading, router]);

    if (loading) return null;

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="glass-panel p-10 max-w-md w-full text-center relative overflow-hidden">
                {/* Decorative Background Glow */}
                <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

                <div className="mb-8 relative z-10">
                    <div className="mx-auto h-20 w-20 rounded-xl bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center text-3xl font-bold shadow-lg mb-4">
                        A
                    </div>
                    <h1>Welcome to AttendX</h1>
                    <p className="text-secondary mt-2">Secure AI Classroom Access</p>
                </div>

                <button
                    onClick={login}
                    className="w-full bg-white text-black font-bold py-4 rounded-xl flex items-center justify-center gap-3 hover:scale-[1.02] transition-transform shadow-xl relative z-10"
                >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="Google" />
                    Sign in with Google
                </button>

                <p className="text-xs text-secondary mt-8 opacity-50 relative z-10">
                    Authorized Personnel Only
                </p>
            </div>
        </div>
    );
}
