import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, CalendarDays, Users, LayoutGrid, Clock, Sparkles, Menu, X, User, Sun, Moon, CalendarClock, Shield, Heart, Search } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useTheme } from './ThemeContext';

export default function Layout({ children, role = 'professional', restricted = false, brandName: propBrandName }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { theme, toggleTheme } = useTheme();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [fetchedProfile, setFetchedProfile] = useState(null);
    const [loadingProfile, setLoadingProfile] = useState(true);

    const isProfessionalPending = role === 'professional' && (!fetchedProfile || fetchedProfile.paymentStatus === 'pending' || fetchedProfile.paymentStatus === 'expired');
    const APP_NAME = "Booklyo";

    let businessName = propBrandName;
    if (!businessName) {
        if (role === 'admin') businessName = 'Admin Portal';
        else if (role === 'client') businessName = 'Área Cliente';
        else if (role === 'professional') {
            businessName = isProfessionalPending ? APP_NAME : (fetchedProfile?.businessName || APP_NAME);
        } else {
            businessName = APP_NAME;
        }
    }

    const logoUrl = (!isProfessionalPending ? fetchedProfile?.logoUrl : null);

    useEffect(() => {
        if (role === 'professional') {
            const unsubscribe = auth.onAuthStateChanged(async (user) => {
                if (user) {
                    try {
                        // 1. Check Staff Lookup FIRST (Priority Rule)
                        console.log("Checking Staff Lookup for:", user.uid);
                        const lookupRef = doc(db, "staff_lookup", user.uid);
                        const lookupSnap = await getDoc(lookupRef);

                        if (lookupSnap.exists()) {
                            console.log("Staff Lookup Found:", lookupSnap.data());
                            // User is Staff
                            const { ownerId, staffId } = lookupSnap.data();
                            const staffRef = doc(db, `professionals/${ownerId}/staff/${staffId}`);
                            const staffSnap = await getDoc(staffRef);

                            if (staffSnap.exists()) {
                                console.log("Staff Profile Found");
                                const sData = staffSnap.data();
                                setFetchedProfile({
                                    ...sData,
                                    isStaff: true,
                                    ownerId: ownerId,
                                    id: staffId,
                                    logoUrl: sData.photoUrl,
                                    businessName: sData.name,
                                    paymentStatus: 'active'
                                });
                            } else {
                                console.error("Staff Profile Document MISSING at:", staffRef.path);
                            }
                        } else {
                            console.log("Staff Lookup Not Found. Checking Owner...");
                            // 2. If not Staff, check Professional (Owner)
                            const proDoc = await getDoc(doc(db, "professionals", user.uid));
                            if (proDoc.exists()) {
                                console.log("Owner Profile Found");
                                setFetchedProfile({ ...proDoc.data(), isStaff: false });
                            } else {
                                console.log("Owner Profile Not Found");
                            }
                        }
                    } catch (err) {
                        console.error("Layout Profile Fetch Error", err);
                    } finally {
                        setLoadingProfile(false);
                    }
                } else {
                    setLoadingProfile(false);
                }
            });
            return () => unsubscribe();
        } else {
            setLoadingProfile(false);
        }
    }, [role]);

    // Fallback UI for Missing Profile
    if (!loadingProfile && !fetchedProfile && (role === 'professional' || role === undefined)) {
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
        { icon: LayoutGrid, label: 'Dashboard', path: '/admin/dashboard' },
        { icon: Users, label: 'Utilizadores', path: '/admin/users' },
        { icon: Shield, label: 'Configurações', path: '/admin/settings' }
    ];

    const proLinks = [
        { icon: LayoutGrid, label: 'Dashboard', path: '/dashboard' },
        { icon: CalendarDays, label: 'Agenda', path: '/dashboard/agenda' },
        { icon: Sparkles, label: 'Serviços', path: '/dashboard/services' },
        { icon: CalendarClock, label: 'Horários', path: '/dashboard/schedule' },
        { icon: Users, label: 'Profissionais', path: '/dashboard/staff' },
        { icon: User, label: 'Perfil', path: '/dashboard/profile' }
    ];

    const staffLinks = [
        { icon: LayoutGrid, label: 'Dashboard', path: '/dashboard' },
        { icon: CalendarDays, label: 'Agenda', path: '/dashboard/agenda' },
        { icon: User, label: 'Perfil', path: '/dashboard/profile' }
    ];

    const clientLinks = [
        { icon: Search, label: 'Explorar', path: '/client/explore' },
        { icon: CalendarDays, label: 'Minhas Marcações', path: '/client/bookings' },
        { icon: Heart, label: 'Meus Favoritos', path: '/client/favorites' }
    ];

    let links = [];
    if (role === 'admin') links = adminLinks;
    else if (role === 'client') links = clientLinks;
    else if (role === 'professional') {
        links = fetchedProfile?.isStaff ? staffLinks : proLinks;
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
                        {logoUrl ? (
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
                        Terminar Sessão
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
                    {logoUrl ? (
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

                <div style={{ fontSize: '10px', color: 'red', padding: '5px' }}>
                    DEBUG UID: {auth.currentUser?.uid?.substring(0, 6)}... <br />
                    IsStaff: {fetchedProfile?.isStaff ? 'YES' : 'NO'}<br />
                    <button onClick={async () => {
                        try {
                            const u = auth.currentUser;
                            console.log("Manual Check for", u.uid);
                            const ref = doc(db, "staff_lookup", u.uid);
                            const snap = await getDoc(ref);

                            if (snap.exists()) {
                                alert("Lookup SUCESSO: " + JSON.stringify(snap.data()));
                                const d = snap.data();
                                const sRef = doc(db, `professionals/${d.ownerId}/staff/${d.staffId}`);
                                const sSnap = await getDoc(sRef);
                                alert(sSnap.exists() ? "Perfil Staff SUCESSO" : "Perfil Staff NÃO ENCONTRADO em " + sRef.path);
                            } else {
                                alert("Lookup NÃO ENCONTRADO para " + u.uid);
                                // Check if Owner exists
                                const pRef = doc(db, "professionals", u.uid);
                                const pSnap = await getDoc(pRef);
                                alert(pSnap.exists() ? "Mas é DONO (Professional)!" : "Nem Dono nem Staff.");
                            }
                        } catch (e) {
                            alert("ERRO ERRO: " + e.message);
                            console.error(e);
                        }
                    }} style={{ background: 'white', border: '1px solid red' }}>Check DB</button>
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
                        {theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
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
                        Terminar Sessão
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

                    {/* Mobile Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        style={{
                            padding: '0.5rem',
                            color: 'var(--text-primary)',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer'
                        }}
                        className="md:hidden"
                    >
                        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                </header>

                {/* Content Area */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '1rem',
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
