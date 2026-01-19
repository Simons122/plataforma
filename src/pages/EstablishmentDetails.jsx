import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { db, auth } from '../lib/firebase';
import { collection, getDocs, query, where, doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import {
    MapPin, Clock, Instagram, Facebook, Globe, Phone,
    ArrowLeft, ArrowRight, Heart, Calendar, ExternalLink,
    CheckCircle2, XCircle, Star, Sparkles
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
    const [services, setServices] = useState([]);
    const [user, setUser] = useState(null);
    const [isFavorite, setIsFavorite] = useState(false);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
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

                // Load services
                const servicesRef = collection(db, `professionals/${proDoc.id}/services`);
                const servicesSnap = await getDocs(servicesRef);
                const servicesData = servicesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                setServices(servicesData.slice(0, 4)); // Show only first 4
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

    const getTodaySchedule = () => {
        if (!schedule) return null;
        const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        const today = days[new Date().getDay()];
        return schedule[today];
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
                <div style={{ fontSize: '4rem' }}>🏪</div>
                <h1 style={{ color: 'var(--text-primary)', fontSize: '1.5rem' }}>Estabelecimento não encontrado</h1>
                <Link to="/client/explore" style={{ color: 'var(--accent-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ArrowLeft size={18} /> Voltar ao Explorar
                </Link>
            </div>
        );
    }

    const LayoutWrapper = user ? Layout : ClientLayout;
    const layoutProps = user
        ? { role: 'client', brandName: user.displayName || user.email?.split('@')[0] }
        : { userName: null };

    const fullAddress = formatAddress();
    const todaySchedule = getTodaySchedule();
    const isOpenToday = todaySchedule?.enabled;

    return (
        <LayoutWrapper {...layoutProps}>
            <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '2rem' }}>
                {/* Back Button */}
                <button
                    onClick={() => navigate(-1)}
                    className="back-btn"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-default)',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        padding: '0.625rem 1rem',
                        marginBottom: '1.5rem',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        borderRadius: '12px',
                        transition: 'all 0.2s'
                    }}
                >
                    <ArrowLeft size={18} />
                    Voltar
                </button>

                {/* Hero Section */}
                <div style={{
                    background: 'var(--bg-card)',
                    borderRadius: '28px',
                    border: '1px solid var(--border-default)',
                    overflow: 'hidden',
                    marginBottom: '1.5rem',
                    position: 'relative'
                }}>
                    {/* Header Banner with Gradient Overlay */}
                    <div style={{
                        height: '200px',
                        background: professional.logoUrl
                            ? `linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.6) 100%), url(${professional.logoUrl}) center/cover`
                            : 'linear-gradient(135deg, var(--accent-primary) 0%, #60a5fa 50%, #818cf8 100%)',
                        position: 'relative'
                    }}>
                        {/* Decorative sparkles */}
                        <div style={{ position: 'absolute', top: '20px', left: '30px', color: 'rgba(255,255,255,0.3)' }}>
                            <Sparkles size={24} />
                        </div>
                        <div style={{ position: 'absolute', bottom: '40px', right: '60px', color: 'rgba(255,255,255,0.2)' }}>
                            <Sparkles size={32} />
                        </div>

                        {/* Favorite Button */}
                        {user && (
                            <button
                                onClick={toggleFavorite}
                                className="fav-btn"
                                style={{
                                    position: 'absolute',
                                    top: '1.25rem',
                                    right: '1.25rem',
                                    background: 'rgba(255,255,255,0.15)',
                                    backdropFilter: 'blur(12px)',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    borderRadius: '14px',
                                    width: '50px',
                                    height: '50px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    color: isFavorite ? '#ef4444' : 'white',
                                    transition: 'all 0.3s'
                                }}
                            >
                                <Heart size={24} fill={isFavorite ? "currentColor" : "none"} />
                            </button>
                        )}

                        {/* Open/Closed Badge */}
                        <div style={{
                            position: 'absolute',
                            bottom: '1.25rem',
                            left: '1.25rem',
                            background: isOpenToday ? 'rgba(34, 197, 94, 0.9)' : 'rgba(239, 68, 68, 0.9)',
                            backdropFilter: 'blur(8px)',
                            padding: '0.5rem 1rem',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            color: 'white',
                            fontSize: '0.8125rem',
                            fontWeight: 600
                        }}>
                            {isOpenToday ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                            {isOpenToday ? `Aberto hoje • ${todaySchedule.start} - ${todaySchedule.end}` : 'Fechado hoje'}
                        </div>
                    </div>

                    {/* Profile Content */}
                    <div style={{ padding: '0 2rem 2rem', marginTop: '-60px', position: 'relative' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1.5rem', flexWrap: 'wrap' }}>
                            {/* Logo */}
                            <div style={{
                                width: '130px',
                                height: '130px',
                                borderRadius: '28px',
                                border: '4px solid var(--bg-card)',
                                background: 'var(--bg-card)',
                                overflow: 'hidden',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                                flexShrink: 0
                            }}>
                                {professional.logoUrl ? (
                                    <img src={professional.logoUrl} alt={professional.businessName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <div style={{
                                        width: '100%', height: '100%',
                                        background: 'linear-gradient(135deg, var(--accent-primary), #60a5fa)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: 'white', fontWeight: 700, fontSize: '3.5rem'
                                    }}>
                                        {(professional.businessName || professional.name || '?').charAt(0)}
                                    </div>
                                )}
                            </div>

                            {/* Name & Info */}
                            <div style={{ flex: 1, minWidth: '200px', paddingBottom: '0.5rem' }}>
                                <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.75rem', lineHeight: 1.2 }}>
                                    {professional.businessName || professional.name}
                                </h1>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
                                    <span style={{
                                        padding: '0.5rem 1rem',
                                        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(99, 102, 241, 0.05))',
                                        borderRadius: '10px',
                                        fontSize: '0.875rem',
                                        fontWeight: 600,
                                        color: 'var(--accent-primary)',
                                        border: '1px solid rgba(99, 102, 241, 0.2)'
                                    }}>
                                        {professional.profession || 'Serviços'}
                                    </span>
                                    {fullAddress && (
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                            <MapPin size={14} />
                                            {professional.city || fullAddress.split(',')[0]}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* CTA Button */}
                            <Link
                                to={`/book/${professional.slug}`}
                                className="book-btn"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '1rem 2rem',
                                    background: 'linear-gradient(135deg, var(--accent-primary), #60a5fa)',
                                    color: 'white',
                                    borderRadius: '16px',
                                    fontWeight: 700,
                                    fontSize: '1rem',
                                    textDecoration: 'none',
                                    transition: 'all 0.3s',
                                    boxShadow: '0 4px 20px rgba(99, 102, 241, 0.35)'
                                }}
                            >
                                <Calendar size={20} />
                                Agendar
                                <ArrowRight size={18} />
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Info Cards Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>

                    {/* Schedule Card */}
                    {schedule && (
                        <div className="info-card" style={{
                            background: 'var(--bg-card)',
                            borderRadius: '24px',
                            border: '1px solid var(--border-default)',
                            padding: '1.75rem',
                            boxShadow: 'var(--shadow-sm)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '1.5rem' }}>
                                <div style={{
                                    padding: '0.75rem',
                                    background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(34, 197, 94, 0.05))',
                                    borderRadius: '14px',
                                    color: 'var(--accent-success)'
                                }}>
                                    <Clock size={22} />
                                </div>
                                <div>
                                    <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.125rem' }}>Horário</h3>
                                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Funcionamento semanal</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                                {DAYS.map(day => {
                                    const daySchedule = schedule[day.id];
                                    const isOpen = daySchedule?.enabled;
                                    const isToday = DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]?.id === day.id;
                                    return (
                                        <div key={day.id} style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '0.625rem 0.875rem',
                                            background: isToday ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                                            borderRadius: '10px',
                                            border: isToday ? '1px solid rgba(99, 102, 241, 0.2)' : '1px solid transparent'
                                        }}>
                                            <span style={{
                                                color: isOpen ? 'var(--text-primary)' : 'var(--text-muted)',
                                                fontWeight: isToday ? 600 : 500,
                                                fontSize: '0.875rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem'
                                            }}>
                                                {isToday && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-primary)' }} />}
                                                {day.short}
                                            </span>
                                            {isOpen ? (
                                                <span style={{
                                                    color: 'var(--accent-success)',
                                                    fontWeight: 600,
                                                    fontSize: '0.8125rem',
                                                    background: 'rgba(34, 197, 94, 0.1)',
                                                    padding: '0.25rem 0.625rem',
                                                    borderRadius: '6px'
                                                }}>
                                                    {daySchedule.start} - {daySchedule.end}
                                                </span>
                                            ) : (
                                                <span style={{
                                                    color: 'var(--text-muted)',
                                                    fontSize: '0.8125rem'
                                                }}>
                                                    Fechado
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Right Column: Address + Social */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {/* Address Card */}
                        {fullAddress && (
                            <div className="info-card" style={{
                                background: 'var(--bg-card)',
                                borderRadius: '24px',
                                border: '1px solid var(--border-default)',
                                padding: '1.75rem',
                                boxShadow: 'var(--shadow-sm)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '1.25rem' }}>
                                    <div style={{
                                        padding: '0.75rem',
                                        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05))',
                                        borderRadius: '14px',
                                        color: '#ef4444'
                                    }}>
                                        <MapPin size={22} />
                                    </div>
                                    <div>
                                        <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.125rem' }}>Morada</h3>
                                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Localização</p>
                                    </div>
                                </div>
                                <div style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '0.9375rem', marginBottom: '1rem' }}>
                                    {professional.address && <span style={{ display: 'block' }}>{professional.address}</span>}
                                    {(professional.postalCode || professional.city) && (
                                        <span style={{ display: 'block', color: 'var(--text-muted)' }}>
                                            {professional.postalCode}{professional.postalCode && professional.city ? ' ' : ''}{professional.city}
                                        </span>
                                    )}
                                </div>
                                <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="maps-link"
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        color: 'var(--accent-primary)',
                                        fontSize: '0.875rem',
                                        fontWeight: 600,
                                        textDecoration: 'none',
                                        padding: '0.5rem 0.875rem',
                                        background: 'rgba(99, 102, 241, 0.08)',
                                        borderRadius: '10px',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <MapPin size={16} />
                                    Ver no Google Maps
                                    <ExternalLink size={14} />
                                </a>
                            </div>
                        )}

                        {/* Social Card */}
                        {(professional.phone || professional.instagram || professional.facebook || professional.website) && (
                            <div className="info-card" style={{
                                background: 'var(--bg-card)',
                                borderRadius: '24px',
                                border: '1px solid var(--border-default)',
                                padding: '1.75rem',
                                boxShadow: 'var(--shadow-sm)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '1.25rem' }}>
                                    <div style={{
                                        padding: '0.75rem',
                                        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(59, 130, 246, 0.05))',
                                        borderRadius: '14px',
                                        color: '#3b82f6'
                                    }}>
                                        <Globe size={22} />
                                    </div>
                                    <div>
                                        <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.125rem' }}>Contacto</h3>
                                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Redes sociais</p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {professional.phone && (
                                        <a href={`tel:${professional.phone}`} className="social-link" style={{
                                            display: 'flex', alignItems: 'center', gap: '0.875rem',
                                            padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: '12px',
                                            color: 'var(--text-secondary)', textDecoration: 'none', transition: 'all 0.2s'
                                        }}>
                                            <Phone size={18} style={{ color: 'var(--accent-success)' }} />
                                            <span style={{ flex: 1 }}>{professional.phone}</span>
                                        </a>
                                    )}
                                    {professional.instagram && (
                                        <a href={`https://instagram.com/${professional.instagram}`} target="_blank" rel="noopener noreferrer" className="social-link" style={{
                                            display: 'flex', alignItems: 'center', gap: '0.875rem',
                                            padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: '12px',
                                            color: 'var(--text-secondary)', textDecoration: 'none', transition: 'all 0.2s'
                                        }}>
                                            <Instagram size={18} style={{ color: '#E4405F' }} />
                                            <span style={{ flex: 1 }}>@{professional.instagram}</span>
                                            <ExternalLink size={14} style={{ opacity: 0.5 }} />
                                        </a>
                                    )}
                                    {professional.facebook && (
                                        <a href={professional.facebook.startsWith('http') ? professional.facebook : `https://${professional.facebook}`} target="_blank" rel="noopener noreferrer" className="social-link" style={{
                                            display: 'flex', alignItems: 'center', gap: '0.875rem',
                                            padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: '12px',
                                            color: 'var(--text-secondary)', textDecoration: 'none', transition: 'all 0.2s'
                                        }}>
                                            <Facebook size={18} style={{ color: '#1877F2' }} />
                                            <span style={{ flex: 1 }}>Facebook</span>
                                            <ExternalLink size={14} style={{ opacity: 0.5 }} />
                                        </a>
                                    )}
                                    {professional.website && (
                                        <a href={professional.website.startsWith('http') ? professional.website : `https://${professional.website}`} target="_blank" rel="noopener noreferrer" className="social-link" style={{
                                            display: 'flex', alignItems: 'center', gap: '0.875rem',
                                            padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: '12px',
                                            color: 'var(--text-secondary)', textDecoration: 'none', transition: 'all 0.2s'
                                        }}>
                                            <Globe size={18} style={{ color: 'var(--accent-primary)' }} />
                                            <span style={{ flex: 1 }}>{professional.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
                                            <ExternalLink size={14} style={{ opacity: 0.5 }} />
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom CTA */}
                <div style={{
                    background: 'linear-gradient(135deg, var(--accent-primary) 0%, #60a5fa 50%, #818cf8 100%)',
                    borderRadius: '24px',
                    padding: '2.5rem',
                    textAlign: 'center',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    {/* Decorative elements */}
                    <div style={{ position: 'absolute', top: '-20px', left: '10%', color: 'rgba(255,255,255,0.1)' }}>
                        <Star size={80} />
                    </div>
                    <div style={{ position: 'absolute', bottom: '-30px', right: '15%', color: 'rgba(255,255,255,0.08)' }}>
                        <Sparkles size={100} />
                    </div>

                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <h2 style={{ color: 'white', fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.75rem' }}>
                            Pronto para marcar? ✨
                        </h2>
                        <p style={{ color: 'rgba(255,255,255,0.9)', marginBottom: '1.75rem', fontSize: '1.0625rem' }}>
                            Escolha o serviço e a hora que melhor se adapta a si.
                        </p>
                        <Link
                            to={`/book/${professional.slug}`}
                            className="cta-btn"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                padding: '1.125rem 2.5rem',
                                background: 'white',
                                color: 'var(--accent-primary)',
                                borderRadius: '16px',
                                fontWeight: 700,
                                fontSize: '1.0625rem',
                                textDecoration: 'none',
                                transition: 'all 0.3s',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.15)'
                            }}
                        >
                            <Calendar size={22} />
                            Agendar Agora
                            <ArrowRight size={20} />
                        </Link>
                    </div>
                </div>
            </div>

            <style>{`
                .back-btn:hover {
                    background: var(--bg-elevated) !important;
                    color: var(--accent-primary) !important;
                    border-color: var(--accent-primary) !important;
                }
                .book-btn:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 8px 30px rgba(99, 102, 241, 0.45) !important;
                }
                .fav-btn:hover {
                    transform: scale(1.05);
                    background: rgba(255,255,255,0.25) !important;
                }
                .info-card {
                    transition: all 0.3s ease;
                }
                .info-card:hover {
                    border-color: var(--border-hover);
                    transform: translateY(-4px);
                    box-shadow: var(--shadow-lg);
                }
                .social-link:hover {
                    background: var(--bg-elevated) !important;
                    color: var(--text-primary) !important;
                }
                .maps-link:hover {
                    background: rgba(99, 102, 241, 0.15) !important;
                }
                .cta-btn:hover {
                    transform: translateY(-3px) scale(1.02);
                    box-shadow: 0 12px 40px rgba(0,0,0,0.2) !important;
                }
            `}</style>
        </LayoutWrapper>
    );
}
