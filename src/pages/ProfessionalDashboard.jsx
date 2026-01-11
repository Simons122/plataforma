import React, { useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, collection, getDocs, updateDoc } from 'firebase/firestore';
import { CalendarDays, Sparkles, CalendarClock, LineChart, ArrowRight, Lock, ChevronRight, CalendarCheck2, UserPlus, Wallet, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, isToday, isAfter } from 'date-fns';
import { pt } from 'date-fns/locale';
import Layout from '../components/Layout';
import { useToast } from '../components/Toast';
import ManualBookingModal from '../components/ManualBookingModal';
import { Plus } from 'lucide-react';

export default function ProfessionalDashboard() {
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState(null);
    const [stats, setStats] = useState({ services: 0, bookingsToday: 0, bookingsMonth: 0, revenueMonth: 0 });
    const [todayBookings, setTodayBookings] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const navigate = useNavigate();
    const toast = useToast();

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user) {
                try {
                    let profileData = null;
                    let isStaffUser = false;
                    let ownerId = user.uid;

                    // 1. Try Professional (Owner)
                    const docRef = doc(db, "professionals", user.uid);
                    const docSnap = await getDoc(docRef);

                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        profileData = { id: user.uid, role: 'professional', ...data };

                        // Backfill Slug if missing (Owner only)
                        if (!data.slug) {
                            const slugify = (text) => {
                                return text
                                    .toString()
                                    .toLowerCase()
                                    .normalize('NFD')
                                    .replace(/[\u0300-\u036f]/g, '')
                                    .replace(/\s+/g, '-')
                                    .replace(/[^\w\-]+/g, '')
                                    .replace(/\-\-+/g, '-')
                                    .replace(/-+$/, '');
                            };
                            const newSlug = slugify(data.businessName || data.name || user.uid);
                            // Optimistic update
                            profileData.slug = newSlug;
                            try {
                                await updateDoc(docRef, { slug: newSlug });
                            } catch (err) {
                                console.error("Error backfilling slug", err);
                            }
                        }
                    } else {
                        // 2. Try Staff Lookup
                        const lookupRef = doc(db, "staff_lookup", user.uid);
                        const lookupSnap = await getDoc(lookupRef);
                        if (lookupSnap.exists()) {
                            isStaffUser = true;
                            const lookupData = lookupSnap.data();
                            ownerId = lookupData.ownerId;

                            const staffDoc = await getDoc(doc(db, `professionals/${ownerId}/staff/${lookupData.staffId}`));
                            if (staffDoc.exists()) {
                                profileData = {
                                    id: lookupData.staffId,
                                    ...staffDoc.data(),
                                    ownerId: ownerId,
                                    isStaff: true,
                                    role: 'staff',
                                    paymentStatus: 'active' // Assume active if owner exists (refine later if needed)
                                };
                            }
                        }
                    }

                    if (profileData) {
                        setProfile(profileData);

                        // Fetch Data for Stats
                        // Services are global (Owner's services)
                        const servicesSnap = await getDocs(collection(db, `professionals/${ownerId}/services`));

                        let allBookings = [];
                        if (isStaffUser) {
                            // Staff Bookings
                            const bookingsSnap = await getDocs(collection(db, `professionals/${ownerId}/staff/${profileData.id}/bookings`));
                            allBookings = bookingsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                        } else {
                            // Owner Bookings (Main collection)
                            const bookingsSnap = await getDocs(collection(db, `professionals/${ownerId}/bookings`));
                            allBookings = bookingsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                        }

                        // Filter today's bookings
                        const todaysBookings = allBookings
                            .filter(b => {
                                const bookingDate = parseISO(b.date);
                                return isToday(bookingDate) && isAfter(bookingDate, new Date());
                            })
                            .sort((a, b) => new Date(a.date) - new Date(b.date));

                        setTodayBookings(todaysBookings);

                        const thisMonth = new Date().toISOString().slice(0, 7);
                        const bookingsThisMonth = allBookings.filter(d => d.date?.startsWith(thisMonth));
                        const bookingsMonth = bookingsThisMonth.length;
                        const revenueMonth = bookingsThisMonth.reduce((acc, b) => acc + (Number(b.price) || 0), 0);

                        setStats({
                            services: servicesSnap.size,
                            bookingsToday: todaysBookings.length,
                            bookingsMonth,
                            revenueMonth
                        });
                    }
                } catch (e) {
                    console.error("Dashboard Error:", e);
                }
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [refreshTrigger]);

    const refetchData = () => setRefreshTrigger(prev => prev + 1);

    if (loading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-primary)'
            }}>
                <div className="spinner"></div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                flexDirection: 'column',
                gap: '1rem'
            }}>
                <p>Perfil não encontrado.</p>
                <button
                    onClick={() => { auth.signOut(); navigate('/auth'); }}
                    style={{ padding: '0.5rem 1rem', background: 'var(--accent-primary)', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
                >
                    Voltar ao Login
                </button>
            </div>
        );
    }

    // Payment Gate
    if (!['paid', 'active'].includes(profile.paymentStatus) && profile.role !== 'admin') {
        return (
            <Layout role="professional" restricted={true}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 'calc(100vh - 100px)',
                    padding: '1rem'
                }}>
                    <div style={{
                        maxWidth: '400px',
                        textAlign: 'center',
                        padding: '2rem',
                        background: 'var(--bg-card)',
                        borderRadius: '16px',
                        border: '1px solid var(--border-default)',
                        boxShadow: 'var(--shadow-md)'
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            marginBottom: '1.5rem'
                        }}>
                            <div style={{
                                width: '72px',
                                height: '72px',
                                background: 'rgba(234, 179, 8, 0.1)',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#eab308',
                                flexShrink: 0
                            }}>
                                <Lock size={32} strokeWidth={2} />
                            </div>
                        </div>
                        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                            Acesso Pendente
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                            A sua conta foi criada com sucesso, mas o pagamento encontra-se{' '}
                            <span style={{ color: '#eab308', fontWeight: 600 }}>pendente</span>.
                            <br />Aguarde a aprovação do administrador.
                        </p>
                    </div>
                </div>
            </Layout>
        );
    }

    const bookingLink = `${window.location.origin}/book/${profile.slug}`;

    return (
        <Layout role={profile.role || 'professional'}>
            {/* Header */}
            <div style={{ marginBottom: '1.5rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--text-primary)' }}>
                    Olá, {profile.name?.split(' ')[0]} 👋
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
                    Aqui está o resumo da sua atividade.
                </p>
            </div>

            {/* Stats Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                marginBottom: '2rem'
            }}>
                <StatCard icon={CalendarCheck2} label="Marcações Hoje" value={stats.bookingsToday} color="var(--accent-primary)" trend="Agenda ativa" />
                <StatCard icon={LineChart} label="Volume Mensal" value={stats.bookingsMonth} color="var(--accent-success)" trend="+12% que ontem" />
                <StatCard icon={Wallet} label="Faturação Mês" value={`${stats.revenueMonth}€`} color="var(--accent-warning)" trend="Saldo previsto" />
                <StatCard icon={Sparkles} label="Catálogo" value={stats.services} color="var(--accent-info)" trend="Serviços ativos" />
            </div>

            {/* Today's Bookings Preview */}
            <div style={{
                background: 'var(--bg-card)',
                borderRadius: '14px',
                border: '1px solid var(--border-default)',
                marginBottom: '1.5rem',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-sm)'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1.25rem 1.5rem',
                    background: 'linear-gradient(to right, var(--bg-card), var(--bg-primary))',
                    borderBottom: '1px solid var(--border-default)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                            width: '32px',
                            height: '32px',
                            background: 'color-mix(in srgb, var(--accent-primary), transparent 90%)',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--accent-primary)',
                            position: 'relative'
                        }}>
                            <CalendarDays size={18} strokeWidth={1.75} />
                            {todayBookings.length > 0 && (
                                <span style={{
                                    position: 'absolute',
                                    top: '-2px',
                                    right: '-2px',
                                    width: '8px',
                                    height: '8px',
                                    background: '#22c55e',
                                    borderRadius: '50%',
                                    border: '2px solid var(--bg-card)',
                                    animation: 'pulse 2s infinite'
                                }} />
                            )}
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Agenda de Hoje</h3>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                                {format(new Date(), "EEEE, d 'de' MMMM", { locale: pt })}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate('/dashboard/agenda')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.625rem 1rem',
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--border-default)',
                            borderRadius: '10px',
                            color: 'var(--text-primary)',
                            fontSize: '0.8125rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.borderColor = 'var(--accent-primary)';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.15)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border-default)';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    >
                        Ver agenda completa <ChevronRight size={14} />
                    </button>
                </div>

                {todayBookings.length === 0 ? (
                    <div style={{
                        padding: '2rem',
                        textAlign: 'center',
                        color: 'var(--text-muted)'
                    }}>
                        <Clock size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                        <p style={{ fontSize: '0.875rem' }}>Nenhuma marcação para hoje.</p>
                    </div>
                ) : (
                    <div>
                        {todayBookings.slice(0, 3).map((booking, idx) => (
                            <div
                                key={booking.id}
                                onClick={() => navigate('/dashboard/agenda')}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1rem',
                                    padding: '0.875rem 1.25rem',
                                    borderBottom: idx < Math.min(todayBookings.length, 3) - 1 ? '1px solid var(--border-default)' : 'none',
                                    cursor: 'pointer',
                                    transition: 'background 0.15s ease'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-elevated)'}
                                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                <div style={{
                                    width: '56px',
                                    height: '56px',
                                    background: 'linear-gradient(135deg, var(--bg-elevated), var(--bg-card))',
                                    border: '1px solid var(--border-default)',
                                    borderRadius: '14px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    boxShadow: 'var(--shadow-sm)'
                                }}>
                                    <span style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--accent-primary)', letterSpacing: '-0.02em' }}>
                                        {format(parseISO(booking.date), 'HH:mm')}
                                    </span>
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        fontSize: '1rem',
                                        fontWeight: 600,
                                        color: 'var(--text-primary)',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        marginBottom: '0.125rem'
                                    }}>
                                        {booking.clientName}
                                    </div>
                                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{ padding: '2px 6px', background: 'color-mix(in srgb, var(--accent-primary), transparent 92%)', borderRadius: '4px', color: 'var(--accent-primary)' }}>{booking.serviceName}</span>
                                        <span>•</span>
                                        <span>{booking.duration} min</span>
                                    </div>
                                </div>
                                <div style={{
                                    padding: '0.5rem',
                                    borderRadius: '8px',
                                    background: 'var(--bg-primary)',
                                    color: 'var(--text-muted)'
                                }}>
                                    <ChevronRight size={18} strokeWidth={1.5} />
                                </div>
                            </div>
                        ))}
                        {todayBookings.length > 3 && (
                            <div
                                onClick={() => navigate('/dashboard/agenda')}
                                style={{
                                    padding: '0.75rem',
                                    textAlign: 'center',
                                    background: 'color-mix(in srgb, var(--accent-primary), transparent 95%)',
                                    color: 'var(--accent-primary)',
                                    fontSize: '0.8125rem',
                                    fontWeight: 500,
                                    cursor: 'pointer'
                                }}
                            >
                                + {todayBookings.length - 3} mais marcações
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Quick Actions */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '0.75rem',
                marginBottom: '1.5rem'
            }}>
                <ActionCard
                    icon={UserPlus}
                    title="Marcar Cliente"
                    onClick={() => setIsModalOpen(true)}
                    highlight={true}
                />

                {!profile.isStaff && (
                    <>
                        <ActionCard
                            icon={Sparkles}
                            title="Serviços"
                            onClick={() => navigate('/dashboard/services')}
                        />
                        <ActionCard
                            icon={CalendarClock}
                            title="Horários"
                            onClick={() => navigate('/dashboard/schedule')}
                        />
                    </>
                )}
            </div>

            {/* Share Section */}
            {!profile.isStaff && (
                <div style={{
                    padding: '1.25rem 1.75rem',
                    background: 'var(--bg-card)',
                    borderRadius: '16px',
                    border: '1px solid var(--border-default)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1.5rem',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        width: '150px',
                        height: '150px',
                        background: 'radial-gradient(circle at center, var(--accent-primary) 0%, transparent 70%)',
                        opacity: 0.03,
                        filter: 'blur(40px)',
                        zIndex: 0
                    }} />

                    <div style={{ minWidth: 0, flex: 1, position: 'relative', zIndex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <div style={{ width: '6px', height: '6px', background: 'var(--accent-primary)', borderRadius: '50%' }} />
                            <h4 style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800 }}>
                                O Seu Link de Marcações
                            </h4>
                        </div>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            background: 'var(--bg-primary)',
                            padding: '0.75rem 1rem',
                            borderRadius: '10px',
                            border: '1px solid var(--border-default)'
                        }}>
                            <code style={{
                                fontSize: '0.875rem',
                                color: 'var(--text-secondary)',
                                fontFamily: 'var(--font-mono)',
                                display: 'block',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                flex: 1
                            }}>
                                {window.location.origin}/book/{profile.slug}
                            </code>
                            <div style={{
                                width: '4px',
                                height: '4px',
                                background: 'var(--border-default)',
                                borderRadius: '50%'
                            }} />
                            <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Público</span>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            navigator.clipboard.writeText(bookingLink);
                            toast.success('Link copiado com sucesso!');
                        }}
                        style={{
                            padding: '0.875rem 2rem',
                            background: 'var(--accent-primary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            fontSize: '0.875rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                            boxShadow: 'var(--shadow-md)',
                            position: 'relative',
                            zIndex: 1
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.background = 'var(--accent-primary-hover)';
                            e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                            e.currentTarget.style.boxShadow = 'var(--shadow-glow)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.background = 'var(--accent-primary)';
                            e.currentTarget.style.transform = 'translateY(0) scale(1)';
                            e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                        }}
                    >
                        Copiar Link
                    </button>
                </div>
            )}

            {/* Manual Booking Modal */}
            <ManualBookingModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                professionalId={profile.id}
                ownerId={profile.ownerId || profile.id}
                isStaff={profile.isStaff}
                onBookingAdded={refetchData}
            />
        </Layout>
    );
}

