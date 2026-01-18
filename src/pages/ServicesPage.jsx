import React, { useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import Layout from '../components/Layout';
import ServiceManager from '../components/ServiceManager';
import { useLanguage } from '../i18n';

export default function ServicesPage() {
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState(null);
    const { t } = useLanguage();

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user) {
                const docRef = doc(db, "professionals", user.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setProfile({ id: user.uid, ...docSnap.data() });
                }
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    if (loading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-primary)'
            }}>
                <div className="spinner"></div>
            </div>
        );
    }

    if (!profile) {
        return null;
    }

    return (
        <Layout role={profile.role || 'professional'}>
            <div style={{ marginBottom: '1.5rem' }}>
                <h1 style={{ fontSize: '1.375rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--text-primary)' }}>
                    {t?.services?.title || 'Services'}
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    {t?.services?.manageDescription || 'Manage the services you offer to your clients.'}
                </p>
            </div>
            <ServiceManager userId={profile.id} />
        </Layout>
    );
}
