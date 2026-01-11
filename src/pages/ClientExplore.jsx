import React, { useEffect, useState } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, getDocs, query, where, doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { Search, MapPin, Heart, ArrowRight, Info, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';

export default function ClientExplore() {
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
                showToast(`${proName} removido dos favoritos.`, 'info');
            } else {
                await updateDoc(clientRef, { favorites: arrayUnion(proId) });
                setFavorites(prev => [...prev, proId]);
                showToast(`${proName} adicionado aos favoritos!`, 'success');
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
                <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                    <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--text-primary)' }}>
                        Encontre o Profissional Ideal
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem', maxWidth: '600px', margin: '0 auto 2rem' }}>
                        Barbeiros, Personal Trainers, Esteticistas e muito mais.
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
                            placeholder="Pesquisar por nome ou categoria..."
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
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: '1.5rem'
                }}>
                    {filteredPros.map(pro => (
                        <div key={pro.id} style={{
                            background: 'var(--bg-card)',
                            borderRadius: '20px',
                            overflow: 'hidden',
                            border: '1px solid var(--border-default)',
                            transition: 'all 0.2s',
                            position: 'relative'
                        }}
                            className="hover-card"
                        >
                            {/* Header Image / Pattern */}
                            <div style={{
                                height: '100px',
                                background: pro.logoUrl ? `url(${pro.logoUrl}) center/cover blur(20px)` : 'linear-gradient(135deg, var(--bg-secondary), var(--bg-elevated))',
                                position: 'relative',
                                opacity: 0.8
                            }}></div>

                            <div style={{ padding: '0 1.5rem 1.5rem', marginTop: '-40px', position: 'relative' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1rem' }}>
                                    {/* Logo */}
                                    <div style={{
                                        width: '80px',
                                        height: '80px',
                                        borderRadius: '50%',
                                        border: '4px solid var(--bg-card)',
                                        background: 'var(--bg-card)',
                                        overflow: 'hidden',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: 'var(--shadow-sm)'
                                    }}>
                                        {pro.logoUrl ? (
                                            <img src={pro.logoUrl} alt={pro.businessName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <div style={{
                                                width: '100%', height: '100%',
                                                background: 'linear-gradient(135deg, var(--accent-primary), #60a5fa)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: 'white', fontWeight: 700, fontSize: '1.5rem'
                                            }}>
                                                {(pro.businessName || pro.name || '?').charAt(0)}
                                            </div>
                                        )}
                                    </div>

                                    {/* Favorite Button */}
                                    {user && (
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                toggleFavorite(pro.id);
                                            }}
                                            style={{
                                                background: 'var(--bg-elevated)',
                                                border: '1px solid var(--border-default)',
                                                borderRadius: '50%',
                                                width: '40px',
                                                height: '40px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                                color: favorites.includes(pro.id) ? 'var(--accent-danger)' : 'var(--text-muted)',
                                                marginBottom: '0.5rem',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <Heart size={20} fill={favorites.includes(pro.id) ? "currentColor" : "none"} />
                                        </button>
                                    )}
                                </div>

                                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                                    {pro.businessName || pro.name}
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
                                        padding: '0.875rem',
                                        background: 'var(--accent-primary)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '12px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        textDecoration: 'none',
                                        transition: 'background 0.2s'
                                    }}
                                    className="hover-btn"
                                >
                                    Fazer Marcação
                                    <ArrowRight size={18} />
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>

                {filteredPros.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
                        <p>Nenhum profissional encontrado.</p>
                    </div>
                )}
            </div>
            <style>{`
                .hover-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg) !important; }
                .hover-btn:hover { background: var(--accent-primary-hover) !important; }
            `}</style>
        </Layout>
    );
}
