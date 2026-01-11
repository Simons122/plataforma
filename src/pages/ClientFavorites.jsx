import React, { useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, getDocs, query, collection, where, documentId } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import { Heart, Star, MapPin, ArrowRight, Loader2 } from 'lucide-react';
import Layout from '../components/Layout';

export default function ClientFavorites() {
    const [loading, setLoading] = useState(true);
    const [favorites, setFavorites] = useState([]);
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
            if (currentUser) {
                // Verificar se é cliente
                const clientDoc = await getDoc(doc(db, 'clients', currentUser.uid));

                if (!clientDoc.exists()) {
                    navigate('/client/auth');
                    return;
                }

                setUser(currentUser);
                const clientData = clientDoc.data();

                if (clientData.favorites && clientData.favorites.length > 0) {
                    await loadFavorites(clientData.favorites);
                } else {
                    setFavorites([]); // Sem favoritos
                    setLoading(false);
                }
            } else {
                navigate('/client/auth');
            }
        });

        return () => unsubscribe();
    }, [navigate]);

    const loadFavorites = async (favoriteIds) => {
        try {
            // Firestore 'in' query supports up to 10 items. If more, need to batch or individual fetch.
            // For simplicity, assuming < 10 favorites for now or doing distinct fetches if needed.
            // But 'documentId()' with 'in' works well.

            const chunks = [];
            for (let i = 0; i < favoriteIds.length; i += 10) {
                chunks.push(favoriteIds.slice(i, i + 10));
            }

            let loadedFavorites = [];

            for (const chunk of chunks) {
                const q = query(collection(db, 'professionals'), where(documentId(), 'in', chunk));
                const snap = await getDocs(q);
                snap.forEach(doc => {
                    loadedFavorites.push({ id: doc.id, ...doc.data() });
                });
            }

            setFavorites(loadedFavorites);
        } catch (error) {
            console.error('Erro ao carregar favoritos:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <Layout role="client" brandName={user?.displayName || user?.email?.split('@')[0]}>
            <div style={{ paddingBottom: '2rem' }}>
                <h1 style={{
                    fontSize: '1.75rem',
                    fontWeight: 800,
                    color: 'var(--text-primary)',
                    marginBottom: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                }}>
                    <Heart style={{ color: 'var(--accent-danger)' }} fill="currentColor" />
                    Meus Favoritos
                </h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                    Acesse rapidamente aos seus profissionais preferidos.
                </p>

                {favorites.length > 0 ? (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                        gap: '1.5rem'
                    }}>
                        {favorites.map(pro => (
                            <div key={pro.id} style={{
                                background: 'var(--bg-card)',
                                borderRadius: '16px',
                                border: '1px solid var(--border-default)',
                                overflow: 'hidden',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                cursor: 'default'
                            }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-4px)';
                                    e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            >
                                {/* Cover Area (using gradient if no cover image) */}
                                <div style={{
                                    height: '100px',
                                    background: 'linear-gradient(135deg, var(--bg-secondary), var(--bg-elevated))',
                                    position: 'relative'
                                }}>
                                    {/* Logo overlapping */}
                                    <div style={{
                                        position: 'absolute',
                                        bottom: '-32px',
                                        left: '1.5rem',
                                        width: '64px',
                                        height: '64px',
                                        borderRadius: '50%',
                                        border: '4px solid var(--bg-card)',
                                        background: 'var(--bg-card)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        {pro.logoUrl ? (
                                            <img src={pro.logoUrl} alt={pro.businessName} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                        ) : (
                                            <div style={{
                                                width: '100%', height: '100%', borderRadius: '50%',
                                                background: 'linear-gradient(135deg, var(--accent-primary), #60a5fa)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: 'white', fontWeight: 700, fontSize: '1.5rem'
                                            }}>
                                                {(pro.businessName || pro.name).charAt(0)}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div style={{ padding: '2.5rem 1.5rem 1.5rem' }}>
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                                        {pro.businessName}
                                    </h3>
                                    <p style={{ color: 'var(--accent-primary)', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                                        {pro.profession || 'Profissional'}
                                    </p>

                                    {pro.address && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                                            <MapPin size={14} />
                                            {pro.address}
                                        </div>
                                    )}

                                    <Link
                                        to={`/book/${pro.slug}`}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '0.5rem',
                                            width: '100%',
                                            padding: '0.75rem',
                                            background: 'var(--accent-primary)',
                                            color: 'white',
                                            textDecoration: 'none',
                                            fontWeight: 600,
                                            borderRadius: '10px',
                                            transition: 'background 0.2s'
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.background = 'var(--accent-primary-hover)'}
                                        onMouseOut={(e) => e.currentTarget.style.background = 'var(--accent-primary)'}
                                    >
                                        Marcar Agora
                                        <ArrowRight size={16} />
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{
                        background: 'var(--bg-card)',
                        borderRadius: '20px',
                        padding: '4rem 2rem',
                        textAlign: 'center',
                        border: '1px solid var(--border-default)'
                    }}>
                        <Heart size={64} style={{ color: 'var(--text-muted)', margin: '0 auto 1.5rem' }} />
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                            Sem Favoritos
                        </h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                            Você ainda não adicionou nenhum profissional aos favoritos.
                        </p>
                    </div>
                )}
            </div>
        </Layout>
    );
}
