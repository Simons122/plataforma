/**
 * 📱 WhatsApp Settings Component
 * Configurações de notificações WhatsApp para profissionais
 */

import React, { useState, useEffect } from 'react';
import { MessageCircle, Bell, Clock, Check, Save, AlertCircle } from 'lucide-react';
import { getWhatsAppSettings, saveWhatsAppSettings } from '../lib/whatsappNotifications';
import { useLanguage } from '../i18n';

export default function WhatsAppSettings({ professionalId }) {
    const { t, language } = useLanguage();
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadSettings = async () => {
            if (!professionalId) return;

            try {
                const data = await getWhatsAppSettings(professionalId);
                setSettings(data);
            } catch (err) {
                console.error('Error loading settings:', err);
                setError('Failed to load settings');
            } finally {
                setLoading(false);
            }
        };

        loadSettings();
    }, [professionalId]);

    const handleToggle = (key) => {
        setSettings(prev => ({ ...prev, [key]: !prev[key] }));
        setSaved(false);
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);

        try {
            const result = await saveWhatsAppSettings(professionalId, settings);
            if (result.success) {
                setSaved(true);
                setTimeout(() => setSaved(false), 3000);
            } else {
                setError(result.error || 'Failed to save');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div style={{
                padding: '2rem',
                background: 'var(--bg-card)',
                borderRadius: '16px',
                border: '1px solid var(--border-default)'
            }}>
                <div className="skeleton" style={{ height: '200px' }} />
            </div>
        );
    }

    const notificationOptions = [
        {
            key: 'sendConfirmation',
            icon: Check,
            label: language === 'pt' ? 'Confirmação de Marcação' : 'Booking Confirmation',
            description: language === 'pt'
                ? 'Enviar mensagem quando cliente faz marcação'
                : 'Send message when client makes a booking'
        },
        {
            key: 'sendReminder24h',
            icon: Clock,
            label: language === 'pt' ? 'Lembrete 24h Antes' : '24h Reminder',
            description: language === 'pt'
                ? 'Lembrar cliente 24 horas antes da sessão'
                : 'Remind client 24 hours before session'
        },
        {
            key: 'sendReminder1h',
            icon: Clock,
            label: language === 'pt' ? 'Lembrete 1h Antes' : '1h Reminder',
            description: language === 'pt'
                ? 'Lembrar cliente 1 hora antes da sessão'
                : 'Remind client 1 hour before session'
        },
        {
            key: 'sendReviewRequest',
            icon: MessageCircle,
            label: language === 'pt' ? 'Pedido de Avaliação' : 'Review Request',
            description: language === 'pt'
                ? 'Pedir avaliação após a sessão'
                : 'Request review after session'
        },
        {
            key: 'notifyProfessional',
            icon: Bell,
            label: language === 'pt' ? 'Notificar-me' : 'Notify Me',
            description: language === 'pt'
                ? 'Receber notificação quando há nova marcação'
                : 'Get notified when there is a new booking'
        }
    ];

    return (
        <div style={{
            background: 'var(--bg-card)',
            borderRadius: '16px',
            border: '1px solid var(--border-default)',
            overflow: 'hidden'
        }}>
            {/* Header */}
            <div style={{
                padding: '1.5rem',
                borderBottom: '1px solid var(--border-default)',
                background: 'linear-gradient(135deg, rgba(37, 211, 102, 0.1), transparent)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: 'rgba(37, 211, 102, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <MessageCircle size={20} style={{ color: '#25D366' }} />
                    </div>
                    <div>
                        <h3 style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {t?.notifications?.whatsappNotifications || 'WhatsApp Notifications'}
                        </h3>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                            {language === 'pt'
                                ? 'Configure notificações automáticas'
                                : 'Configure automatic notifications'
                            }
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Toggle */}
            <div style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid var(--border-default)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                <div>
                    <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                        {t?.notifications?.enableWhatsApp || 'Enable WhatsApp'}
                    </p>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                        {language === 'pt'
                            ? 'Ativar notificações automáticas pelo WhatsApp'
                            : 'Enable automatic WhatsApp notifications'
                        }
                    </p>
                </div>
                <ToggleSwitch
                    checked={settings?.enabled || false}
                    onChange={() => handleToggle('enabled')}
                />
            </div>

            {/* Options */}
            <div style={{
                opacity: settings?.enabled ? 1 : 0.5,
                pointerEvents: settings?.enabled ? 'auto' : 'none',
                transition: 'opacity 0.2s ease'
            }}>
                {notificationOptions.map((option, index) => (
                    <div
                        key={option.key}
                        style={{
                            padding: '1rem 1.5rem',
                            borderBottom: index < notificationOptions.length - 1
                                ? '1px solid var(--border-default)'
                                : 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '1rem'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                            <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                background: 'var(--bg-elevated)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--text-muted)'
                            }}>
                                <option.icon size={16} />
                            </div>
                            <div>
                                <p style={{
                                    fontSize: '0.9375rem',
                                    fontWeight: 500,
                                    color: 'var(--text-primary)',
                                    marginBottom: '0.125rem'
                                }}>
                                    {option.label}
                                </p>
                                <p style={{
                                    fontSize: '0.75rem',
                                    color: 'var(--text-muted)'
                                }}>
                                    {option.description}
                                </p>
                            </div>
                        </div>
                        <ToggleSwitch
                            checked={settings?.[option.key] || false}
                            onChange={() => handleToggle(option.key)}
                        />
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div style={{
                padding: '1.25rem 1.5rem',
                borderTop: '1px solid var(--border-default)',
                background: 'var(--bg-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                {error && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        color: '#ef4444',
                        fontSize: '0.8125rem'
                    }}>
                        <AlertCircle size={14} />
                        {error}
                    </div>
                )}

                {saved && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        color: 'var(--accent-success)',
                        fontSize: '0.8125rem',
                        fontWeight: 500
                    }}>
                        <Check size={14} />
                        {t?.notifications?.notificationsSaved || 'Settings saved!'}
                    </div>
                )}

                {!error && !saved && <div />}

                <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                        padding: '0.75rem 1.5rem',
                        background: 'var(--accent-primary)',
                        border: 'none',
                        borderRadius: '10px',
                        color: 'white',
                        fontWeight: 600,
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        transition: 'all 0.2s ease',
                        boxShadow: 'var(--shadow-sm)'
                    }}
                >
                    {saving ? (
                        <div className="spinner" style={{ width: '16px', height: '16px' }} />
                    ) : (
                        <Save size={16} />
                    )}
                    {t?.common?.save || 'Save'}
                </button>
            </div>
        </div>
    );
}

/**
 * Toggle Switch Component
 */
function ToggleSwitch({ checked, onChange }) {
    return (
        <button
            onClick={onChange}
            style={{
                width: '48px',
                height: '26px',
                borderRadius: '13px',
                padding: '2px',
                border: 'none',
                cursor: 'pointer',
                background: checked
                    ? 'linear-gradient(135deg, #25D366, #128C7E)'
                    : 'var(--bg-elevated)',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center'
            }}
        >
            <div style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                background: 'white',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                transform: checked ? 'translateX(22px)' : 'translateX(0)',
                transition: 'transform 0.2s ease'
            }} />
        </button>
    );
}
