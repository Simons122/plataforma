/**
 * 🌍 Language Selector Component - Premium Version
 * Componente elegante para alternar entre PT/EN
 */

import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../i18n';
import { Globe, Check } from 'lucide-react';

export default function LanguageSelector({ minimal = false }) {
    const { language, setLanguage } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const languages = [
        { code: 'pt', name: 'Português', shortName: 'PT' },
        { code: 'en', name: 'English', shortName: 'EN' },
        { code: 'fr', name: 'Français', shortName: 'FR' },
    ];

    const currentLang = languages.find(l => l.code === language);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Close on escape
    useEffect(() => {
        const handleEscape = (event) => {
            if (event.key === 'Escape') setIsOpen(false);
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, []);

    if (minimal) {
        return (
            <div ref={dropdownRef} style={{ position: 'relative' }}>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    aria-label="Select language"
                    aria-expanded={isOpen}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 0.875rem',
                        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1))',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        color: 'var(--text-primary)',
                        fontSize: '0.875rem',
                        fontWeight: 600
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.borderColor = 'var(--accent-primary)';
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.15))';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)';
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1))';
                        e.currentTarget.style.transform = 'translateY(0)';
                    }}
                >
                    <Globe size={16} style={{ color: 'var(--accent-primary)' }} />
                    <span style={{
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: 'var(--text-primary)'
                    }}>
                        {currentLang?.shortName}
                    </span>
                </button>

                {isOpen && (
                    <div style={{
                        position: 'absolute',
                        top: 'calc(100% + 6px)',
                        right: 0,
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-default)',
                        borderRadius: '12px',
                        boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.4)',
                        overflow: 'hidden',
                        zIndex: 1000,
                        minWidth: '160px',
                        animation: 'dropdownFade 0.15s ease'
                    }}>
                        {languages.map((lang) => (
                            <button
                                key={lang.code}
                                onClick={() => {
                                    setLanguage(lang.code);
                                    setIsOpen(false);
                                }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    width: '100%',
                                    padding: '0.875rem 1rem',
                                    background: language === lang.code
                                        ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.1))'
                                        : 'transparent',
                                    border: 'none',
                                    borderLeft: language === lang.code
                                        ? '3px solid var(--accent-primary)'
                                        : '3px solid transparent',
                                    cursor: 'pointer',
                                    color: language === lang.code ? 'var(--accent-primary)' : 'var(--text-primary)',
                                    fontSize: '0.9375rem',
                                    fontWeight: language === lang.code ? 600 : 500,
                                    textAlign: 'left',
                                    transition: 'all 0.15s ease'
                                }}
                                onMouseOver={(e) => {
                                    if (language !== lang.code) {
                                        e.currentTarget.style.background = 'var(--bg-elevated)';
                                    }
                                }}
                                onMouseOut={(e) => {
                                    if (language !== lang.code) {
                                        e.currentTarget.style.background = 'transparent';
                                    }
                                }}
                            >
                                <span style={{
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    color: 'var(--accent-primary)',
                                    background: 'rgba(99, 102, 241, 0.15)',
                                    padding: '2px 6px',
                                    borderRadius: '4px'
                                }}>{lang.shortName}</span>
                                <span style={{ flex: 1 }}>{lang.name}</span>
                                {language === lang.code && (
                                    <Check size={16} strokeWidth={2.5} style={{ color: 'var(--accent-primary)' }} />
                                )}
                            </button>
                        ))}
                    </div>
                )}

                <style>{`
                    @keyframes dropdownFade {
                        from {
                            opacity: 0;
                            transform: translateY(-6px);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0);
                        }
                    }
                `}</style>
            </div>
        );
    }

    // Full version with more details
    return (
        <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Select language"
                aria-expanded={isOpen}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1.25rem',
                    background: 'linear-gradient(135deg, var(--bg-card), var(--bg-elevated))',
                    border: '1px solid var(--border-default)',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    color: 'var(--text-primary)',
                    boxShadow: 'var(--shadow-sm)'
                }}
                onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent-primary)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-md), 0 0 0 3px rgba(99, 102, 241, 0.1)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-default)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                    e.currentTarget.style.transform = 'translateY(0)';
                }}
            >
                <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <Globe size={18} style={{ color: 'var(--accent-primary)' }} />
                </div>
                <div style={{ textAlign: 'left' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.9375rem',
                        fontWeight: 600
                    }}>
                        <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: 'var(--accent-primary)',
                            background: 'rgba(99, 102, 241, 0.15)',
                            padding: '2px 6px',
                            borderRadius: '4px'
                        }}>{currentLang?.shortName}</span>
                        {currentLang?.name}
                    </div>
                    <p style={{
                        fontSize: '0.6875rem',
                        color: 'var(--text-muted)',
                        margin: 0,
                        marginTop: '2px'
                    }}>
                        {language === 'pt' ? 'Clique para mudar' : language === 'fr' ? 'Cliquez pour changer' : 'Click to change'}
                    </p>
                </div>
            </button>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-default)',
                    borderRadius: '14px',
                    boxShadow: '0 20px 50px -15px rgba(0, 0, 0, 0.5)',
                    overflow: 'hidden',
                    zIndex: 1000,
                    minWidth: '200px',
                    animation: 'dropdownFade 0.2s ease'
                }}>
                    <div style={{
                        padding: '0.875rem 1rem',
                        borderBottom: '1px solid var(--border-default)',
                        background: 'var(--bg-secondary)'
                    }}>
                        <p style={{
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            color: 'var(--text-muted)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            margin: 0
                        }}>
                            {language === 'pt' ? '🌍 Selecionar Idioma' : language === 'fr' ? '🌍 Sélectionner la langue' : '🌍 Select Language'}
                        </p>
                    </div>

                    {languages.map((lang) => (
                        <button
                            key={lang.code}
                            onClick={() => {
                                setLanguage(lang.code);
                                setIsOpen(false);
                            }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.875rem',
                                width: '100%',
                                padding: '1rem 1.25rem',
                                background: language === lang.code
                                    ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(139, 92, 246, 0.08))'
                                    : 'transparent',
                                border: 'none',
                                borderLeft: language === lang.code
                                    ? '3px solid var(--accent-primary)'
                                    : '3px solid transparent',
                                cursor: 'pointer',
                                color: language === lang.code ? 'var(--accent-primary)' : 'var(--text-primary)',
                                fontSize: '1rem',
                                fontWeight: language === lang.code ? 600 : 500,
                                textAlign: 'left',
                                transition: 'all 0.15s ease'
                            }}
                            onMouseOver={(e) => {
                                if (language !== lang.code) {
                                    e.currentTarget.style.background = 'var(--bg-elevated)';
                                    e.currentTarget.style.paddingLeft = '1.5rem';
                                }
                            }}
                            onMouseOut={(e) => {
                                if (language !== lang.code) {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.paddingLeft = '1.25rem';
                                }
                            }}
                        >
                            <span style={{
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                color: 'var(--accent-primary)',
                                background: 'rgba(99, 102, 241, 0.15)',
                                padding: '2px 8px',
                                borderRadius: '4px'
                            }}>{lang.shortName}</span>
                            <span style={{ flex: 1 }}>{lang.name}</span>
                            {language === lang.code && (
                                <div style={{
                                    width: '22px',
                                    height: '22px',
                                    borderRadius: '50%',
                                    background: 'var(--accent-primary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <Check size={12} strokeWidth={3} style={{ color: 'white' }} />
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            )}

            <style>{`
                @keyframes dropdownFade {
                    from {
                        opacity: 0;
                        transform: translateY(-8px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </div>
    );
}
