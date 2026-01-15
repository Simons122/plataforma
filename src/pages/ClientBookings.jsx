import React, { useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, collectionGroup, getDoc } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import { Calendar, Clock, MapPin, Building2, Euro, X, ArrowLeft, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { pt, enUS } from 'date-fns/locale';
import Layout from '../components/Layout';
import { useLanguage } from '../i18n';

export default function ClientBookings() {
    const { t, language } = useLanguage();
    const dateLocale = language === 'pt' ? pt : enUS;
    const [loading, setLoading] = useState(true);
    const [bookings, setBookings] = useState([]);
    const [user, setUser] = useState(null);
    const [cancelling, setCancelling] = useState(null);
    const [activeTab, setActiveTab] = useState('upcoming');
    const navigate = useNavigate();

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
            if (currentUser) {
                const clientDoc = await getDocs(query(collection(db, 'clients'), where('__name__', '==', currentUser.uid)));
                if (clientDoc.empty) {
                    navigate('/client/auth');
                    return;
                }
                setUser(currentUser);
                await loadBookings(currentUser.email);
            } else {
                navigate('/client/auth');
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [navigate]);

    const loadBookings = async (email) => {
        console.log("🔄 Starting Robust Search for:", email);
        if (!email) return;

        try {
            const allBookings = [];

            // 1. Get All Professionals (Owners)
            const prosSnap = await getDocs(collection(db, 'professionals'));

            // Parallelize fetching for each professional
            await Promise.all(prosSnap.docs.map(async (ownerDoc) => {
                const ownerData = ownerDoc.data();
                const ownerId = ownerDoc.id;

                // A. Search Owner Bookings
                const ownerBookingsPromise = getDocs(query(
                    collection(db, 'professionals', ownerId, 'bookings'),
                    where('clientEmail', '==', email)
                ));

                // B. Get Staff List to search their bookings
                const staffSnapPromise = getDocs(collection(db, 'professionals', ownerId, 'staff'));

                const [ownerBookingsSnap, staffSnap] = await Promise.all([ownerBookingsPromise, staffSnapPromise]);

                // Process Owner Bookings
                ownerBookingsSnap.forEach(bookingDoc => {
                    allBookings.push({
                        id: bookingDoc.id,
                        ...bookingDoc.data(),
                        professionalId: ownerId,
                        businessName: ownerData.businessName,
                        professionalName: ownerData.name,
                        logoUrl: ownerData.logoUrl,
                        profession: ownerData.profession,
                        docPath: bookingDoc.ref.path,
                        isStaff: false
                    });
                });

                // C. Search Staff Bookings (if staff exists)
                if (!staffSnap.empty) {
                    await Promise.all(staffSnap.docs.map(async (staffDoc) => {
                        const staffBookingsSnap = await getDocs(query(
                            collection(db, 'professionals', ownerId, 'staff', staffDoc.id, 'bookings'),
                            where('clientEmail', '==', email)
                        ));

                        staffBookingsSnap.forEach(bookingDoc => {
                            allBookings.push({
                                id: bookingDoc.id,
                                ...bookingDoc.data(),
                                professionalId: ownerId,
                                businessName: ownerData.businessName,
                                professionalName: ownerData.name,
                                logoUrl: ownerData.logoUrl,
                                profession: ownerData.profession,
                                docPath: bookingDoc.ref.path,
                                isStaff: true,
                                staffId: staffDoc.id,
                                staffName: staffDoc.data().name // Useful for display
                            });
                        });
                    }));
                }
            }));

            console.log(`✅ Loaded ${allBookings.length} bookings successfully.`);
            allBookings.sort((a, b) => new Date(b.date || b.selectedTime) - new Date(a.date || a.selectedTime));
            setBookings(allBookings);
        } catch (error) {
            console.error("Error loading bookings:", error);
            alert("Erro ao carregar marcações. Por favor verifique a sua ligação.");
        }
    };

    const handleCancelBooking = async (booking) => {
        if (!confirm(t('clientBookings.confirmCancel', 'Tem a certeza que deseja cancelar esta marcação?'))) return;

        setCancelling(booking.id);
        try {
            const bookingRef = booking.docPath ? doc(db, booking.docPath) : doc(db, 'professionals', booking.professionalId, 'bookings', booking.id);
            await updateDoc(bookingRef, {
                status: 'cancelled',
                cancelledAt: new Date().toISOString()
            });

            setBookings(prevBookings =>
                prevBookings.map(b =>
                    b.id === booking.id ? { ...b, status: 'cancelled' } : b
                )
            );
        } catch (error) {
            console.error('Erro ao cancelar:', error);
            alert('Erro ao cancelar marcação. Tente novamente.');
        } finally {
            setCancelling(null);
        }
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
                <div className="spinner"></div>
            </div>
        );
    }

    const getBookingDate = (b) => new Date(b.date || b.selectedTime);
    const upcomingBookings = bookings.filter(b => b.status !== 'cancelled' && getBookingDate(b) > new Date());
    const pastBookings = bookings.filter(b => b.status === 'cancelled' || getBookingDate(b) <= new Date());

    return (
        <Layout role="client" brandName={user?.displayName || user?.email?.split('@')[0]}>
            <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '3rem' }}>

                {/* Header Section */}
                <div style={{ marginBottom: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }} className="animate-fade-in">
                    <h1 style={{
                        fontSize: '2rem',
                        fontWeight: 800,
                        color: 'var(--text-primary)',
                        background: 'linear-gradient(45deg, var(--text-primary), var(--text-secondary))',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        marginBottom: '0.5rem'
                    }}>
                        {t('clientBookings.title', 'Minhas Marcações')}
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem' }}>
                        {t('clientBookings.subtitle', 'Gerencie seus agendamentos e consulte seu histórico.')}
                    </p>
                </div>

                {/* Tabs estilizadas */}
                <div style={{
                    display: 'flex',
                    background: 'var(--bg-secondary)',
                    padding: '6px',
                    borderRadius: '16px',
                    marginBottom: '2.5rem',
                    width: 'fit-content',
                    border: '1px solid var(--border-default)',
                    boxShadow: 'var(--shadow-sm)'
                }} className="animate-fade-in">
                    <TabButton
                        active={activeTab === 'upcoming'}
                        onClick={() => setActiveTab('upcoming')}
                        icon={Calendar}
                        label={t('clientBookings.upcoming', 'Próximas')}
                        count={upcomingBookings.length}
                    />
                    <TabButton
                        active={activeTab === 'history'}
                        onClick={() => setActiveTab('history')}
                        icon={Clock}
                        label={t('clientBookings.history', 'Histórico')}
                    />
                </div>

                {/* Content */}
                <div className="animate-slide-up">
                    {activeTab === 'upcoming' ? (
                        upcomingBookings.length > 0 ? (
                            <div style={{ display: 'grid', gap: '1.5rem' }}>
                                {upcomingBookings.map(booking => (
                                    <BookingCard
                                        key={booking.id}
                                        booking={booking}
                                        onCancel={handleCancelBooking}
                                        cancelling={cancelling === booking.id}
                                        t={t}
                                        locale={dateLocale}
                                    />
                                ))}
                            </div>
                        ) : (
                            <EmptyState
                                title={t('clientBookings.emptyUpcomingTitle', 'Sem agendamentos futuros')}
                                message={t('clientBookings.emptyUpcomingMessage', 'Que tal marcar algo novo para esta semana?')}
                                actionLink="/client/explore"
                                actionText={t('clientBookings.explorePros', 'Explorar Profissionais')}
                            />
                        )
                    ) : (
                        pastBookings.length > 0 ? (
                            <div style={{ display: 'grid', gap: '1.5rem', opacity: 0.9 }}>
                                {pastBookings.map(booking => (
                                    <BookingCard
                                        key={booking.id}
                                        booking={booking}
                                        isPast={true}
                                        t={t}
                                        locale={dateLocale}
                                    />
                                ))}
                            </div>
                        ) : (
                            <EmptyState
                                title={t('clientBookings.emptyHistoryTitle', 'Histórico vazio')}
                                message={t('clientBookings.emptyHistoryMessage', 'As suas marcações passadas aparecerão aqui.')}
                            />
                        )
                    )}
                </div>
            </div>

            <style>{`
                .booking-card {
                    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .booking-card:hover {
                    transform: translateY(-4px);
                    box-shadow: var(--shadow-lg);
                }
                .cancel-btn:hover {
                    background: rgba(239, 68, 68, 0.15) !important;
                }
            `}</style>
        </Layout>
    );
}

