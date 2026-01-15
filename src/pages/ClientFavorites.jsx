import React, { useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, getDocs, query, collection, where, documentId, updateDoc, arrayRemove } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import { Heart, Star, MapPin, ArrowRight, Loader2, Info, Check } from 'lucide-react';
import Layout from '../components/Layout';
import { useLanguage } from '../i18n';

export default function ClientFavorites() {
    const { t } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [favorites, setFavorites] = useState([]);
    const [user, setUser] = useState(null);
    const [toast, setToast] = useState(null);
    const navigate = useNavigate();

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const removeFavorite = async (proId) => {
        if (!user) return;
        try {
            const clientRef = doc(db, 'clients', user.uid);
            await updateDoc(clientRef, { favorites: arrayRemove(proId) });

            // Update local state immediately
            setFavorites(prev => prev.filter(p => p.id !== proId));
            showToast(t('clientFavorites.removedMsg', 'Removido dos favoritos'), 'info');
        } catch (error) {
            console.error("Erro ao remover favorito:", error);
            showToast(t('clientFavorites.errorMsg', 'Erro ao remover'), 'error');
        }
    };

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
            if (!favoriteIds || favoriteIds.length === 0) {
                setFavorites([]);
                return;
            }

            const chunks = [];
            for (let i = 0; i < favoriteIds.length; i += 10) {
                chunks.push(favoriteIds.slice(i, i + 10));
            }

            let loadedFavorites = [];

            for (const chunk of chunks) {
                if (chunk.length > 0) {
                    const q = query(collection(db, 'professionals'), where(documentId(), 'in', chunk));
                    const snap = await getDocs(q);
                    snap.forEach(doc => {
                        loadedFavorites.push({ id: doc.id, ...doc.data() });
                    });
                }
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
            <div style={{ paddingBottom: '2rem', position: 'relative' }}>
                {/* Toast Notification */}
                {toast && (
                    <div className="animate-fade-in-down" style={{
                        position: 'fixed',
                        top: '20px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'var(--bg-card)',
                        padding: '12px 24px',
                        borderRadius: '50px',
                        boxShadow: 'var(--shadow-lg)',
                        zIndex: 2000,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        border: '1px solid var(--border-default)',
                        minWidth: '300px',
                        justifyContent: 'center'
                    }}>
                        {toast.type === 'success' ? <Check size={18} color="var(--accent-success)" /> : <Info size={18} color="var(--accent-primary)" />}
                        <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{toast.message}</span>
                    </div>
                )}

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
                    {t('clientFavorites.title', 'Meus Favoritos')}
                </h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                    {t('clientFavorites.subtitle', 'Acesse rapidamente aos seus profissionais preferidos.')}
                </p>

                {favorites.length > 0 ? (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                        gap: '1.5rem'
                    }}>
                        {favorites.map(pro => (
                            <div key={pro.id} className="pro-card" style={{
                                background: 'var(--bg-card)',
                                borderRadius: '24px',
                                overflow: 'hidden',
                                border: '1px solid var(--border-default)',
                                display: 'flex',
                                flexDirection: 'column',
                                position: 'relative'
                            }}>
                                {/* Header Image / Pattern */}
                                <div style={{
                                    height: '120px',
                                    background: pro.logoUrl
                                        ? `linear-gradient(to bottom, rgba(0,0,0,0) 0%, var(--bg-card) 100%), url(${pro.logoUrl}) center/cover`
                                        : 'linear-gradient(135deg, var(--bg-secondary), var(--bg-elevated))',
                                    position: 'relative',
                                }}>
                                    {/* Remove Favorite Button - Top Right */}
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            removeFavorite(pro.id);
                                        }}
                                        className="fav-btn"
                                        style={{
                                            position: 'absolute',
                                            top: '12px',
                                            right: '12px',
                                            background: 'rgba(0,0,0,0.3)',
                                            backdropFilter: 'blur(4px)',
                                            border: 'none',
                                            borderRadius: '50%',
                                            width: '36px',
                                            height: '36px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            color: 'var(--accent-danger)',
                                            transition: 'all 0.2s'
                                        }}
                                        title="Remover dos favoritos"
                                    >
                                        <Heart size={18} fill="currentColor" />
                                    </button>
                                </div>

                                <div style={{ padding: '0 1.5rem 1.5rem', marginTop: '-50px', position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    {/* Logo Wrapper */}
                                    <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                        <div style={{
                                            width: '88px',
                                            height: '88px',
                                            borderRadius: '20px',
                                            border: '4px solid var(--bg-card)',
                                            background: 'var(--bg-card)',
                                            overflow: 'hidden',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                                        }}>
                                            {pro.logoUrl ? (
                                                <img src={pro.logoUrl} alt={pro.businessName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <div style={{
                                                    width: '100%', height: '100%',
                                                    background: 'linear-gradient(135deg, var(--accent-primary), #60a5fa)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    color: 'white', fontWeight: 700, fontSize: '2rem'
                                                }}>
                                                    {(pro.businessName || pro.name || '?').charAt(0)}
                                                </div>
                                            )}
                                        </div>

                                        <span style={{
                                            padding: '4px 10px',
                                            background: 'var(--bg-secondary)',
                                            borderRadius: '20px',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            color: 'var(--text-secondary)',
                                            border: '1px solid var(--border-default)'
                                        }}>
                                            {pro.profession || t('clientFavorites.services', 'Serviços')}
                                        </span>
                                    </div>

                                    <div style={{ marginBottom: '1.5rem' }}>
                                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem', lineHeight: 1.2 }}>
                                            {pro.businessName || pro.name}
                                        </h3>
                                        {pro.address && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                                                <MapPin size={14} style={{ flexShrink: 0 }} />
                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pro.address}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ marginTop: 'auto' }}>
                                        <Link
                                            to={`/book/${pro.slug}`}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '0.5rem',
                                                width: '100%',
                                                padding: '0.875rem',
                                                background: 'var(--accent-primary)',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '14px',
                                                fontWeight: 600,
                                                fontSize: '0.9375rem',
                                                cursor: 'pointer',
                                                textDecoration: 'none',
                                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)'
                                            }}
                                            className="action-btn"
                                        >
                                            {t('clientFavorites.book', 'Agendar')}
                                            <ArrowRight size={18} strokeWidth={2.5} />
                                        </Link>
                                    </div>
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
                        <Heart size={64} style={{ color: 'var(--text-muted)', margin: '0 auto 1.5rem', opacity: 0.5 }} />
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                            {t('clientFavorites.emptyTitle', 'Sem Favoritos')}
                        </h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                            {t('clientFavorites.emptyMsg', 'Você ainda não adicionou nenhum profissional aos favoritos.')}
                        </p>
                        <Link to="/client/explore" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{t('clientFavorites.goToExplore', 'Ir para Explorar')} &rarr;</Link>
                    </div>
                )}
            </div>
            <style>{`
                .pro-card { transition: border-color 0.2s; }
                .pro-card:hover { border-color: var(--border-hover); }
                
                .fav-btn:hover {
                    transform: scale(1.1);
                    background: rgba(0,0,0,0.5) !important;
                    color: white !important; /* Em remover, manter visivel ou mudar para cinza? Melhor branco ou manter vermelho */
                }

                .action-btn:hover { 
                    transform: translateY(-2px);
                    background: var(--accent-primary-hover) !important;
                    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4) !important;
                }
                .action-btn:active { transform: translateY(0); }
            `}</style>
        </Layout>
    );
}
