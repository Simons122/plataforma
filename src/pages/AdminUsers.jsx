import React, { useEffect, useState } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import Layout from '../components/Layout';
import { Search, Shield, ShieldAlert, Mail, Phone, ExternalLink, Building2, Briefcase, UserCog } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

export default function AdminDashboard() {
    const [loading, setLoading] = useState(true);
    const [professionals, setProfessionals] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all'); // all, professional, admin
    const [currentUserProfile, setCurrentUserProfile] = useState(null);

    useEffect(() => {
        fetchCurrentUser();
        fetchProfessionals();
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

    const fetchProfessionals = async () => {
        try {
            // Get ALL profiles
            const snap = await getDocs(collection(db, "professionals"));
            const pros = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setProfessionals(pros);
        } catch (error) {
            console.error("Error fetching professionals:", error);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (proId, newStatus) => {
        try {
            await updateDoc(doc(db, "professionals", proId), {
                paymentStatus: newStatus
            });

            // Optimistic update
            setProfessionals(prev => prev.map(p =>
                p.id === proId ? { ...p, paymentStatus: newStatus } : p
            ));
        } catch (error) {
            console.error("Error updating status:", error);
        }
    };

    const toggleAdminRole = async (proId, currentRole) => {
        if (!currentUserProfile?.superAdmin) {
            alert('Apenas o Super Admin pode gerir administradores!');
            return;
        }

        const newRole = currentRole === 'admin' ? 'professional' : 'admin';

        try {
            await updateDoc(doc(db, "professionals", proId), {
                role: newRole
            });

            // Optimistic update
            setProfessionals(prev => prev.map(p =>
                p.id === proId ? { ...p, role: newRole } : p
            ));
        } catch (error) {
            console.error("Error updating role:", error);
            alert('Erro ao atualizar role!');
        }
    };

    const filteredPros = professionals.filter(p => {
        const matchesSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.businessName?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = roleFilter === 'all' || p.role === roleFilter;
        return matchesSearch && matchesRole;
    }).sort((a, b) => {
        // 1. Super Admin (Prioridade Máxima)
        if (a.superAdmin && !b.superAdmin) return -1;
        if (!a.superAdmin && b.superAdmin) return 1;

        // 2. Admins (Segunda Prioridade)
        const aIsAdmin = a.role === 'admin';
        const bIsAdmin = b.role === 'admin';

        if (aIsAdmin && !bIsAdmin) return -1;
        if (!aIsAdmin && bIsAdmin) return 1;

        // 3. Restantes por data de criação (mais recentes primeiro) ou nome
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateB - dateA;
    });

    const getStatusColor = (status) => {
        switch (status) {
            case 'paid': return 'var(--accent-success)';
            case 'active': return 'var(--accent-success)';
            case 'pending': return 'var(--accent-warning)';
            case 'expired': return 'var(--accent-danger)';
            default: return 'var(--text-muted)';
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'paid': return 'Pago';
            case 'active': return 'Ativo';
            case 'pending': return 'Pendente';
            case 'expired': return 'Expirado';
            default: return status;
        }
    };


    return (
        <Layout role="admin" brandName="Administração">
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                    Gestão de Utilizadores
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
                    Gerencie profissionais, admins e permissões.
                </p>
            </div>

            {/* Filters */}
            <div style={{
                display: 'flex',
                gap: '1rem',
                marginBottom: '1.5rem',
                flexWrap: 'wrap'
            }}>
                <div style={{
                    flex: 1,
                    minWidth: '240px',
                    position: 'relative'
                }}>
                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        placeholder="Pesquisar por nome, email ou estabelecimento..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="input"
                        style={{ paddingLeft: '2.5rem' }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '4px' }}>
                    {[
                        { id: 'all', label: 'Todos' },
                        { id: 'professional', label: 'Profissionais' },
                        { id: 'admin', label: 'Admins' }
                    ].map(filter => (
                        <button
                            key={filter.id}
                            onClick={() => setRoleFilter(filter.id)}
                            style={{
                                padding: '0.625rem 1rem',
                                borderRadius: '8px',
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                background: roleFilter === filter.id ? 'var(--bg-elevated)' : 'transparent',
                                color: roleFilter === filter.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                                border: roleFilter === filter.id ? '1px solid var(--border-default)' : '1px solid transparent',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>
            </div >

            {/* Grid Layout */}
            < div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '1.5rem'
            }}>
                {
                    filteredPros.map(pro => {
                        const isSuperAdmin = pro.superAdmin === true;
                        const isAdmin = pro.role === 'admin';

                        return (
                            <div key={pro.id} style={{
                                background: 'var(--bg-card)',
                                border: isSuperAdmin
                                    ? '2px solid transparent'
                                    : isAdmin
                                        ? '2px solid var(--accent-primary)'
                                        : '1px solid var(--border-default)',
                                backgroundImage: isSuperAdmin
                                    ? 'linear-gradient(var(--bg-card), var(--bg-card)), linear-gradient(135deg, #7c3aed, #a855f7)'
                                    : 'none',
                                backgroundOrigin: 'border-box',
                                backgroundClip: 'padding-box, border-box',
                                borderRadius: '16px',
                                padding: '1.5rem',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '1rem',
                                transition: 'all 0.3s ease',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                                onMouseOver={e => {
                                    e.currentTarget.style.boxShadow = isSuperAdmin
                                        ? '0 12px 40px rgba(168, 85, 247, 0.4)'
                                        : 'var(--shadow-lg)';
                                }}
                                onMouseOut={e => {
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            >
                                {/* Glow effect for Super Admin */}
                                {isSuperAdmin && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '-50%',
                                        left: '-50%',
                                        width: '200%',
                                        height: '200%',
                                        background: 'radial-gradient(circle, rgba(168, 85, 247, 0.1) 0%, transparent 70%)',
                                        pointerEvents: 'none',
                                        animation: 'pulse 3s ease-in-out infinite'
                                    }} />
                                )}

                                {/* Badge */}
                                {isSuperAdmin ? (
                                    <div style={{
                                        position: 'absolute',
                                        top: '12px',
                                        right: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        padding: '4px 10px',
                                        background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                                        borderRadius: '6px',
                                        color: 'white',
                                        fontSize: '0.7rem',
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                        boxShadow: '0 4px 12px rgba(168, 85, 247, 0.5)'
                                    }}>
                                        <ShieldAlert size={12} />
                                        Super Admin
                                    </div>
                                ) : isAdmin && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '12px',
                                        right: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        padding: '4px 10px',
                                        background: 'linear-gradient(135deg, var(--accent-primary), #6366f1)',
                                        borderRadius: '6px',
                                        color: 'white',
                                        fontSize: '0.7rem',
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                        boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)'
                                    }}>
                                        <Shield size={12} />
                                        Admin
                                    </div>
                                )}

                                {/* Header */}
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                                    <div style={{
                                        width: '56px',
                                        height: '56px',
                                        borderRadius: '50%',
                                        background: isSuperAdmin
                                            ? 'linear-gradient(135deg, #7c3aed, #a855f7)'
                                            : isAdmin
                                                ? 'linear-gradient(135deg, var(--accent-primary), #6366f1)'
                                                : 'linear-gradient(135deg, var(--bg-elevated), var(--bg-secondary))',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '1.5rem',
                                        fontWeight: 700,
                                        color: (isSuperAdmin || isAdmin) ? 'white' : 'var(--accent-primary)',
                                        textTransform: 'uppercase',
                                        boxShadow: isSuperAdmin
                                            ? '0 4px 16px rgba(168, 85, 247, 0.4)'
                                            : 'var(--shadow-md)',
                                        border: '2px solid var(--bg-card)',
                                        flexShrink: 0,
                                        position: 'relative'
                                    }}>
                                        {pro.name?.charAt(0)}
                                        {/* Crown for Super Admin */}
                                        {isSuperAdmin && (
                                            <div style={{
                                                position: 'absolute',
                                                top: '-6px',
                                                right: '-6px',
                                                background: 'linear-gradient(135deg, #a855f7, #c084fc)',
                                                borderRadius: '50%',
                                                width: '20px',
                                                height: '20px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '10px',
                                                boxShadow: '0 2px 8px rgba(168, 85, 247, 0.6)',
                                                border: '2px solid var(--bg-card)'
                                            }}>
                                                👑
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <h3 style={{
                                            fontSize: '1.125rem',
                                            fontWeight: 700,
                                            color: 'var(--text-primary)',
                                            marginBottom: '0.25rem',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {pro.name}
                                        </h3>
                                        {pro.profession && (
                                            <span style={{
                                                fontSize: '0.75rem',
                                                padding: '2px 8px',
                                                background: 'var(--bg-elevated)',
                                                borderRadius: '6px',
                                                color: 'var(--text-secondary)',
                                                fontWeight: 500
                                            }}>
                                                {pro.profession}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Details - Reorganized Layout */}
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '1rem',
                                    background: 'var(--bg-elevated)',
                                    padding: '1rem',
                                    borderRadius: '12px'
                                }}>
                                    {/* Business Info Section */}
                                    {pro.businessName && (
                                        <div style={{ marginBottom: '0.25rem' }}>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem',
                                                marginBottom: '0.375rem'
                                            }}>
                                                <Building2 size={16} strokeWidth={2} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                                                <span style={{
                                                    fontSize: '0.65rem',
                                                    fontWeight: 700,
                                                    color: 'var(--text-muted)',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.05em',
                                                    lineHeight: '16px'
                                                }}>
                                                    Estabelecimento
                                                </span>
                                            </div>
                                            <div style={{
                                                paddingLeft: 'calc(16px + 0.5rem)',
                                                fontSize: '0.875rem',
                                                fontWeight: 600,
                                                color: 'var(--text-primary)',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {pro.businessName}
                                            </div>
                                        </div>
                                    )}

                                    {/* Contact Info Section */}
                                    <div>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            marginBottom: '0.5rem'
                                        }}>
                                            <Mail size={16} strokeWidth={2} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                                            <span style={{
                                                fontSize: '0.65rem',
                                                fontWeight: 700,
                                                color: 'var(--text-muted)',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.05em',
                                                lineHeight: '16px'
                                            }}>
                                                Contacto
                                            </span>
                                        </div>
                                        <div style={{ paddingLeft: 'calc(16px + 0.5rem)', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                                            <div style={{
                                                fontSize: '0.8125rem',
                                                color: 'var(--text-secondary)',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {pro.email}
                                            </div>
                                            {pro.phone && (
                                                <div style={{
                                                    fontSize: '0.8125rem',
                                                    color: 'var(--text-secondary)',
                                                    fontWeight: 500
                                                }}>
                                                    📞 {pro.phone}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Metadata Section */}
                                    <div style={{
                                        paddingTop: '0.75rem',
                                        borderTop: '1px dashed var(--border-default)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    }}>
                                        <Briefcase size={13} strokeWidth={2} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                                        <span style={{
                                            fontSize: '0.7rem',
                                            color: 'var(--text-muted)',
                                            fontWeight: 500,
                                            lineHeight: '13px'
                                        }}>
                                            Membro desde {pro.createdAt ? format(new Date(pro.createdAt), 'MMM yyyy', { locale: pt }) : 'N/A'}
                                        </span>
                                    </div>
                                </div>

                                {/* Actions Section - Reorganized */}
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.75rem',
                                    paddingTop: '1rem',
                                    borderTop: '1px solid var(--border-default)'
                                }}>
                                    {/* Primary Actions */}
                                    {(pro.role !== 'admin' || (currentUserProfile?.superAdmin && pro.id !== currentUserProfile.id)) && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                                            {/* Payment Status - Only for professionals */}
                                            {pro.role !== 'admin' && (
                                                <div>
                                                    <div style={{
                                                        fontSize: '0.65rem',
                                                        fontWeight: 700,
                                                        color: 'var(--text-muted)',
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.05em',
                                                        marginBottom: '0.375rem'
                                                    }}>
                                                        Estado de Pagamento
                                                    </div>
                                                    <button
                                                        onClick={() => updateStatus(pro.id, pro.paymentStatus === 'paid' ? 'pending' : 'paid')}
                                                        style={{
                                                            width: '100%',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.625rem',
                                                            padding: '0.75rem 1rem',
                                                            borderRadius: '10px',
                                                            background: `color-mix(in srgb, ${getStatusColor(pro.paymentStatus || 'pending')}, transparent 90%)`,
                                                            color: getStatusColor(pro.paymentStatus || 'pending'),
                                                            fontSize: '0.875rem',
                                                            fontWeight: 600,
                                                            border: `1.5px solid ${getStatusColor(pro.paymentStatus || 'pending')}30`,
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s ease',
                                                            justifyContent: 'center'
                                                        }}
                                                        onMouseOver={e => {
                                                            e.currentTarget.style.borderColor = getStatusColor(pro.paymentStatus || 'pending');
                                                            e.currentTarget.style.boxShadow = `0 4px 12px ${getStatusColor(pro.paymentStatus || 'pending')}40`;
                                                        }}
                                                        onMouseOut={e => {
                                                            e.currentTarget.style.borderColor = `${getStatusColor(pro.paymentStatus || 'pending')}30`;
                                                            e.currentTarget.style.boxShadow = 'none';
                                                        }}
                                                    >
                                                        <span style={{
                                                            width: '10px',
                                                            height: '10px',
                                                            borderRadius: '50%',
                                                            background: 'currentColor',
                                                            boxShadow: `0 0 8px currentColor`
                                                        }} />
                                                        {getStatusLabel(pro.paymentStatus || 'pending')}
                                                    </button>
                                                </div>
                                            )}

                                            {/* Admin Toggle - Only visible for super admins */}
                                            {currentUserProfile?.superAdmin && pro.id !== currentUserProfile.id && (
                                                <div>
                                                    <div style={{
                                                        fontSize: '0.65rem',
                                                        fontWeight: 700,
                                                        color: 'var(--text-muted)',
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.05em',
                                                        marginBottom: '0.375rem'
                                                    }}>
                                                        Permissões
                                                    </div>
                                                    <button
                                                        onClick={() => toggleAdminRole(pro.id, pro.role)}
                                                        style={{
                                                            width: '100%',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '0.625rem',
                                                            padding: '0.75rem 1rem',
                                                            borderRadius: '10px',
                                                            background: pro.role === 'admin'
                                                                ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                                                                : 'linear-gradient(135deg, var(--accent-primary), #6366f1)',
                                                            color: 'white',
                                                            fontSize: '0.875rem',
                                                            fontWeight: 600,
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s ease',
                                                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
                                                        }}
                                                        onMouseOver={e => {
                                                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.25)';
                                                        }}
                                                        onMouseOut={e => {
                                                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
                                                        }}
                                                    >
                                                        {pro.role === 'admin' ? (
                                                            <>
                                                                <UserCog size={18} />
                                                                Remover Admin
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Shield size={18} />
                                                                Promover a Admin
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Secondary Actions */}
                                    <div style={{
                                        paddingTop: '0.5rem',
                                        borderTop: '1px dashed var(--border-default)'
                                    }}>
                                        <div style={{
                                            fontSize: '0.65rem',
                                            fontWeight: 700,
                                            color: 'var(--text-muted)',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                            marginBottom: '0.5rem'
                                        }}>
                                            Ações Rápidas
                                        </div>
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: pro.slug && pro.role !== 'admin' ? '1fr 1fr' : '1fr',
                                            gap: '0.5rem'
                                        }}>
                                            <button
                                                title="Enviar Email"
                                                onClick={() => window.location.href = `mailto:${pro.email}`}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '0.5rem',
                                                    padding: '0.625rem',
                                                    borderRadius: '8px',
                                                    fontSize: '0.8125rem',
                                                    fontWeight: 500,
                                                    color: 'var(--text-secondary)',
                                                    cursor: 'pointer',
                                                    background: 'var(--bg-elevated)',
                                                    border: '1px solid var(--border-default)',
                                                    transition: 'all 0.2s ease'
                                                }}
                                                onMouseOver={e => {
                                                    e.currentTarget.style.background = 'var(--bg-card)';
                                                    e.currentTarget.style.color = 'var(--accent-primary)';
                                                    e.currentTarget.style.borderColor = 'var(--accent-primary)';
                                                }}
                                                onMouseOut={e => {
                                                    e.currentTarget.style.background = 'var(--bg-elevated)';
                                                    e.currentTarget.style.color = 'var(--text-secondary)';
                                                    e.currentTarget.style.borderColor = 'var(--border-default)';
                                                }}
                                            >
                                                <Mail size={16} />
                                                <span>Email</span>
                                            </button>
                                            {pro.slug && pro.role !== 'admin' && (
                                                <button
                                                    title="Ver Página Pública"
                                                    onClick={() => window.open(`/book/${pro.slug}`, '_blank')}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '0.5rem',
                                                        padding: '0.625rem',
                                                        borderRadius: '8px',
                                                        fontSize: '0.8125rem',
                                                        fontWeight: 500,
                                                        color: 'var(--text-secondary)',
                                                        cursor: 'pointer',
                                                        background: 'var(--bg-elevated)',
                                                        border: '1px solid var(--border-default)',
                                                        transition: 'all 0.2s ease'
                                                    }}
                                                    onMouseOver={e => {
                                                        e.currentTarget.style.background = 'var(--bg-card)';
                                                        e.currentTarget.style.color = 'var(--accent-primary)';
                                                        e.currentTarget.style.borderColor = 'var(--accent-primary)';
                                                    }}
                                                    onMouseOut={e => {
                                                        e.currentTarget.style.background = 'var(--bg-elevated)';
                                                        e.currentTarget.style.color = 'var(--text-secondary)';
                                                        e.currentTarget.style.borderColor = 'var(--border-default)';
                                                    }}
                                                >
                                                    <ExternalLink size={16} />
                                                    <span>Ver Página</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                }

                {
                    filteredPros.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)', gridColumn: '1 / -1' }}>
                            <Search size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                            <p>Nenhum utilizador encontrado.</p>
                        </div>
                    )
                }
            </div >
        </Layout >
    );
}
