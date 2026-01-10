import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Clock, Save, Check } from 'lucide-react';
import { useToast } from './Toast';

const DAYS = [
    { id: 'mon', label: 'Segunda' },
    { id: 'tue', label: 'Terça' },
    { id: 'wed', label: 'Quarta' },
    { id: 'thu', label: 'Quinta' },
    { id: 'fri', label: 'Sexta' },
    { id: 'sat', label: 'Sábado' },
    { id: 'sun', label: 'Domingo' }
];

const DEFAULT_SCHEDULE = {
    mon: { enabled: true, start: '09:00', end: '18:00' },
    tue: { enabled: true, start: '09:00', end: '18:00' },
    wed: { enabled: true, start: '09:00', end: '18:00' },
    thu: { enabled: true, start: '09:00', end: '18:00' },
    fri: { enabled: true, start: '09:00', end: '18:00' },
    sat: { enabled: false, start: '09:00', end: '13:00' },
    sun: { enabled: false, start: '09:00', end: '13:00' }
};

export default function ScheduleManager({ userId }) {
    const [schedule, setSchedule] = useState(DEFAULT_SCHEDULE);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const toast = useToast();

    useEffect(() => {
        fetchSchedule();
    }, [userId]);

    const fetchSchedule = async () => {
        try {
            const docRef = doc(db, `professionals/${userId}/settings`, 'schedule');
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setSchedule(docSnap.data());
            }
        } catch (e) {
            console.error('Error fetching schedule:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleDay = (dayId) => {
        setSchedule(prev => ({
            ...prev,
            [dayId]: { ...prev[dayId], enabled: !prev[dayId].enabled }
        }));
        setSaved(false);
    };

    const handleTimeChange = (dayId, field, value) => {
        setSchedule(prev => ({
            ...prev,
            [dayId]: { ...prev[dayId], [field]: value }
        }));
        setSaved(false);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await setDoc(doc(db, `professionals/${userId}/settings`, 'schedule'), schedule);
            setSaved(true);
            toast.success('Horário guardado com sucesso!');
            setTimeout(() => setSaved(false), 2000);
        } catch (e) {
            console.error('Error saving schedule:', e);
            toast.error('Erro ao guardar horário. Verifique as permissões do Firestore.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div style={{
                background: 'var(--bg-card)',
                borderRadius: '14px',
                border: '1px solid var(--border-default)',
                padding: '2rem',
                display: 'flex',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-sm)'
            }}>
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div style={{
            background: 'var(--bg-card)',
            borderRadius: '14px',
            border: '1px solid var(--border-default)',
            padding: '1.5rem',
            boxShadow: 'var(--shadow-sm)'
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                        padding: '0.5rem',
                        background: 'rgba(99, 102, 241, 0.1)',
                        borderRadius: '8px',
                        color: 'var(--accent-primary)'
                    }}>
                        <Clock size={20} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)' }}>Horário de Funcionamento</h2>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                            Configure os dias e horas que trabalha
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.625rem 1.25rem',
                        background: saved ? 'var(--accent-success)' : 'var(--accent-primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        cursor: saving ? 'wait' : 'pointer',
                        transition: 'all 0.15s ease'
                    }}
                    onMouseOver={(e) => {
                        if (!saving && !saved) e.currentTarget.style.background = 'var(--accent-primary-hover)';
                    }}
                    onMouseOut={(e) => {
                        if (!saving && !saved) e.currentTarget.style.background = 'var(--accent-primary)';
                    }}
                >
                    {saved ? <Check size={16} /> : <Save size={16} />}
                    {saving ? 'A guardar...' : saved ? 'Guardado!' : 'Guardar'}
                </button>
            </div>

            {/* Schedule Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {DAYS.map(day => (
                    <div
                        key={day.id}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            padding: '0.75rem 1rem',
                            background: schedule[day.id].enabled ? 'var(--bg-secondary)' : 'transparent',
                            borderRadius: '10px',
                            border: '1px solid',
                            borderColor: schedule[day.id].enabled ? 'var(--border-default)' : 'transparent',
                            opacity: schedule[day.id].enabled ? 1 : 0.6,
                            transition: 'all 0.15s ease'
                        }}
                    >
                        {/* Toggle */}
                        <button
                            onClick={() => handleToggleDay(day.id)}
                            style={{
                                width: '40px',
                                height: '24px',
                                borderRadius: '12px',
                                background: schedule[day.id].enabled ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                                border: '1px solid var(--border-default)',
                                cursor: 'pointer',
                                position: 'relative',
                                transition: 'all 0.2s ease',
                                flexShrink: 0
                            }}
                        >
                            <div style={{
                                width: '16px',
                                height: '16px',
                                borderRadius: '50%',
                                background: 'white',
                                position: 'absolute',
                                top: '3px',
                                left: schedule[day.id].enabled ? '19px' : '3px',
                                transition: 'left 0.2s ease',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                            }} />
                        </button>

                        {/* Day Label */}
                        <span style={{
                            width: '80px',
                            fontSize: '0.9375rem',
                            fontWeight: 600,
                            color: schedule[day.id].enabled ? 'var(--text-primary)' : 'var(--text-muted)'
                        }}>
                            {day.label}
                        </span>

                        {/* Time Inputs */}
                        {schedule[day.id].enabled && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                                <input
                                    type="time"
                                    value={schedule[day.id].start}
                                    onChange={(e) => handleTimeChange(day.id, 'start', e.target.value)}
                                    className="input"
                                    style={{
                                        padding: '0.375rem 0.625rem',
                                        width: 'auto',
                                        minWidth: '100px'
                                    }}
                                />
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>até</span>
                                <input
                                    type="time"
                                    value={schedule[day.id].end}
                                    onChange={(e) => handleTimeChange(day.id, 'end', e.target.value)}
                                    className="input"
                                    style={{
                                        padding: '0.375rem 0.625rem',
                                        width: 'auto',
                                        minWidth: '100px'
                                    }}
                                />
                            </div>
                        )}

                        {!schedule[day.id].enabled && (
                            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Folga</span>
                        )}
                    </div>
                ))}
            </div>

            {/* Info */}
            <div style={{
                marginTop: '1.5rem',
                padding: '1.25rem',
                background: 'rgba(99, 102, 241, 0.03)',
                borderRadius: '12px',
                border: '1px solid var(--border-default)',
                color: 'var(--text-secondary)',
                fontSize: '0.8125rem',
                lineHeight: 1.6,
                display: 'flex',
                gap: '0.75rem'
            }}>
                <span style={{ fontSize: '1.25rem' }}>💡</span>
                <p>
                    Os horários que definir aqui serão usados para calcular automaticamente
                    os slots disponíveis para os clientes marcarem. Os slots são gerados com base
                    na duração de cada serviço e no seu horário de funcionamento.
                </p>
            </div>
        </div>
    );
}