function TabButton({ active, onClick, icon: Icon, label, count }) {
    return (
        <button
            onClick={onClick}
            style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '12px',
                background: active ? 'var(--bg-elevated)' : 'transparent',
                color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                border: 'none',
                fontWeight: active ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: active ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                position: 'relative'
            }}
        >
            <Icon size={18} style={{ color: active ? 'var(--accent-primary)' : 'currentColor', opacity: active ? 1 : 0.7 }} />
            {label}
            {count > 0 && (
                <span style={{
                    background: active ? 'var(--accent-primary)' : 'var(--bg-primary)',
                    color: active ? 'white' : 'var(--text-muted)',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    marginLeft: '4px',
                    border: '1px solid transparent',
                    borderColor: active ? 'transparent' : 'var(--border-default)'
                }}>
                    {count}
                </span>
            )}
        </button>
    );
}

function BookingCard({ booking, onCancel, isPast, cancelling, t, locale }) {
    const dateStr = booking.date || booking.selectedTime;
    const bookingDate = parseISO(dateStr);
    const isUpcoming = new Date(dateStr) > new Date() && booking.status !== 'cancelled';
    const isCancelled = booking.status === 'cancelled';

    return (
        <div className="booking-ticket" style={{
            display: 'flex',
            background: 'var(--bg-card)',
            borderRadius: '16px',
            border: '1px solid var(--border-default)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-sm)',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            minHeight: '100px',
            position: 'relative'
        }}>
            {/* Left: Date Block */}
            <div style={{
                width: '85px',
                background: isCancelled ? 'var(--bg-secondary)' : 'color-mix(in srgb, var(--accent-primary), transparent 95%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                borderRight: '1px solid var(--border-subtle)',
                padding: '0.5rem',
                flexShrink: 0
            }}>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, color: isCancelled ? 'var(--text-muted)' : 'var(--accent-primary)', marginBottom: '-2px' }}>
                    {format(bookingDate, 'MMM', { locale }).replace('.', '')}
                </span>
                <span style={{ fontSize: '1.75rem', fontWeight: 800, color: isCancelled ? 'var(--text-muted)' : 'var(--text-primary)', lineHeight: 1 }}>
                    {format(bookingDate, 'd')}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500, marginTop: '2px', textTransform: 'capitalize' }}>
                    {format(bookingDate, 'EEE', { locale }).replace('.', '')}
                </span>
            </div>

            {/* Center: Info */}
            <div style={{ flex: 1, padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '4px', minWidth: 0 }}>
                {/* Header Row: Business & Status (Mobile) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {booking.businessName || booking.professionalName}
                    </span>
                    {/* Status Mobile only if needed, otherwise rely on desktop right col */}
                </div>

                {/* Service Name */}
                <h3 style={{
                    fontSize: '1.125rem',
                    fontWeight: 700,
                    color: isCancelled ? 'var(--text-muted)' : 'var(--text-primary)',
                    margin: 0,
                    lineHeight: 1.3
                }}>
                    {booking.serviceName}
                </h3>

                {/* Meta Row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={14} className={isUpcoming ? "text-accent" : ""} />
                        <span style={{ color: isUpcoming ? 'var(--text-primary)' : 'inherit' }}>{format(bookingDate, 'HH:mm')}</span>
                    </div>

                    <div style={{ width: '1px', height: '12px', background: 'var(--border-default)' }}></div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>{booking.duration || 30} min</span>
                    </div>

                    <div style={{ width: '1px', height: '12px', background: 'var(--border-default)' }}></div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>{booking.price}€</span>
                    </div>
                </div>
            </div>

            {/* Right: Actions / Status (Desktop) */}
            <div style={{
                padding: '1rem',
                borderLeft: '1px dashed var(--border-default)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                minWidth: '100px',
                background: 'var(--bg-secondary-alpha)'
            }}>

                {isCancelled ? (
                    <span className="badge-pill" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-danger)', fontSize: '0.7rem' }}>{t('clientBookings.cancelled', 'Cancelada')}</span>
                ) : isPast ? (
                    <span className="badge-pill" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', fontSize: '0.7rem' }}>{t('clientBookings.completed', 'Concluída')}</span>
                ) : (
                    <span className="badge-pill" style={{ background: 'rgba(34, 197, 94, 0.1)', color: 'var(--accent-success)', fontSize: '0.7rem' }}>{t('clientBookings.confirmed', 'Confirmada')}</span>
                )}

                {isUpcoming && onCancel && (
                    <button
                        onClick={() => onCancel(booking)}
                        disabled={cancelling}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            background: 'transparent',
                            color: 'var(--accent-danger)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '8px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: cancelling ? 'wait' : 'pointer',
                            transition: 'all 0.2s',
                            width: '100%',
                            marginTop: 'auto',
                            whiteSpace: 'nowrap'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)';
                            e.currentTarget.style.borderColor = 'var(--accent-danger)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                        }}
                    >
                        {cancelling ? (
                            <div className="spinner-sm" style={{ borderColor: 'var(--accent-danger)', borderTopColor: 'transparent' }} />
                        ) : (
                            <>{t('clientBookings.cancelBooking', 'Cancelar marcação')}</>
                        )}
                    </button>
                )}
            </div>

            <style>{`
                .text-accent { color: var(--accent-primary); }
                .badge-pill {
                    padding: 4px 10px;
                    border-radius: 20px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                .btn-icon-danger:hover {
                    background: rgba(239, 68, 68, 0.1) !important;
                    color: var(--accent-danger) !important;
                    border-color: var(--accent-danger) !important;
                }
                .spinner-sm {
                   width: 14px; height: 14px; border: 2px solid currentColor; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite;
                }
            `}</style>
        </div>
    );
}

function EmptyState({ title, message, actionLink, actionText }) {
    return (
        <div style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            background: 'var(--bg-card)',
            borderRadius: '24px',
            border: '2px dashed var(--border-default)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem'
        }}>
            <div style={{
                width: '80px',
                height: '80px',
                background: 'var(--bg-secondary)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '0.5rem'
            }}>
                <Calendar size={32} style={{ color: 'var(--text-muted)' }} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {title}
            </h3>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '300px', margin: '0 auto', lineHeight: 1.5 }}>
                {message}
            </p>
            {actionLink && (
                <Link
                    to={actionLink}
                    style={{
                        marginTop: '1.5rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.875rem 2rem',
                        background: 'var(--accent-primary)',
                        color: 'white',
                        borderRadius: '14px',
                        textDecoration: 'none',
                        fontWeight: 700,
                        transition: 'all 0.2s',
                        boxShadow: 'var(--shadow-md)'
                    }}
                >
                    {actionText} <ArrowRight size={18} />
                </Link>
            )}
        </div>
    );
}
