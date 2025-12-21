
'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                // Optional: Check strict allowlist here if needed
                // const userDoc = await getDoc(doc(db, 'authorized_users', currentUser.email));
                // if (userDoc.exists()) { setUser(currentUser); } else { await signOut(auth); }
                setUser(currentUser);
            } else {
                setUser(null);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const login = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (e) {
            console.error("Login Failed", e);
        }
    };

    const logout = () => signOut(auth);

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
