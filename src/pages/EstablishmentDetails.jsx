import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { db, auth } from '../lib/firebase';
import { collection, getDocs, query, where, doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import {
    MapPin, Clock, Instagram, Facebook, Globe, Phone, Mail,
    ArrowLeft, ArrowRight, Heart, Calendar, Star, ExternalLink,
    Check, X
} from 'lucide-react';
import Layout from '../components/Layout';
import ClientLayout from '../components/ClientLayout';
import { useLanguage } from '../i18n';

const DAYS = [
    { id: 'mon', label: 'Segunda-feira', short: 'Seg' },
    { id: 'tue', label: 'Terça-feira', short: 'Ter' },
    { id: 'wed', label: 'Quarta-feira', short: 'Qua' },
    { id: 'thu', label: 'Quinta-feira', short: 'Qui' },
    { id: 'fri', label: 'Sexta-feira', short: 'Sex' },
    { id: 'sat', label: 'Sábado', short: 'Sáb' },
    { id: 'sun', label: 'Domingo', short: 'Dom' }
];

export default function EstablishmentDetails() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const { t } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [professional, setProfessional] = useState(null);
    const [schedule, setSchedule] = useState(null);
    const [user, setUser] = useState(null);
    const [isFavorite, setIsFavorite] = useState(false);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                // Check if this pro is favorited
                const clientDoc = await getDoc(doc(db, 'clients', currentUser.uid));
                if (clientDoc.exists() && professional) {
                    setIsFavorite((clientDoc.data().favorites || []).includes(professional.id));
                }
            }
        });
        loadProfessional();
        return () => unsubscribe();
    }, [slug]);

    useEffect(() => {
        if (user && professional) {
            checkFavorite();
        }
    }, [user, professional]);

    const checkFavorite = async () => {
        if (!user || !professional) return;
        const clientDoc = await getDoc(doc(db, 'clients', user.uid));
        if (clientDoc.exists()) {
            setIsFavorite((clientDoc.data().favorites || []).includes(professional.id));
        }
    };

    const loadProfessional = async () => {
        try {
            // Find professional by slug
            const q = query(collection(db, 'professionals'), where('slug', '==', slug));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const proDoc = querySnapshot.docs[0];
                const proData = { id: proDoc.id, ...proDoc.data() };
                setProfessional(proData);

                // Load schedule
                const scheduleRef = doc(db, `professionals/${proDoc.id}/settings`, 'schedule');
                const scheduleSnap = await getDoc(scheduleRef);
                if (scheduleSnap.exists()) {
                    setSchedule(scheduleSnap.data());
                }
            }
        } catch (error) {
            console.error("Erro ao carregar estabelecimento:", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleFavorite = async () => {
        if (!user || !professional) return;

        const clientRef = doc(db, 'clients', user.uid);
        try {
            if (isFavorite) {
                await updateDoc(clientRef, { favorites: arrayRemove(professional.id) });
                setIsFavorite(false);
            } else {
                await updateDoc(clientRef, { favorites: arrayUnion(professional.id) });
                setIsFavorite(true);
            }
        } catch (error) {
            console.error("Erro ao atualizar favorito:", error);
        }
    };

    const formatAddress = () => {
        if (!professional) return null;
        const parts = [];
        if (professional.address) parts.push(professional.address);
        if (professional.postalCode) parts.push(professional.postalCode);
        if (professional.city) parts.push(professional.city);
        return parts.length > 0 ? parts.join(', ') : null;
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
                <div className="spinner"></div>
            </div>
        );
    }

    if (!professional) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', gap: '1rem' }}>
                <h1 style={{ color: 'var(--text-primary)', fontSize: '1.5rem' }}>Estabelecimento não encontrado</h1>
                <Link to="/client/explore" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>
                    ← Voltar ao Explorar
                </Link>
            </div>
        );
    }

    const LayoutWrapper = user ? Layout : ClientLayout;
    const layoutProps = user
        ? { role: 'client', brandName: user.displayName || user.email?.split('@')[0] }
        : { userName: null };

    const fullAddress = formatAddress();

    return (
        <LayoutWrapper {...layoutProps}>
            <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '2rem' }}>
                {/* Back Button */}
                <button
                    onClick={() => navigate(-1)}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        padding: '0.5rem 0',
                        marginBottom: '1.5rem',
                        fontSize: '0.9375rem',
                        transition: 'color 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.color = 'var(--accent-primary)'}
                    onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                >
                    <ArrowLeft size={18} />
                    Voltar
                </button>

                {/* Hero Section */}
                <div style={{
                    background: 'var(--bg-card)',
                    borderRadius: '24px',
                    border: '1px solid var(--border-default)',
                    overflow: 'hidden',
                    marginBottom: '1.5rem'
                }}>
                    {/* Header Banner */}
                    <div style={{
                        height: '180px',
                        background: professional.logoUrl
                            ? `linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, var(--bg-card) 100%), url(${professional.logoUrl}) center/cover`
                            : 'linear-gradient(135deg, var(--accent-primary), #60a5fa)',
                        position: 'relative'
                    }}>
                        {/* Favorite Button */}
                        {user && (
                            <button
                                onClick={toggleFavorite}
                                style={{
                                    position: 'absolute',
                                    top: '1rem',
                                    right: '1rem',
                                    background: 'rgba(0,0,0,0.4)',
                                    backdropFilter: 'blur(8px)',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '44px',
                                    height: '44px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    color: isFavorite ? 'var(--accent-danger)' : 'white',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <Heart size={22} fill={isFavorite ? "currentColor" : "none"} />
                            </button>
                        )}
                    </div>

                    {/* Profile Info */}
                    <div style={{ padding: '0 2rem 2rem', marginTop: '-60px', position: 'relative' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1.5rem', flexWrap: 'wrap' }}>
                            {/* Logo */}
                            <div style={{
                                width: '120px',
                                height: '120px',
                                borderRadius: '24px',
                                border: '4px solid var(--bg-card)',
                                background: 'var(--bg-card)',
                                overflow: 'hidden',
                                boxShadow: 'var(--shadow-lg)',
                                flexShrink: 0
                            }}>
                                {professional.logoUrl ? (
                                    <img src={professional.logoUrl} alt={professional.businessName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <div style={{
                                        width: '100%', height: '100%',
                                        background: 'linear-gradient(135deg, var(--accent-primary), #60a5fa)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: 'white', fontWeight: 700, fontSize: '3rem'
                                    }}>
                                        {(professional.businessName || professional.name || '?').charAt(0)}
                                    </div>
                                )}
                            </div>

                            {/* Name & Category */}
                            <div style={{ flex: 1, minWidth: '200px', paddingBottom: '0.5rem' }}>
                                <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                                    {professional.businessName || professional.name}
                                </h1>
                                <span style={{
                                    padding: '6px 14px',
                                    background: 'var(--bg-secondary)',
                                    borderRadius: '20px',
                                    fontSize: '0.875rem',
                                    fontWeight: 600,
                                    color: 'var(--text-secondary)',
                                    border: '1px solid var(--border-default)',
                                    display: 'inline-block'
                                }}>
                                    {professional.profession || 'Serviços'}
                                </span>
                            </div>

                            {/* CTA Button */}
                            <Link
                                to={`/book/${professional.slug}`}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '1rem 2rem',
                                    background: 'var(--accent-primary)',
                                    color: 'white',
                                    borderRadius: '14px',
                                    fontWeight: 600,
                                    fontSize: '1rem',
                                    textDecoration: 'none',
                                    transition: 'all 0.2s',
                                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                                }}
                                className="book-btn"
                            >
                                <Calendar size={20} />
                                Agendar
                                <ArrowRight size={18} />
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Info Cards Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>

                    {/* Address Card */}
                    {fullAddress && (
                        <div style={{
                            background: 'var(--bg-card)',
                            borderRadius: '20px',
                            border: '1px solid var(--border-default)',
                            padding: '1.5rem',
                            boxShadow: 'var(--shadow-sm)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                                <div style={{
                                    padding: '0.625rem',
                                    background: 'rgba(99, 102, 241, 0.1)',
                                    borderRadius: '12px',
                                    color: 'var(--accent-primary)'
                                }}>
                                    <MapPin size={20} />
                                </div>
                                <h3 style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Morada</h3>
                            </div>
                            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '0.9375rem' }}>
                                {professional.address && <span style={{ display: 'block' }}>{professional.address}</span>}
                                {(professional.postalCode || professional.city) && (
                                    <span style={{ display: 'block', marginTop: '0.25rem' }}>
                                        {professional.postalCode}{professional.postalCode && professional.city ? ' ' : ''}{professional.city}
                                    </span>
                                )}
                            </p>
                            {/* Google Maps Link */}
                            <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    marginTop: '1rem',
                                    color: 'var(--accent-primary)',
                                    fontSize: '0.875rem',
                                    fontWeight: 500,
                                    textDecoration: 'none'
                                }}
                            >
                                Ver no Google Maps
                                <ExternalLink size={14} />
                            </a>
                        </div>
                    )}

                    {/* Schedule Card */}
                    {schedule && (
                        <div style={{
                            background: 'var(--bg-card)',
                            borderRadius: '20px',
                            border: '1px solid var(--border-default)',
                            padding: '1.5rem',
                            boxShadow: 'var(--shadow-sm)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                                <div style={{
                                    padding: '0.625rem',
                                    background: 'rgba(34, 197, 94, 0.1)',
                                    borderRadius: '12px',
                                    color: 'var(--accent-success)'
                                }}>
                                    <Clock size={20} />
                                </div>
                                <h3 style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Horário de Funcionamento</h3>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {DAYS.map(day => {
                                    const daySchedule = schedule[day.id];
                                    const isOpen = daySchedule?.enabled;
                                    return (
                                        <div key={day.id} style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '0.5rem 0',
                                            borderBottom: '1px solid var(--border-default)'
                                        }}>
                                            <span style={{
                                                color: isOpen ? 'var(--text-primary)' : 'var(--text-muted)',
                                                fontWeight: 500,
                                                fontSize: '0.875rem'
                                            }}>
                                                {day.label}
                                            </span>
                                            {isOpen ? (
                                                <span style={{
                                                    color: 'var(--accent-success)',
                                                    fontWeight: 600,
                                                    fontSize: '0.875rem'
                                                }}>
                                                    {daySchedule.start} - {daySchedule.end}
                                                </span>
                                            ) : (
                                                <span style={{
                                                    color: 'var(--text-muted)',
                                                    fontSize: '0.875rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.25rem'
                                                }}>
                                                    <X size={14} />
                                                    Fechado
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Contact & Social Media Card */}
                    {(professional.phone || professional.instagram || professional.facebook || professional.website) && (
                        <div style={{
                            background: 'var(--bg-card)',
                            borderRadius: '20px',
                            border: '1px solid var(--border-default)',
                            padding: '1.5rem',
                            boxShadow: 'var(--shadow-sm)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                                <div style={{
                                    padding: '0.625rem',
                                    background: 'rgba(59, 130, 246, 0.1)',
                                    borderRadius: '12px',
                                    color: 'var(--accent-primary)'
                                }}>
                                    <Globe size={20} />
                                </div>
                                <h3 style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Contacto & Redes Sociais</h3>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {/* Phone */}
                                {professional.phone && (
                                    <a
                                        href={`tel:${professional.phone}`}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.75rem',
                                            color: 'var(--text-secondary)',
                                            textDecoration: 'none',
                                            transition: 'color 0.2s'
                                        }}
                                    >
                                        <Phone size={18} style={{ color: 'var(--accent-primary)' }} />
                                        <span>{professional.phone}</span>
                                    </a>
                                )}

                                {/* Instagram */}
                                {professional.instagram && (
                                    <a
                                        href={`https://instagram.com/${professional.instagram}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.75rem',
                                            color: 'var(--text-secondary)',
                                            textDecoration: 'none',
                                            transition: 'color 0.2s'
                                        }}
                                        className="social-link"
                                    >
                                        <Instagram size={18} style={{ color: '#E4405F' }} />
                                        <span>@{professional.instagram}</span>
                                        <ExternalLink size={14} style={{ marginLeft: 'auto', opacity: 0.5 }} />
                                    </a>
                                )}

                                {/* Facebook */}
                                {professional.facebook && (
                                    <a
                                        href={professional.facebook.startsWith('http') ? professional.facebook : `https://${professional.facebook}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.75rem',
                                            color: 'var(--text-secondary)',
                                            textDecoration: 'none',
                                            transition: 'color 0.2s'
                                        }}
                                        className="social-link"
                                    >
                                        <Facebook size={18} style={{ color: '#1877F2' }} />
                                        <span>Facebook</span>
                                        <ExternalLink size={14} style={{ marginLeft: 'auto', opacity: 0.5 }} />
                                    </a>
                                )}

                                {/* Website */}
                                {professional.website && (
                                    <a
                                        href={professional.website.startsWith('http') ? professional.website : `https://${professional.website}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.75rem',
                                            color: 'var(--text-secondary)',
                                            textDecoration: 'none',
                                            transition: 'color 0.2s'
                                        }}
                                        className="social-link"
                                    >
                                        <Globe size={18} style={{ color: 'var(--accent-primary)' }} />
                                        <span>{professional.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
                                        <ExternalLink size={14} style={{ marginLeft: 'auto', opacity: 0.5 }} />
                                    </a>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Bottom CTA */}
                <div style={{
                    marginTop: '2rem',
                    background: 'linear-gradient(135deg, var(--accent-primary), #60a5fa)',
                    borderRadius: '20px',
                    padding: '2rem',
                    textAlign: 'center'
                }}>
                    <h2 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                        Pronto para marcar?
                    </h2>
                    <p style={{ color: 'rgba(255,255,255,0.9)', marginBottom: '1.5rem' }}>
                        Escolha o serviço e a hora que melhor se adapta a si.
                    </p>
                    <Link
                        to={`/book/${professional.slug}`}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '1rem 2.5rem',
                            background: 'white',
                            color: 'var(--accent-primary)',
                            borderRadius: '14px',
                            fontWeight: 700,
                            fontSize: '1rem',
                            textDecoration: 'none',
                            transition: 'all 0.2s',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                        }}
                    >
                        <Calendar size={20} />
                        Agendar Agora
                        <ArrowRight size={18} />
                    </Link>
                </div>
            </div>

            <style>{`
                .book-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4) !important;
                }
                .social-link:hover {
                    color: var(--text-primary) !important;
                }
                .social-link:hover svg:last-child {
                    opacity: 1 !important;
                }
            `}</style>
        </LayoutWrapper>
    );
}
