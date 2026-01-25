import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, CalendarDays, Users, LayoutGrid, Clock, Sparkles, Menu, X, User, Sun, Moon, CalendarClock, Shield, Heart, Search, Star } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useTheme } from './ThemeContext';
import { useUser } from '../context/UserContext';
import { useLanguage } from '../i18n';
import LanguageSelector from './LanguageSelector';
import ClientAvatar from './ClientAvatar';

export default function Layout({ children, role = 'professional', restricted = false, brandName: propBrandName }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { theme, toggleTheme } = useTheme();
    const { t, language } = useLanguage();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Use UserContext instead of local fetch
    const { profile: fetchedProfile, loading: loadingProfile, role: contextRole } = useUser();

    // Use contextRole if available and relevant, otherwise fallback to prop role
    const currentRole = (contextRole === 'staff') ? 'staff' : role;

    const isProfessionalPending = (currentRole === 'professional' || currentRole === 'staff') && (!fetchedProfile || fetchedProfile.paymentStatus === 'pending' || fetchedProfile.paymentStatus === 'expired');
    const APP_NAME = "Booklyo";

    let businessName = propBrandName;
    if (!businessName) {
        if (currentRole === 'admin') businessName = 'Admin Portal';
        else if (currentRole === 'client') businessName = fetchedProfile?.businessName || fetchedProfile?.name || 'Área Cliente';
        else if (currentRole === 'professional' || currentRole === 'staff') {
            businessName = isProfessionalPending ? APP_NAME : (fetchedProfile?.businessName || fetchedProfile?.name || APP_NAME);
        } else {
            businessName = APP_NAME;
        }
    }

    // Get logo URL - for professionals ONLY (clients use ClientAvatar)
    const logoUrl = currentRole === 'client'
        ? null // Clients use <ClientAvatar> directly
        : (!isProfessionalPending ? fetchedProfile?.logoUrl : null);

    // Fallback UI for Missing Profile
    if (!loadingProfile && !fetchedProfile && (currentRole === 'professional' || currentRole === undefined)) {
        return (
            <div style={{
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                padding: '2rem'
            }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>Perfil Não Encontrado</h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>A sua conta existe, mas não conseguimos encontrar o seu perfil de staff.</p>
                <code style={{ background: 'var(--bg-card)', padding: '0.5rem', borderRadius: '8px', fontSize: '0.8rem', marginBottom: '1.5rem' }}>UID: {auth.currentUser?.uid}</code>
                <button
                    onClick={() => { auth.signOut(); navigate('/auth'); }}
                    style={{
                        padding: '0.75rem 1.5rem',
                        background: 'var(--accent-primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.5rem',
                        cursor: 'pointer'
                    }}
                >
                    Sair e Tentar Novamente
                </button>
            </div>
        );
    }

    const handleLogout = () => {
        auth.signOut();
        if (role === 'client') {
            navigate('/client/auth');
        } else {
            navigate('/auth');
        }
    };

    const isActive = (path) => location.pathname === path;

    const adminLinks = [
        { icon: LayoutGrid, label: t('nav.dashboard', 'Dashboard'), path: '/admin/dashboard' },
        { icon: Users, label: t('admin.users', 'Users'), path: '/admin/users' },
        { icon: Shield, label: t('nav.settings', 'Settings'), path: '/admin/settings' }
    ];

    const proLinks = [
        { icon: LayoutGrid, label: t('nav.dashboard', 'Dashboard'), path: '/dashboard' },
        { icon: CalendarDays, label: t('nav.agenda', 'Agenda'), path: '/dashboard/agenda' },
        { icon: Sparkles, label: t('nav.services', 'Services'), path: '/dashboard/services' },
        { icon: CalendarClock, label: t('nav.schedule', 'Schedule'), path: '/dashboard/schedule' },
        { icon: Users, label: t('nav.staff', 'Staff'), path: '/dashboard/staff' },
        { icon: Star, label: t('nav.reviews', 'Reviews'), path: '/dashboard/reviews' },
        { icon: User, label: t('nav.profile', 'Profile'), path: '/dashboard/profile' }
    ];

    const staffLinks = [
        { icon: LayoutGrid, label: t('nav.dashboard', 'Dashboard'), path: '/dashboard' },
        { icon: CalendarDays, label: t('nav.agenda', 'Agenda'), path: '/dashboard/agenda' },
        { icon: CalendarClock, label: t('nav.schedule', 'Schedule'), path: '/dashboard/schedule' },
        { icon: User, label: t('nav.profile', 'Profile'), path: '/dashboard/profile' }
    ];

    const clientLinks = [
        { icon: Search, label: t('nav.explore', 'Explore'), path: '/client/explore' },
        { icon: CalendarDays, label: t('nav.bookings', 'Bookings'), path: '/client/bookings' },
        { icon: Heart, label: t('nav.favorites', 'Favorites'), path: '/client/favorites' },
        { icon: User, label: t('nav.profile', 'Profile'), path: '/client/profile' }
    ];

    let links = [];
    if (currentRole === 'admin') links = adminLinks;
    else if (currentRole === 'client') links = clientLinks;
    else if (currentRole === 'professional' || currentRole === 'staff') {
        links = (fetchedProfile?.isStaff || currentRole === 'staff') ? staffLinks : proLinks;
    }

    // Mobile Sidebar
    const MobileSidebar = () => (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: sidebarOpen ? 'flex' : 'none'
        }}>
            {/* Backdrop */}
            <div
                onClick={() => setSidebarOpen(false)}
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(4px)'
                }}
            />

            {/* Drawer */}
            <aside style={{
                position: 'relative',
                width: '280px',
                height: '100%',
                background: 'var(--bg-card)',
                borderRight: '1px solid var(--border-default)',
                display: 'flex',
                flexDirection: 'column',
                animation: 'slideInLeft 0.3s ease'
            }}>
                <div style={{
                    padding: '1.5rem',
                    borderBottom: '1px solid var(--border-default)',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                }}>
                    <button
                        onClick={() => setSidebarOpen(false)}
                        style={{
                            position: 'absolute',
                            top: '1rem',
                            right: '1rem',
                            padding: '0.5rem',
                            color: 'var(--text-secondary)',
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--border-default)',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease',
                            zIndex: 10
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.color = 'var(--text-primary)';
                            e.currentTarget.style.borderColor = 'var(--accent-primary)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.color = 'var(--text-secondary)';
                            e.currentTarget.style.borderColor = 'var(--border-default)';
                        }}
                    >
                        <X size={18} />
                    </button>

                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '1rem',
                        width: '100%',
                        paddingTop: '0.5rem'
                    }}>
                        {currentRole === 'client' && auth.currentUser ? (
                            <div style={{
                                width: '80px',
                                height: '80px',
                                borderRadius: '50%',
                                padding: '2px',
                                background: 'linear-gradient(135deg, var(--accent-primary), #60a5fa)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: 'var(--shadow-lg)',
                                overflow: 'hidden' // Ensure avatar stays within circle
                            }}>
                                <ClientAvatar uid={auth.currentUser.uid} alt={businessName} size="76px" />
                            </div>
                        ) : logoUrl ? (
                            <div style={{
                                width: '80px',
                                height: '80px',
                                borderRadius: '50%',
                                padding: '2px',
                                background: 'linear-gradient(135deg, var(--accent-primary), #60a5fa)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: 'var(--shadow-lg)'
                            }}>
                                <img
                                    src={logoUrl}
                                    alt={businessName}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        borderRadius: '50%',
                                        objectFit: 'cover',
                                        background: 'var(--bg-card)'
                                    }}
                                />
                            </div>
                        ) : businessName === APP_NAME ? (
                            <img src="/logo.png" alt="Booklyo" style={{ width: '100px', height: '100px', objectFit: 'contain', marginBottom: '0.5rem' }} />
                        ) : (
                            <div style={{
                                width: '80px',
                                height: '80px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, var(--accent-primary), #60a5fa)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontWeight: 700,
                                fontSize: '2rem',
                                boxShadow: 'var(--shadow-glow)'
                            }}>
                                {businessName.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <h1 style={{
                            fontSize: '1.125rem',
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            textAlign: 'center',
                            width: '100%',
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap'
                        }}>
                            {businessName}
                        </h1>
                    </div>
                </div>

                <nav style={{ flex: 1, padding: '1rem' }}>
                    {loadingProfile ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', opacity: 0.5 }}>
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} style={{ height: '48px', background: 'var(--bg-elevated)', borderRadius: '8px' }} />
                            ))}
                        </div>
                    ) : !restricted && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {links.map(link => (
                                <NavItem
                                    key={link.path}
                                    icon={link.icon}
                                    label={link.label}
                                    active={isActive(link.path)}
                                    onClick={() => {
                                        navigate(link.path);
                                        setSidebarOpen(false);
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </nav>

                <div style={{ padding: '1rem', borderTop: '1px solid var(--border-default)' }}>
                    <button
                        onClick={handleLogout}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            width: '100%',
                            padding: '0.75rem',
                            fontSize: '0.875rem',
                            color: 'var(--text-secondary)',
                            background: 'rgba(255,255,255,0.03)',
                            border: 'none',
                            borderRadius: 'var(--radius-md)',
                            cursor: 'pointer'
                        }}
                    >
                        <LogOut size={18} />
                        {t?.nav?.logout || 'Logout'}
                    </button>
                </div>
            </aside>
        </div>
    );

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            overflow: 'hidden'
        }}>
            <style>{`
                @keyframes slideInLeft {
                    from { transform: translateX(-100%); }
                    to { transform: translateX(0); }
                }
            `}</style>

            <MobileSidebar />

            <aside style={{
                width: '240px',
                height: '100vh',
                borderRight: '1px solid var(--border-default)',
                background: 'var(--bg-card)',
                display: 'flex',
                flexDirection: 'column',
                flexShrink: 0,
                overflow: 'hidden'
            }} className="hidden md:flex">
                {/* Logo */}
                <div style={{
                    height: 'auto',
                    minHeight: '180px',
                    padding: '1.5rem 1.25rem',
                    borderBottom: '1px solid var(--border-default)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.875rem',
                    overflow: 'hidden',
                    flexShrink: 0,
                    background: 'linear-gradient(to bottom, var(--bg-secondary), transparent)'
                }}>
                    {currentRole === 'client' && auth.currentUser ? (
                        <div style={{
                            width: '72px',
                            height: '72px',
                            borderRadius: '50%',
                            padding: '2px',
                            background: 'linear-gradient(135deg, var(--accent-primary), #60a5fa)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 8px 16px -4px rgba(0,0,0,0.2)',
                            overflow: 'hidden' // Ensure avatar stays within circle
                        }}>
                            <ClientAvatar uid={auth.currentUser.uid} alt={businessName} size="68px" />
                        </div>
                    ) : logoUrl ? (
                        <div style={{
                            width: '72px',
                            height: '72px',
                            borderRadius: '50%',
                            padding: '2px',
                            background: 'linear-gradient(135deg, var(--accent-primary), #60a5fa)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 8px 16px -4px rgba(0,0,0,0.2)'
                        }}>
                            <img
                                src={logoUrl}
                                alt={businessName}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    background: 'var(--bg-card)'
                                }}
                            />
                        </div>
                    ) : businessName === APP_NAME ? (
                        <img src="/logo.png" alt="Booklyo" style={{ width: '100px', height: '100px', objectFit: 'contain', marginBottom: '0.25rem' }} />
                    ) : (
                        <div style={{
                            width: '72px',
                            height: '72px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--accent-primary), #60a5fa)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: 600,
                            fontSize: '1.75rem',
                            flexShrink: 0,
                            boxShadow: 'var(--shadow-glow)'
                        }}>
                            {businessName.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <h1 style={{
                        fontSize: '1rem',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        letterSpacing: '-0.01em',
                        textAlign: 'center',
                        width: '100%',
                        textOverflow: 'ellipsis',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        marginTop: '0.25rem'
                    }}>
                        {businessName}
                    </h1>
                </div>

                {/* Navigation */}
                <nav style={{ flex: 1, padding: '1rem 0.75rem' }}>
                    {loadingProfile ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', opacity: 0.5 }}>
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} style={{ height: '40px', background: 'var(--bg-elevated)', borderRadius: '8px' }} />
                            ))}
                        </div>
                    ) : !restricted && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            {links.map(link => (
                                <NavItem
                                    key={link.path}
                                    icon={link.icon}
                                    label={link.label}
                                    active={isActive(link.path)}
                                    onClick={() => navigate(link.path)}
                                />
                            ))}
                        </div>
                    )}
                </nav>

                {/* Theme Toggle & Logout */}
                <div style={{ padding: '0.75rem', borderTop: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <button
                        onClick={toggleTheme}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            width: '100%',
                            padding: '0.625rem 0.875rem',
                            fontSize: '0.8125rem',
                            color: 'var(--text-secondary)',
                            background: 'transparent',
                            border: 'none',
                            borderRadius: 'var(--radius-md)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.background = 'var(--bg-elevated)';
                            e.currentTarget.style.color = 'var(--text-primary)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'var(--text-secondary)';
                        }}
                    >
                        {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                        {theme === 'dark' ? (t?.common?.lightMode || 'Light Mode') : (t?.common?.darkMode || 'Dark Mode')}
                    </button>
                    <button
                        onClick={handleLogout}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            width: '100%',
                            padding: '0.625rem 0.875rem',
                            fontSize: '0.8125rem',
                            color: 'var(--text-secondary)',
                            background: 'transparent',
                            border: 'none',
                            borderRadius: 'var(--radius-md)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.background = 'var(--bg-elevated)';
                            e.currentTarget.style.color = 'var(--text-primary)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'var(--text-secondary)';
                        }}
                    >
                        <LogOut size={16} />
                        {t?.nav?.logout || 'Logout'}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Header Area */}
                <header
                    style={{
                        height: '64px',
                        borderBottom: '1px solid var(--border-default)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0 1.5rem',
                        background: 'var(--bg-card)',
                        position: 'sticky',
                        top: 0,
                        zIndex: 40,
                        flexShrink: 0
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button
                            onClick={() => setSidebarOpen(true)}
                            style={{
                                color: 'var(--text-primary)',
                                background: 'transparent',
                                border: 'none',
                                padding: '0.25rem'
                            }}
                            className="md:hidden"
                        >
                            <Menu size={24} />
                        </button>
                    </div>

                    {/* Language Selector & Mobile Theme Toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <LanguageSelector minimal />
                        <button
                            onClick={toggleTheme}
                            style={{
                                padding: '0.5rem',
                                color: 'var(--text-primary)',
                                background: 'var(--bg-elevated)',
                                border: '1px solid var(--border-default)',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                        </button>
                    </div>
                </header>

                {/* Content Area */}
                <div
                    className="layout-content"
                    style={{
                        flex: 1,
                        overflowY: 'auto',
                        padding: '2.5rem',
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                    <div style={{
                        maxWidth: '1200px', // Increased for better view in large screens
                        width: '100%',
                        margin: '0 auto',
                        paddingBottom: '2rem'
                    }} className="animate-fade-in">
                        {children}
                    </div>
                    {/* Powered By Footer */}
                    <div style={{
                        marginTop: 'auto',
                        textAlign: 'center',
                        padding: '1.5rem',
                    }}>
                        <p style={{
                            fontSize: '13px',
                            color: 'var(--text-muted)',
                            fontWeight: 500,
                            margin: 0
                        }}>
                            Powered by <strong style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>Booklyo</strong>
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}

function NavItem({ icon: Icon, label, active, onClick }) {
    const [hovered, setHovered] = useState(false);

    return (
        <button
            onClick={onClick}
            onMouseOver={() => setHovered(true)}
            onMouseOut={() => setHovered(false)}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                width: '100%',
                padding: '0.75rem 1rem',
                fontSize: '0.875rem',
                fontWeight: active ? 600 : 500,
                color: active ? 'var(--accent-primary)' : (hovered ? 'var(--text-primary)' : 'var(--text-secondary)'),
                background: active ? 'color-mix(in srgb, var(--accent-primary), transparent 90%)' : (hovered ? 'var(--bg-elevated)' : 'transparent'),
                border: 'none',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                textAlign: 'left'
            }}
        >
            <Icon size={18} strokeWidth={1.75} style={{ opacity: active ? 1 : 0.7 }} />
            {label}
        </button>
    );
}
