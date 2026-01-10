import React, { useEffect, useState } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, getDocs, getDoc, doc } from 'firebase/firestore';
import Layout from '../components/Layout';
import { Users, Shield, TrendingUp, Calendar, DollarSign, Activity, ArrowUpRight, ShieldAlert } from 'lucide-react';
import { format, subDays, isAfter } from 'date-fns';
import { pt } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalProfessionals: 0,
        totalAdmins: 0,
        activeProfessionals: 0,
        pendingProfessionals: 0,
        totalBookings: 0,
        bookingsThisWeek: 0,
        revenue: 0
    });
    const [currentUserProfile, setCurrentUserProfile] = useState(null);
    const [recentActivity, setRecentActivity] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        fetchCurrentUser();
        fetchStats();
    }, []);

    const fetchCurrentUser = async () => {
        const user = auth.currentUser;
        if (user) {
            const docSnap = await getDoc(doc(db, "professionals", user.uid));
            if (docSnap.exists()) {
                setCurrentUserProfile({ id: user.uid, ...docSnap.data() });
            }
        }
    };

    const fetchStats = async () => {
        try {
            // Fetch all professionals
            const proSnap = await getDocs(collection(db, "professionals"));
            const pros = proSnap.docs.map(d => ({ id: d.id, ...d.data() }));

            const totalProfessionals = pros.filter(p => p.role === 'professional').length;
            const totalAdmins = pros.filter(p => p.role === 'admin').length;
            const activeProfessionals = pros.filter(p => p.role === 'professional' && ['paid', 'active'].includes(p.paymentStatus)).length;
            const pendingProfessionals = pros.filter(p => p.role === 'professional' && p.paymentStatus === 'pending').length;

            // Fetch all bookings from all professionals
            let allBookings = [];
            for (const pro of pros.filter(p => p.role === 'professional')) {
                const bookingsSnap = await getDocs(collection(db, `professionals/${pro.id}/bookings`));
                const bookings = bookingsSnap.docs.map(d => ({ id: d.id, proId: pro.id, ...d.data() }));
                allBookings = [...allBookings, ...bookings];
            }

            const weekAgo = subDays(new Date(), 7);
            const bookingsThisWeek = allBookings.filter(b => {
                const bookingDate = new Date(b.date);
                return isAfter(bookingDate, weekAgo);
            }).length;

            const revenue = allBookings.reduce((sum, b) => sum + (Number(b.price) || 0), 0);

            setStats({
                totalProfessionals,
                totalAdmins,
                activeProfessionals,
                pendingProfessionals,
                totalBookings: allBookings.length,
                bookingsThisWeek,
                revenue
            });

            // Recent activity (últimos profissionais registados)
            const recentPros = pros
                .filter(p => p.role === 'professional')
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, 5);

            setRecentActivity(recentPros);
        } catch (error) {
            console.error("Error fetching stats:", error);
        } finally {
            setLoading(false);
        }
    };

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

    return (
        <Layout role="admin" brandName="Administração">
            {/* Header */}
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                    Dashboard Admin
                </h1>
                <p style={{ color: 'var(--text-secondary)' }}>
                    {currentUserProfile?.superAdmin && (
                        <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '4px 12px',
                            background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                            borderRadius: '6px',
                            color: 'white',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            marginRight: '0.5rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            boxShadow: '0 4px 12px rgba(168, 85, 247, 0.5)'
                        }}>
                            <ShieldAlert size={14} />
                            Super Admin
                        </span>
                    )}
                    Visão geral da plataforma
                </p>
            </div>

            {/* Stats Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1.5rem',
                marginBottom: '2rem'
            }}>
                <StatCard
                    icon={Users}
                    label="Total Profissionais"
                    value={stats.totalProfessionals}
                    color="#3b82f6"
                    subtitle={`${stats.activeProfessionals} ativos`}
                    onClick={() => navigate('/admin/users')}
                />
                <StatCard
                    icon={Shield}
                    label="Administradores"
                    value={stats.totalAdmins}
                    color="#7c3aed"
                    subtitle="Equipa de gestão"
                    onClick={() => navigate('/admin/users')}
                />
                <StatCard
                    icon={Calendar}
                    label="Marcações Total"
                    value={stats.totalBookings}
                    color="#10b981"
                    subtitle={`${stats.bookingsThisWeek} esta semana`}
                />
                <StatCard
                    icon={DollarSign}
                    label="Volume Total"
                    value={`${stats.revenue}€`}
                    color="#f59e0b"
                    subtitle="Receita acumulada"
                />
            </div>

            {/* Quick Actions & Recent Activity */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '1.5rem'
            }}>
                {/* Quick Actions */}
                <div style={{
                    background: 'var(--bg-card)',
                    borderRadius: '16px',
                    border: '1px solid var(--border-default)',
                    padding: '1.5rem',
                    boxShadow: 'var(--shadow-sm)'
                }}>
                    <h3 style={{
                        fontSize: '1rem',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        marginBottom: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                        <Activity size={20} />
                        Ações Rápidas
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <ActionButton
                            label="Gerir Utilizadores"
                            icon={Users}
                            onClick={() => navigate('/admin/users')}
                        />
                        {currentUserProfile?.superAdmin && (
                            <ActionButton
                                label="Configurações Admin"
                                icon={Shield}
                                onClick={() => navigate('/admin/settings')}
                                purple
                            />
                        )}
                        <ActionButton
                            label="Ver Pendentes"
                            icon={TrendingUp}
                            badge={stats.pendingProfessionals}
                            onClick={() => navigate('/admin/users')}
                        />
                    </div>
                </div>

                {/* Recent Activity */}
                <div style={{
                    background: 'var(--bg-card)',
                    borderRadius: '16px',
                    border: '1px solid var(--border-default)',
                    padding: '1.5rem',
                    boxShadow: 'var(--shadow-sm)'
                }}>
                    <h3 style={{
                        fontSize: '1rem',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        marginBottom: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                        <TrendingUp size={20} />
                        Registos Recentes
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {recentActivity.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '1rem' }}>
                                Nenhum registo recente
                            </p>
                        ) : (
                            recentActivity.map(pro => (
                                <div
                                    key={pro.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        padding: '0.75rem',
                                        background: 'var(--bg-elevated)',
                                        borderRadius: '10px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onClick={() => navigate('/admin/users')}
                                    onMouseOver={e => {
                                        e.currentTarget.style.background = 'var(--bg-primary)';
                                        e.currentTarget.style.transform = 'translateX(4px)';
                                    }}
                                    onMouseOut={e => {
                                        e.currentTarget.style.background = 'var(--bg-elevated)';
                                        e.currentTarget.style.transform = 'translateX(0)';
                                    }}
                                >
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '50%',
                                        background: 'linear-gradient(135deg, var(--accent-primary), #6366f1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'white',
                                        fontWeight: 700,
                                        fontSize: '0.875rem',
                                        flexShrink: 0
                                    }}>
                                        {pro.name?.charAt(0)}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{
                                            fontSize: '0.875rem',
                                            fontWeight: 600,
                                            color: 'var(--text-primary)',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {pro.name}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            {pro.createdAt ? format(new Date(pro.createdAt), "d MMM yyyy", { locale: pt }) : 'Data N/A'}
                                        </div>
                                    </div>
                                    <ArrowUpRight size={16} style={{ color: 'var(--text-muted)' }} />
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
}

function StatCard({ icon: Icon, label, value, color, subtitle, onClick }) {
    const [hovered, setHovered] = useState(false);

    return (
        <div
            onClick={onClick}
            onMouseOver={() => setHovered(true)}
            onMouseOut={() => setHovered(false)}
            style={{
                padding: '1.5rem',
                background: 'var(--bg-card)',
                borderRadius: '16px',
                border: '1px solid var(--border-default)',
                boxShadow: hovered ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
                cursor: onClick ? 'pointer' : 'default',
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            <div style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '120px',
                height: '120px',
                background: `radial-gradient(circle at center, ${color}15 0%, transparent 70%)`,
                opacity: hovered ? 1 : 0.5,
                transition: 'opacity 0.3s ease'
            }} />

            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem', position: 'relative', zIndex: 1 }}>
                <div style={{
                    padding: '0.75rem',
                    background: `${color}15`,
                    borderRadius: '12px',
                    color: color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <Icon size={24} strokeWidth={2} />
                </div>
            </div>

            <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{
                    fontSize: '2rem',
                    fontWeight: 800,
                    color: 'var(--text-primary)',
                    letterSpacing: '-0.02em',
                    marginBottom: '0.25rem'
                }}>
                    {value}
                </div>
                <div style={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    marginBottom: '0.25rem'
                }}>
                    {label}
                </div>
                {subtitle && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {subtitle}
                    </div>
                )}
            </div>
        </div>
    );
}

function ActionButton({ label, icon: Icon, badge, onClick, purple }) {
    return (
        <button
            onClick={onClick}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.875rem 1rem',
                background: purple ? 'linear-gradient(135deg, #7c3aed15, #a855f715)' : 'var(--bg-elevated)',
                border: `1px solid ${purple ? '#7c3aed30' : 'var(--border-default)'}`,
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                width: '100%'
            }}
            onMouseOver={e => {
                e.currentTarget.style.transform = 'translateX(4px)';
                e.currentTarget.style.borderColor = purple ? '#7c3aed' : 'var(--accent-primary)';
            }}
            onMouseOut={e => {
                e.currentTarget.style.transform = 'translateX(0)';
                e.currentTarget.style.borderColor = purple ? '#7c3aed30' : 'var(--border-default)';
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                    padding: '0.5rem',
                    background: purple ? '#7c3aed20' : 'var(--bg-primary)',
                    borderRadius: '8px',
                    color: purple ? '#7c3aed' : 'var(--accent-primary)',
                    display: 'flex'
                }}>
                    <Icon size={18} />
                </div>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {label}
                </span>
            </div>
            {badge !== undefined && badge > 0 && (
                <span style={{
                    padding: '2px 8px',
                    background: 'var(--accent-warning)',
                    color: 'white',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: 700
                }}>
                    {badge}
                </span>
            )}
        </button>
    );
}
