import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, LogOut, User } from 'lucide-react';
import { auth } from '../lib/firebase';

export default function ClientLayout({ children, userName }) {
    const navigate = useNavigate();

    const handleLogout = async () => {
        await auth.signOut();
        navigate('/client/auth');
    };

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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
                                Bookly
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
                    </div>

                    {/* User Info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
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
                                {userName || 'Cliente'}
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
                    <Link
                        to="/client/bookings"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.625rem 1.25rem',
                            borderRadius: '10px',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            textDecoration: 'none',
                            background: window.location.pathname === '/client/bookings' ? 'var(--accent-primary)' : 'transparent',
                            color: window.location.pathname === '/client/bookings' ? 'white' : 'var(--text-secondary)',
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => {
                            if (window.location.pathname !== '/client/bookings') {
                                e.currentTarget.style.background = 'var(--bg-elevated)';
                            }
                        }}
                        onMouseOut={(e) => {
                            if (window.location.pathname !== '/client/bookings') {
                                e.currentTarget.style.background = 'transparent';
                            }
                        }}
                    >
                        <Calendar size={16} />
                        Minhas Marcações
                    </Link>
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
                    © 2026 Bookly. Todos os direitos reservados.
                </p>
            </footer>
        </div>
    );
}
