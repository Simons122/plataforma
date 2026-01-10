import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function ProtectedRoute({ children, roleRequired }) {
    const [user, setUser] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                try {
                    const docRef = doc(db, "professionals", currentUser.uid);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        setUserRole(docSnap.data().role || 'professional');
                    } else {
                        // Fallback if doc doesn't exist yet but user is auth'd
                        setUserRole('professional');
                    }
                } catch (e) {
                    console.error("Auth check error", e);
                }
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0a0c]">
                <div className="spinner w-8 h-8 border-indigo-500 border-t-transparent"></div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/auth" replace />;
    }

    if (roleRequired && userRole !== roleRequired && userRole !== 'admin') {
        // Admin can access everything, otherwise strict check
        // If user tries to access admin route but is just pro:
        return <Navigate to="/dashboard" replace />;
    }

    return children;
}
