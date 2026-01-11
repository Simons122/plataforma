import React, { useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import { Calendar, Clock, User, Building2, DollarSign, X, LogOut, ArrowLeft } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';

export default function ClientBookings() {
    const [loading, setLoading] = useState(true);
    const [bookings, setBookings] = useState([]);
    const [user, setUser] = useState(null);
    const [cancelling, setCancelling] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
            if (currentUser) {
                // Verificar se é cliente
                const clientDoc = await getDocs(query(collection(db, 'clients'), where('__name__', '==', currentUser.uid)));

                if (clientDoc.empty) {
                    // Não é cliente, redirecionar
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
            // Buscar todas as marcações do cliente (pode estar em diferentes profissionais)
            const professionalsSnap = await getDocs(collection(db, 'professionals'));
            const allBookings = [];

            for (const professionalDoc of professionalsSnap.docs) {
                const bookingsRef = collection(db, 'professionals', professionalDoc.id, 'bookings');
                const q = query(bookingsRef, where('clientEmail', '==', email));
                const bookingsSnap = await getDocs(q);

                bookingsSnap.forEach((bookingDoc) => {
                    allBookings.push({
                        id: bookingDoc.id,
                        professionalId: professionalDoc.id,
                        professionalName: professionalDoc.data().name,
                        businessName: professionalDoc.data().businessName,
                        ...bookingDoc.data()
                    });
                });
            }

            // Ordenar por data (mais recente primeiro)
            allBookings.sort((a, b) => new Date(b.selectedTime) - new Date(a.selectedTime));
            setBookings(allBookings);
        } catch (error) {
            console.error('Erro ao carregar marcações:', error);
        }
    };

    const handleCancelBooking = async (booking) => {
        if (!confirm('Tem certeza que deseja cancelar esta marcação?')) return;

        setCancelling(booking.id);
        try {
            const bookingRef = doc(db, 'professionals', booking.professionalId, 'bookings', booking.id);
            await updateDoc(bookingRef, {
                status: 'cancelled',
                cancelledAt: new Date().toISOString()
            });

            // Atualizar localmente
            setBookings(prevBookings =>
                prevBookings.map(b =>
                    b.id === booking.id ? { ...b, status: 'cancelled' } : b
                )
            );

            alert('Marcação cancelada com sucesso!');
        } catch (error) {
            console.error('Erro ao cancelar:', error);
            alert('Erro ao cancelar marcação. Tente novamente.');
        } finally {
            setCancelling(null);
        }
    };

    const handleLogout = async () => {
        await auth.signOut();
        navigate('/client/auth');
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
                <div className="spinner"></div>
            </div>
        );
    }

    const upcomingBookings = bookings.filter(b => b.status !== 'cancelled' && new Date(b.selectedTime) > new Date());
    const pastBookings = bookings.filter(b => b.status === 'cancelled' || new Date(b.selectedTime) <= new Date());

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: '2rem 1rem' }}>
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>

                {/* Header */}
                <div style={{
                    background: 'var(--bg-card)',
                    borderRadius: '20px',
                    padding: '2rem',
                    marginBottom: '2rem',
                    border: '1px solid var(--border-default)',
                    boxShadow: 'var(--shadow-lg)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <div>
                            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                                Minhas Marcações
                            </h1>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
                                Olá, <strong>{user?.displayName || user?.email}</strong>
                            </p>
                        </div>
                        <button
                            onClick={handleLogout}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.625rem 1rem',
                                background: 'var(--bg-secondary)',
                                border: '1px solid var(--border-default)',
                                borderRadius: '10px',
                                color: 'var(--text-primary)',
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-elevated)'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                        >
                            <LogOut size={16} />
                            Sair
                        </button>
                    </div>
                </div>

                {/* Upcoming Bookings */}
                {upcomingBookings.length > 0 && (
                    <div style={{ marginBottom: '2rem' }}>
                        <h2 style={{
                            fontSize: '1.25rem',
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            marginBottom: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}>
                            <Calendar size={20} style={{ color: 'var(--accent-primary)' }} />
                            Próximas Marcações ({upcomingBookings.length})
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {upcomingBookings.map(booking => (
                                <BookingCard
                                    key={booking.id}
                                    booking={booking}
                                    onCancel={handleCancelBooking}
                                    cancelling={cancelling === booking.id}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Past/Cancelled Bookings */}
                {pastBookings.length > 0 && (
                    <div>
                        <h2 style={{
                            fontSize: '1.25rem',
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            marginBottom: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}>
                            <Clock size={20} style={{ color: 'var(--text-muted)' }} />
                            Histórico ({pastBookings.length})
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {pastBookings.map(booking => (
                                <BookingCard
                                    key={booking.id}
                                    booking={booking}
                                    isPast={true}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {bookings.length === 0 && (
                    <div style={{
                        background: 'var(--bg-card)',
                        borderRadius: '20px',
                        padding: '4rem 2rem',
                        textAlign: 'center',
                        border: '1px solid var(--border-default)'
                    }}>
                        <Calendar size={64} style={{ color: 'var(--text-muted)', margin: '0 auto 1.5rem' }} />
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                            Nenhuma Marcação
                        </h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                            Você ainda não tem marcações agendadas.
                        </p>
                        <Link
                            to="/"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.75rem 1.5rem',
                                background: 'var(--accent-primary)',
                                color: 'white',
                                borderRadius: '12px',
                                textDecoration: 'none',
                                fontWeight: 600,
                                transition: 'all 0.2s'
                            }}
                        >
                            <ArrowLeft size={16} />
                            Fazer Marcação
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}

function BookingCard({ booking, onCancel, isPast, cancelling }) {
    const bookingDate = parseISO(booking.selectedTime);
    const isUpcoming = new Date(booking.selectedTime) > new Date() && booking.status !== 'cancelled';

    return (
        <div style={{
            background: 'var(--bg-card)',
            borderRadius: '16px',
            padding: '1.5rem',
            border: `1px solid ${isUpcoming ? 'var(--accent-primary)' : 'var(--border-default)'}`,
            boxShadow: isUpcoming ? 'var(--shadow-glow)' : 'var(--shadow-sm)',
            opacity: booking.status === 'cancelled' ? 0.6 : 1
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <Building2 size={18} style={{ color: 'var(--accent-primary)' }} />
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {booking.businessName || booking.professionalName}
                        </h3>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        {booking.serviceName}
                    </p>
                </div>

                {booking.status === 'cancelled' && (
                    <span style={{
                        padding: '0.375rem 0.75rem',
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: 'var(--accent-danger)',
                        borderRadius: '8px',
                        fontSize: '0.75rem',
                        fontWeight: 600
                    }}>
                        CANCELADA
                    </span>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: isUpcoming && '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Calendar size={16} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                        {format(bookingDate, "dd 'de' MMMM", { locale: pt })}
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Clock size={16} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                        {format(bookingDate, 'HH:mm')}
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <DollarSign size={16} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                        {booking.price}€
                    </span>
                </div>
            </div>

            {isUpcoming && onCancel && (
                <button
                    onClick={() => onCancel(booking)}
                    disabled={cancelling}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        width: '100%',
                        padding: '0.75rem',
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        borderRadius: '10px',
                        color: 'var(--accent-danger)',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        cursor: cancelling ? 'wait' : 'pointer',
                        transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => !cancelling && (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)')}
                    onMouseOut={(e) => !cancelling && (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)')}
                >
                    <X size={16} />
                    {cancelling ? 'Cancelando...' : 'Cancelar Marcação'}
                </button>
            )}
        </div>
    );
}
