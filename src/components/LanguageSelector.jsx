/**
 * 🌍 Language Selector Component
 * Componente elegante para alternar entre PT/EN
 */

import React, { useState } from 'react';
import { useLanguage } from '../i18n';
import { Globe, ChevronDown, Check } from 'lucide-react';

export default function LanguageSelector({ minimal = false }) {
    const { language, setLanguage } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);

    const languages = [
        { code: 'pt', name: 'Português', flag: '🇵🇹' },
        { code: 'en', name: 'English', flag: '🇬🇧' },
    ];

    const currentLang = languages.find(l => l.code === language);

    if (minimal) {
        // Versão minimalista - apenas flags
        return (
            <div style={{ position: 'relative' }}>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 0.75rem',
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-default)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        color: 'var(--text-primary)',
                        fontSize: '1rem'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                    onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border-default)'}
                >
                    <span>{currentLang?.flag}</span>
                    <ChevronDown
                        size={14}
                        style={{
                            transition: 'transform 0.2s',
                            transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
                            opacity: 0.6
                        }}
                    />
                </button>

                {isOpen && (
                    <>
                        <div
                            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }}
                            onClick={() => setIsOpen(false)}
                        />
                        <div style={{
                            position: 'absolute',
                            top: 'calc(100% + 4px)',
                            right: 0,
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-default)',
                            borderRadius: '10px',
                            boxShadow: 'var(--shadow-lg)',
                            overflow: 'hidden',
                            zIndex: 1000,
                            minWidth: '140px',
                            animation: 'fadeInDown 0.15s ease'
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
                                        gap: '0.625rem',
                                        width: '100%',
                                        padding: '0.75rem 1rem',
                                        background: language === lang.code ? 'var(--bg-elevated)' : 'transparent',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: 'var(--text-primary)',
                                        fontSize: '0.875rem',
                                        fontWeight: language === lang.code ? 600 : 400,
                                        textAlign: 'left',
                                        transition: 'background 0.15s ease'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-elevated)'}
                                    onMouseOut={(e) => e.currentTarget.style.background = language === lang.code ? 'var(--bg-elevated)' : 'transparent'}
                                >
                                    <span style={{ fontSize: '1.125rem' }}>{lang.flag}</span>
                                    <span style={{ flex: 1 }}>{lang.name}</span>
                                    {language === lang.code && (
                                        <Check size={14} style={{ color: 'var(--accent-success)' }} />
                                    )}
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>
        );
    }

    // Versão completa com ícone Globe
    return (
        <div style={{ position: 'relative' }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.625rem',
                    padding: '0.625rem 1rem',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-default)',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    color: 'var(--text-primary)',
                    boxShadow: 'var(--shadow-sm)'
                }}
                onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent-primary)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                }}
                onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-default)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                }}
            >
                <Globe size={16} style={{ color: 'var(--accent-primary)' }} />
                <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                    {currentLang?.flag} {currentLang?.name}
                </span>
                <ChevronDown
                    size={14}
                    style={{
                        transition: 'transform 0.2s',
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
                        opacity: 0.6
                    }}
                />
            </button>

            {isOpen && (
                <>
                    <div
                        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }}
                        onClick={() => setIsOpen(false)}
                    />
                    <div style={{
                        position: 'absolute',
                        top: 'calc(100% + 8px)',
                        right: 0,
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-default)',
                        borderRadius: '12px',
                        boxShadow: 'var(--shadow-lg)',
                        overflow: 'hidden',
                        zIndex: 1000,
                        minWidth: '180px',
                        animation: 'fadeInDown 0.2s ease'
                    }}>
                        <div style={{
                            padding: '0.75rem 1rem',
                            borderBottom: '1px solid var(--border-default)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: 'var(--text-muted)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }}>
                            {language === 'pt' ? 'Selecionar Idioma' : 'Select Language'}
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
                                    gap: '0.75rem',
                                    width: '100%',
                                    padding: '0.875rem 1rem',
                                    background: language === lang.code
                                        ? 'color-mix(in srgb, var(--accent-primary), transparent 92%)'
                                        : 'transparent',
                                    border: 'none',
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
                                <span style={{ fontSize: '1.25rem' }}>{lang.flag}</span>
                                <span style={{ flex: 1 }}>{lang.name}</span>
                                {language === lang.code && (
                                    <Check size={16} strokeWidth={2.5} />
                                )}
                            </button>
                        ))}
                    </div>
                </>
            )}

            <style>{`
                @keyframes fadeInDown {
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
