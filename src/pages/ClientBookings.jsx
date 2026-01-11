import React, { useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, collectionGroup, getDoc } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import { Calendar, Clock, MapPin, Building2, Euro, X, ArrowLeft, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import Layout from '../components/Layout';

export default function ClientBookings() {
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
        try {
            // Use collectionGroup to find bookings across all collections named 'bookings'
            // This includes both owner bookings and staff bookings
            const q = query(collectionGroup(db, 'bookings'), where('clientEmail', '==', email));
            const querySnapshot = await getDocs(q);

            const bookingsData = [];
            const professionalCache = {}; // Cache to avoid refetching same professional data

            for (const docSnapshot of querySnapshot.docs) {
                const booking = { id: docSnapshot.id, ...docSnapshot.data() };
                const pathSegments = docSnapshot.ref.path.split('/');

                // Path format: 
                // Owner: professionals/{ownerId}/bookings/{bookingId}
                // Staff: professionals/{ownerId}/staff/{staffId}/bookings/{bookingId}

                const ownerId = pathSegments[1];
                let professionalData = professionalCache[ownerId];

                if (!professionalData) {
                    // Fetch professional/owner details if not in cache
                    const profDoc = await getDoc(doc(db, 'professionals', ownerId));
                    if (profDoc.exists()) {
                        professionalData = {
                            professionalId: profDoc.id,
                            businessName: profDoc.data().businessName,
                            professionalName: profDoc.data().name, // Fallback name
                            logoUrl: profDoc.data().logoUrl,
                            profession: profDoc.data().profession
                        };
                        professionalCache[ownerId] = professionalData;
                    }
                }

                if (professionalData) {
                    bookingsData.push({
                        ...booking,
                        ...professionalData,
                        docPath: docSnapshot.ref.path
                    });
                }
            }

            bookingsData.sort((a, b) => new Date(b.date || b.selectedTime) - new Date(a.date || a.selectedTime));
            setBookings(bookingsData);
        } catch (error) {
            console.error('Erro ao carregar marcações:', error);
        }
    };

    const handleCancelBooking = async (booking) => {
        if (!confirm('Tem certeza que deseja cancelar esta marcação?')) return;

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
                        Minhas Marcações
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem' }}>
                        Gerencie seus agendamentos e consulte seu histórico.
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
                        label="Próximas"
                        count={upcomingBookings.length}
                    />
                    <TabButton
                        active={activeTab === 'history'}
                        onClick={() => setActiveTab('history')}
                        icon={Clock}
                        label="Histórico"
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
                                    />
                                ))}
                            </div>
                        ) : (
                            <EmptyState
                                title="Sem agendamentos futuros"
                                message="Que tal marcar algo novo para esta semana?"
                                actionLink="/client/explore"
                                actionText="Explorar Profissionais"
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
                                    />
                                ))}
                            </div>
                        ) : (
                            <EmptyState
                                title="Histórico vazio"
                                message="As suas marcações passadas aparecerão aqui."
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

function BookingCard({ booking, onCancel, isPast, cancelling }) {
    const dateStr = booking.date || booking.selectedTime;
    const bookingDate = parseISO(dateStr);
    const isUpcoming = new Date(dateStr) > new Date() && booking.status !== 'cancelled';
    const isCancelled = booking.status === 'cancelled';

    return (
        <div
            className="booking-card"
            style={{
                background: 'var(--bg-card)',
                borderRadius: '20px',
                padding: '1.5rem',
                border: '1px solid var(--border-default)',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem'
            }}
        >
            {/* Status Indicator Bar */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                bottom: 0,
                width: '4px',
                background: isCancelled ? 'var(--accent-danger)' : (isPast ? 'var(--text-muted)' : 'var(--accent-success)')
            }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingLeft: '0.5rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    {/* Avatar / Logo */}
                    <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '16px',
                        background: booking.logoUrl ? 'transparent' : 'linear-gradient(135deg, var(--bg-secondary), var(--bg-elevated))',
                        border: '1px solid var(--border-default)',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                    }}>
                        {booking.logoUrl ? (
                            <img src={booking.logoUrl} alt={booking.businessName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                                {(booking.businessName || booking.professionalName || '?').charAt(0).toUpperCase()}
                            </span>
                        )}
                    </div>

                    <div>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                            {booking.businessName || booking.professionalName}
                        </h3>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                            {booking.profession && <span style={{ background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>{booking.profession}</span>}
                            <span>{booking.serviceName}</span>
                        </p>
                    </div>
                </div>

                {isCancelled ? (
                    <span style={{ padding: '6px 12px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-danger)', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <AlertCircle size={14} /> Cancelada
                    </span>
                ) : (
                    <span style={{
                        padding: '6px 12px',
                        background: isPast ? 'var(--bg-secondary)' : 'rgba(34, 197, 94, 0.1)',
                        color: isPast ? 'var(--text-muted)' : 'var(--accent-success)',
                        borderRadius: '20px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                    }}>
                        {isPast ? 'Concluída' : <><CheckCircle2 size={14} /> Confirmada</>}
                    </span>
                )}
            </div>

            <div style={{ height: '1px', background: 'var(--border-default)', margin: '0 0.5rem' }} />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', paddingLeft: '0.5rem' }}>
                <InfoItem
                    icon={Calendar}
                    label="Data"
                    value={format(bookingDate, "EEEE, d MMM", { locale: pt })}
                    highlight={isUpcoming}
                />
                <InfoItem
                    icon={Clock}
                    label="Horário"
                    value={format(bookingDate, 'HH:mm')}
                    highlight={isUpcoming}
                />
                <InfoItem
                    icon={Euro}
                    label="Preço"
                    value={`${booking.price}€`}
                />
                <InfoItem
                    icon={Clock}
                    label="Duração"
                    value={`${booking.duration || 30} min`}
                    subtle
                />
            </div>

            {isUpcoming && onCancel && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem', paddingLeft: '0.5rem' }}>
                    <button
                        onClick={() => onCancel(booking)}
                        disabled={cancelling}
                        className="cancel-btn"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.625rem 1.25rem',
                            background: 'transparent',
                            borderRadius: '10px',
                            color: 'var(--accent-danger)',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            cursor: cancelling ? 'wait' : 'pointer',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            transition: 'all 0.2s'
                        }}
                    >
                        <X size={16} />
                        {cancelling ? 'A cancelar...' : 'Cancelar Reserva'}
                    </button>
                </div>
            )}
        </div>
    );
}

function InfoItem({ icon: Icon, label, value, highlight, subtle }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <Icon size={12} /> {label}
            </span>
            <span style={{
                fontSize: '1rem',
                fontWeight: 600,
                color: highlight ? 'var(--accent-primary)' : (subtle ? 'var(--text-secondary)' : 'var(--text-primary)')
            }}>
                {value}
            </span>
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
