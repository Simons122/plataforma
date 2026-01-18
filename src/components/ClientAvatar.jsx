import React, { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function ClientAvatar({ uid, alt, size = '80px', debug = false }) {
    const [photoUrl, setPhotoUrl] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!uid) return;

        console.log("ClientAvatar mounting for:", uid);
        const unsub = onSnapshot(doc(db, "clients", uid), (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                // Tenta todos os campos possíveis
                const url = data.photoURL || data.logoUrl || data.photoUrl;
                console.log("ClientAvatar found photo:", url ? "YES (length " + url.length + ")" : "NO");
                setPhotoUrl(url);
            } else {
                console.log("ClientAvatar: doc not found");
            }
            setLoading(false);
        }, (error) => {
            console.error("ClientAvatar Error:", error);
            setLoading(false);
        });

        return () => unsub();
    }, [uid]);

    if (loading) return <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--bg-elevated)' }} />;

    if (photoUrl) {
        return (
            <img
                src={photoUrl}
                alt={alt}
                style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    background: 'var(--bg-card)'
                }}
            />
        );
    }

    // Fallback (Inicial)
    return (
        <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 700,
            fontSize: `calc(${size} / 2.5)`
        }}>
            {alt.charAt(0).toUpperCase()}
        </div>
    );
}