function StatCard({ icon: Icon, label, value, color, trend }) {
    const [hovered, setHovered] = useState(false);

    return (
        <div
            onMouseOver={() => setHovered(true)}
            onMouseOut={() => setHovered(false)}
            style={{
                padding: '1.25rem',
                background: 'var(--bg-card)',
                borderRadius: '16px',
                border: '1px solid var(--border-default)',
                boxShadow: hovered ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            <div style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '60px',
                height: '60px',
                background: `radial-gradient(circle at center, ${color} 0%, transparent 70%)`,
                opacity: hovered ? 0.1 : 0.05,
                filter: 'blur(20px)',
                zIndex: 0
            }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
                <div style={{
                    padding: '0.625rem',
                    background: `color-mix(in srgb, ${color}, transparent 88%)`,
                    borderRadius: '12px',
                    color: color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `1px solid color-mix(in srgb, ${color}, transparent 80%)`
                }}>
                    <Icon size={20} strokeWidth={2} />
                </div>
                {trend && (
                    <span style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {trend}
                    </span>
                )}
            </div>

            <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: '0.125rem' }}>
                    {value}
                </div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                    {label}
                </div>
            </div>
        </div>
    );
}

function ActionCard({ icon: Icon, title, onClick, highlight = false }) {
    const [hovered, setHovered] = React.useState(false);

    const bg = highlight
        ? (hovered ? 'linear-gradient(135deg, #2563eb, #3b82f6)' : 'linear-gradient(135deg, #3b82f6, #60a5fa)')
        : (hovered ? 'var(--bg-elevated)' : 'var(--bg-card)');

    const borderColor = highlight
        ? (hovered ? 'var(--accent-primary)' : 'rgba(59, 130, 246, 0.5)')
        : (hovered ? 'var(--border-hover)' : 'var(--border-default)');

    return (
        <button
            onClick={onClick}
            onMouseOver={() => setHovered(true)}
            onMouseOut={() => setHovered(false)}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '1rem',
                background: bg,
                borderRadius: '14px',
                border: '1px solid',
                borderColor: borderColor,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: highlight ? 'var(--shadow-glow)' : 'var(--shadow-sm)',
                transform: hovered ? 'translateY(-2px)' : 'translateY(0)'
            }}
        >
            <div style={{
                padding: '0.5rem',
                background: highlight ? 'rgba(255, 255, 255, 0.2)' : 'color-mix(in srgb, var(--accent-primary), transparent 90%)',
                borderRadius: '8px',
                color: highlight ? 'white' : 'var(--accent-primary)'
            }}>
                <Icon size={18} strokeWidth={1.75} />
            </div>
            <span style={{
                fontSize: '0.9375rem',
                fontWeight: 600,
                color: highlight ? 'white' : 'var(--text-primary)'
            }}>
                {title}
            </span>
            <ArrowRight size={14} style={{ marginLeft: 'auto', color: highlight ? 'white' : 'var(--text-muted)', opacity: 0.7 }} />
        </button>
    );
}
