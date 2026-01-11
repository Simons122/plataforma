import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Calendar, LogOut, User, Search, Heart, LogIn } from 'lucide-react';
import { auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export default function ClientLayout({ children, userName }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleLogout = async () => {
        await auth.signOut();
        navigate('/client/auth');
    };

    const isActive = (path) => location.pathname === path;

    const navLinkStyle = (path) => ({
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.625rem 1.25rem',
        borderRadius: '10px',
        fontSize: '0.875rem',
        fontWeight: 600,
        textDecoration: 'none',
        background: isActive(path) ? 'var(--accent-primary)' : 'transparent',
        color: isActive(path) ? 'white' : 'var(--text-secondary)',
        transition: 'all 0.2s'
    });

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <header style={{
                background: 'var(--bg-card)',
                borderBottom: '1px solid var(--border-default)',
                padding: '1rem 2rem',
                position: 'sticky',
                top: 0,
                zIndex: 100,
                boxShadow: 'var(--shadow-sm)'
            }}>
                <div style={{
                    maxWidth: '1400px',
                    margin: '0 auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    {/* Logo/Brand */}
                    <Link to="/client/explore" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            background: 'linear-gradient(135deg, var(--accent-primary), #60a5fa)',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: 'var(--shadow-glow)'
                        }}>
                            <Calendar size={22} style={{ color: 'white' }} />
                        </div>
                        <div>
                            <h1 style={{
                                fontSize: '1.25rem',
                                fontWeight: 800,
                                color: 'var(--text-primary)',
                                margin: 0,
                                letterSpacing: '-0.02em'
                            }}>
                                Booklyo
                            </h1>
                            <p style={{
                                fontSize: '0.75rem',
                                color: 'var(--text-muted)',
                                margin: 0,
                                fontWeight: 500
                            }}>
                                Área do Cliente
                            </p>
                        </div>
                    </Link>

                    {/* User Info / Login Button */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {currentUser ? (
                            <>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.5rem 1rem',
                                    background: 'var(--bg-secondary)',
                                    borderRadius: '12px',
                                    border: '1px solid var(--border-default)'
                                }}>
                                    <div style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '50%',
                                        background: 'linear-gradient(135deg, var(--accent-primary), #60a5fa)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <User size={16} style={{ color: 'white' }} />
                                    </div>
                                    <span style={{
                                        fontSize: '0.875rem',
                                        fontWeight: 600,
                                        color: 'var(--text-primary)'
                                    }}>
                                        {userName || currentUser.displayName || 'Cliente'}
                                    </span>
                                </div>

                                <button
                                    onClick={handleLogout}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        padding: '0.625rem 1rem',
                                        background: 'transparent',
                                        border: '1px solid var(--border-default)',
                                        borderRadius: '10px',
                                        color: 'var(--text-secondary)',
                                        fontSize: '0.875rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.background = 'var(--bg-elevated)';
                                        e.currentTarget.style.color = 'var(--accent-danger)';
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.background = 'transparent';
                                        e.currentTarget.style.color = 'var(--text-secondary)';
                                    }}
                                >
                                    <LogOut size={16} />
                                    Sair
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => navigate('/client/auth')}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.625rem 1.25rem',
                                    background: 'var(--accent-primary)',
                                    border: 'none',
                                    borderRadius: '10px',
                                    color: 'white',
                                    fontSize: '0.875rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.background = 'var(--accent-primary-hover)'}
                                onMouseOut={(e) => e.currentTarget.style.background = 'var(--accent-primary)'}
                            >
                                <LogIn size={16} />
                                Entrar
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Navigation */}
            <nav style={{
                background: 'var(--bg-card)',
                borderBottom: '1px solid var(--border-default)',
                padding: '0.75rem 2rem'
            }}>
                <div style={{
                    maxWidth: '1400px',
                    margin: '0 auto',
                    display: 'flex',
                    gap: '0.5rem'
                }}>
                    {/* Explorar - Always visible */}
                    <Link
                        to="/client/explore"
                        style={navLinkStyle('/client/explore')}
                        onMouseOver={(e) => {
                            if (!isActive('/client/explore')) {
                                e.currentTarget.style.background = 'var(--bg-elevated)';
                            }
                        }}
                        onMouseOut={(e) => {
                            if (!isActive('/client/explore')) {
                                e.currentTarget.style.background = 'transparent';
                            }
                        }}
                    >
                        <Search size={16} />
                        Explorar
                    </Link>

                    {/* Only show these if logged in */}
                    {currentUser && (
                        <>
                            <Link
                                to="/client/bookings"
                                style={navLinkStyle('/client/bookings')}
                                onMouseOver={(e) => {
                                    if (!isActive('/client/bookings')) {
                                        e.currentTarget.style.background = 'var(--bg-elevated)';
                                    }
                                }}
                                onMouseOut={(e) => {
                                    if (!isActive('/client/bookings')) {
                                        e.currentTarget.style.background = 'transparent';
                                    }
                                }}
                            >
                                <Calendar size={16} />
                                Minhas Marcações
                            </Link>

                            <Link
                                to="/client/favorites"
                                style={navLinkStyle('/client/favorites')}
                                onMouseOver={(e) => {
                                    if (!isActive('/client/favorites')) {
                                        e.currentTarget.style.background = 'var(--bg-elevated)';
                                    }
                                }}
                                onMouseOut={(e) => {
                                    if (!isActive('/client/favorites')) {
                                        e.currentTarget.style.background = 'transparent';
                                    }
                                }}
                            >
                                <Heart size={16} />
                                Favoritos
                            </Link>
                        </>
                    )}
                </div>
            </nav>

            {/* Main Content */}
            <main style={{
                flex: 1,
                padding: '2rem',
                maxWidth: '1400px',
                width: '100%',
                margin: '0 auto'
            }}>
                {children}
            </main>

            {/* Footer */}
            <footer style={{
                padding: '1.5rem 2rem',
                borderTop: '1px solid var(--border-default)',
                background: 'var(--bg-card)',
                textAlign: 'center'
            }}>
                <p style={{
                    fontSize: '0.875rem',
                    color: 'var(--text-muted)',
                    margin: 0
                }}>
                    Powered by <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Booklyo</span>
                </p>
            </footer>
        </div>
    );
}
