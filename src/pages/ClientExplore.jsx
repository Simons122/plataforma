import React, { useEffect, useState } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, getDocs, query, where, doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { Search, MapPin, Heart, ArrowRight, Info, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import ClientLayout from '../components/ClientLayout';

import { useLanguage } from '../i18n';

export default function ClientExplore() {
    const { t } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [professionals, setProfessionals] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [user, setUser] = useState(null);
    const [favorites, setFavorites] = useState([]);
    const [toast, setToast] = useState(null);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                // Carregar favoritos do usuário
                const clientDoc = await getDoc(doc(db, 'clients', currentUser.uid));
                if (clientDoc.exists()) {
                    setFavorites(clientDoc.data().favorites || []);
                }
            }
            loadProfessionals();
        });
        return () => unsubscribe();
    }, []);

    const loadProfessionals = async () => {
        try {
            // Pegar apenas profissionais aprovados/ativos (se houver esse campo, senão todos)
            const q = query(collection(db, 'professionals'));
            const querySnapshot = await getDocs(q);
            const pros = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setProfessionals(pros);
        } catch (error) {
            console.error("Erro ao carregar profissionais:", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleFavorite = async (proId) => {
        if (!user) return;

        const clientRef = doc(db, 'clients', user.uid);
        const pro = professionals.find(p => p.id === proId);
        const proName = pro ? (pro.businessName || pro.name) : 'O estabelecimento';

        try {
            if (favorites.includes(proId)) {
                await updateDoc(clientRef, { favorites: arrayRemove(proId) });
                setFavorites(prev => prev.filter(id => id !== proId));
                showToast(`${proName} ${t('clientExplore.removedFromFav', 'removido dos favoritos.')}`, 'info');
            } else {
                await updateDoc(clientRef, { favorites: arrayUnion(proId) });
                setFavorites(prev => [...prev, proId]);
                showToast(`${proName} ${t('clientExplore.addedToFav', 'adicionado aos favoritos!')}`, 'success');
            }
        } catch (error) {
            console.error("Erro ao atualizar favorito:", error);
        }
    };

    const filteredPros = professionals.filter(pro => {
        const term = searchTerm.toLowerCase();
        return (
            (pro.businessName && pro.businessName.toLowerCase().includes(term)) ||
            (pro.name && pro.name.toLowerCase().includes(term)) ||
            (pro.profession && pro.profession.toLowerCase().includes(term))
        );
    });

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
                <div className="spinner"></div>
            </div>
        );
    }

    // Choose wrapper based on login state
    const LayoutWrapper = user ? Layout : ClientLayout;
    const layoutProps = user
        ? { role: 'client', brandName: user.displayName || user.email?.split('@')[0] }
        : { userName: null };

    return (
        <LayoutWrapper {...layoutProps}>
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
                <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                    <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--text-primary)' }}>
                        {t('clientExplore.title', 'Encontre o Profissional Ideal')}
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem', maxWidth: '600px', margin: '0 auto 2rem' }}>
                        {t('clientExplore.subtitle', 'Barbeiros, Personal Trainers, Esteticistas e muito mais.')}
                    </p>

                    {/* Search Bar */}
                    <div style={{
                        maxWidth: '500px',
                        margin: '0 auto',
                        position: 'relative'
                    }}>
                        <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            placeholder={t('clientExplore.searchPlaceholder', 'Pesquisar por nome ou categoria...')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '1rem 1rem 1rem 3rem',
                                borderRadius: '16px',
                                border: '1px solid var(--border-default)',
                                background: 'var(--bg-card)',
                                color: 'var(--text-primary)',
                                fontSize: '1rem',
                                boxShadow: 'var(--shadow-sm)',
                                outline: 'none'
                            }}
                        />
                    </div>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: '1.5rem'
                }}>
                    {filteredPros.map(pro => (
                        <Link
                            key={pro.id}
                            to={`/establishment/${pro.slug}`}
                            style={{ textDecoration: 'none' }}
                        >
                            <div className="pro-card" style={{
                                background: 'var(--bg-card)',
                                borderRadius: '24px',
                                overflow: 'hidden',
                                border: '1px solid var(--border-default)',
                                display: 'flex',
                                flexDirection: 'column',
                                position: 'relative',
                                cursor: 'pointer',
                                height: '100%'
                            }}>
                                {/* Header Image / Pattern */}
                                <div style={{
                                    height: '120px',
                                    background: pro.logoUrl
                                        ? `linear-gradient(to bottom, rgba(0,0,0,0) 0%, var(--bg-card) 100%), url(${pro.logoUrl}) center/cover`
                                        : 'linear-gradient(135deg, var(--bg-secondary), var(--bg-elevated))',
                                    position: 'relative',
                                }}>
                                    {/* Favorite Button - Top Right */}
                                    {user && (
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                toggleFavorite(pro.id);
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
                                                color: favorites.includes(pro.id) ? 'var(--accent-danger)' : 'white',
                                                transition: 'all 0.2s'
                                            }}
                                            title={favorites.includes(pro.id) ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                                        >
                                            <Heart size={18} fill={favorites.includes(pro.id) ? "currentColor" : "none"} />
                                        </button>
                                    )}
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

                                        {/* Rating or Category Badge could go here */}
                                        <span style={{
                                            padding: '4px 10px',
                                            background: 'var(--bg-secondary)',
                                            borderRadius: '20px',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            color: 'var(--text-secondary)',
                                            border: '1px solid var(--border-default)'
                                        }}>
                                            {pro.profession || t('clientExplore.services', 'Serviços')}
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
                                            onClick={(e) => e.stopPropagation()}
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
                                            {t('clientExplore.book', 'Agendar')}
                                            <ArrowRight size={18} strokeWidth={2.5} />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {filteredPros.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
                        <p>{t('clientExplore.noProsFound', 'Nenhum profissional encontrado.')}</p>
                    </div>
                )}
            </div>
            <style>{`
                .pro-card { transition: border-color 0.2s; }
                .pro-card:hover { border-color: var(--border-hover); }
                
                .fav-btn:hover {
                    transform: scale(1.1);
                    background: rgba(0,0,0,0.5) !important;
                    color: #ef4444 !important;
                }

                .action-btn:hover { 
                    transform: translateY(-2px);
                    background: var(--accent-primary-hover) !important;
                    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4) !important;
                }
                .action-btn:active { transform: translateY(0); }
            `}</style>
        </LayoutWrapper >
    );
}
