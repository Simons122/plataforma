import React from 'react';
import { X, Calendar, Clock, User, Phone, Mail, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';

export default function BookingDetailsModal({ booking, onClose, onCancel }) {
    if (!booking) return null;

    return (
        <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1000 }}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Detalhes da Marcação</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}>
                        <X size={20} />
                    </button>
                </div>

                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Serviço e Status */}
                    <div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-primary)', marginBottom: '0.5rem', lineHeight: 1.2 }}>
                            {booking.serviceName}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <span className="badge badge-success" style={{
                                padding: '4px 10px',
                                background: 'rgba(34, 197, 94, 0.1)',
                                color: 'var(--accent-success)',
                                borderRadius: '20px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                border: '1px solid rgba(34, 197, 94, 0.2)'
                            }}>
                                Confirmada
                            </span>
                            {booking.isStaff && (
                                <span style={{
                                    padding: '4px 10px',
                                    background: 'rgba(236, 72, 153, 0.1)',
                                    color: '#ec4899',
                                    borderRadius: '20px',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    border: '1px solid rgba(236, 72, 153, 0.2)'
                                }}>
                                    Staff: {booking.responsibleName}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Info Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <InfoItem icon={Calendar} label="Data" value={format(parseISO(booking.date), "d 'de' MMMM", { locale: pt })} />
                        <InfoItem icon={Clock} label="Horário" value={format(parseISO(booking.date), 'HH:mm')} />
                        <InfoItem icon={User} label="Cliente" value={booking.clientName} />
                        <InfoItem icon={Phone} label="Telefone" value={booking.clientPhone || 'N/A'} />
                    </div>

                    {booking.clientEmail && (
                        <InfoItem icon={Mail} label="Email" value={booking.clientEmail} fullWidth />
                    )}

                    {/* Ações */}
                    <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-default)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                        <button
                            onClick={onClose}
                            style={{
                                padding: '10px 20px',
                                background: 'transparent',
                                border: '1px solid var(--border-default)',
                                borderRadius: '12px',
                                fontWeight: 600,
                                color: 'var(--text-secondary)',
                                cursor: 'pointer'
                            }}
                        >
                            Fechar
                        </button>
                        <button
                            onClick={() => onCancel(booking)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                padding: '10px 20px',
                                background: 'rgba(239, 68, 68, 0.1)',
                                color: 'var(--accent-danger)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                borderRadius: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                            onMouseOut={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                        >
                            <Trash2 size={18} /> Cancelar Marcação
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function InfoItem({ icon: Icon, label, value, fullWidth }) {
    return (
        <div style={{ gridColumn: fullWidth ? '1 / -1' : 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                <Icon size={14} /> {label}
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                {value}
            </div>
        </div>
    );
}
