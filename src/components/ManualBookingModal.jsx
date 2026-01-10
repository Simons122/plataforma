import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, Phone, Briefcase, Loader2 } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { useToast } from './Toast';

export default function ManualBookingModal({ isOpen, onClose, professionalId, onBookingAdded }) {
    const [loading, setLoading] = useState(false);
    const [services, setServices] = useState([]);
    const [formData, setFormData] = useState({
        clientName: '',
        clientPhone: '',
        serviceId: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        time: '10:00'
    });
    const toast = useToast();

    useEffect(() => {
        if (isOpen && professionalId) {
            fetchServices();
        }
    }, [isOpen, professionalId]);

    const fetchServices = async () => {
        try {
            const snap = await getDocs(collection(db, `professionals/${professionalId}/services`));
            setServices(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (error) {
            console.error(error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.serviceId) {
            toast.error('Selecione um serviço');
            return;
        }

        setLoading(true);
        try {
            const selectedService = services.find(s => s.id === formData.serviceId);
            const bookingDate = new Date(`${formData.date}T${formData.time}:00`);

            await addDoc(collection(db, `professionals/${professionalId}/bookings`), {
                serviceId: selectedService.id,
                serviceName: selectedService.name,
                price: selectedService.price,
                duration: selectedService.duration,
                date: bookingDate.toISOString(),
                clientName: formData.clientName,
                clientPhone: formData.clientPhone,
                status: 'confirmed',
                createdAt: new Date().toISOString(),
                source: 'manual'
            });

            toast.success('Marcação efetuada com sucesso!');
            onBookingAdded();
            onClose();
            setFormData({
                clientName: '',
                clientPhone: '',
                serviceId: '',
                date: format(new Date(), 'yyyy-MM-dd'),
                time: '10:00'
            });
        } catch (error) {
            console.error(error);
            toast.error('Erro ao criar marcação');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(4px)',
            animation: 'fadeIn 0.2s ease-out'
        }}>
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>

            <div style={{
                background: 'var(--bg-card)',
                width: '100%',
                maxWidth: '450px',
                borderRadius: '16px',
                border: '1px solid var(--border-default)',
                overflow: 'hidden',
                animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: 'var(--shadow-lg)'
            }}>
                {/* Header */}
                <div style={{
                    padding: '1.25rem',
                    borderBottom: '1px solid var(--border-default)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'var(--bg-secondary)'
                }}>
                    <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)' }}>Nova Marcação Manual</h2>
                    <button
                        onClick={onClose}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem' }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Cliente */}
                    <div>
                        <label className="label">
                            <User size={14} style={{ display: 'inline', marginRight: '0.5rem' }} /> Nome do Cliente
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="Ex: João Silva"
                            value={formData.clientName}
                            onChange={e => setFormData({ ...formData, clientName: e.target.value })}
                            className="input"
                        />
                    </div>

                    {/* Telefone */}
                    <div>
                        <label className="label">
                            <Phone size={14} style={{ display: 'inline', marginRight: '0.5rem' }} /> Telefone (Opcional)
                        </label>
                        <input
                            type="tel"
                            placeholder="Ex: 912345678"
                            value={formData.clientPhone}
                            onChange={e => setFormData({ ...formData, clientPhone: e.target.value })}
                            className="input"
                        />
                    </div>

                    {/* Serviço */}
                    <div>
                        <label className="label">
                            <Briefcase size={14} style={{ display: 'inline', marginRight: '0.5rem' }} /> Serviço
                        </label>
                        <select
                            required
                            value={formData.serviceId}
                            onChange={e => setFormData({ ...formData, serviceId: e.target.value })}
                            className="select"
                        >
                            <option value="">Selecione um serviço</option>
                            {services.map(s => (
                                <option key={s.id} value={s.id}>{s.name} ({s.price}€)</option>
                            ))}
                        </select>
                    </div>

                    {/* Data e Hora */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label className="label">
                                <Calendar size={14} style={{ display: 'inline', marginRight: '0.5rem' }} /> Data
                            </label>
                            <input
                                type="date"
                                required
                                value={formData.date}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                                className="input"
                            />
                        </div>
                        <div>
                            <label className="label">
                                <Clock size={14} style={{ display: 'inline', marginRight: '0.5rem' }} /> Hora
                            </label>
                            <input
                                type="time"
                                required
                                value={formData.time}
                                onChange={e => setFormData({ ...formData, time: e.target.value })}
                                className="input"
                            />
                        </div>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            marginTop: '0.5rem',
                            padding: '0.875rem',
                            background: 'var(--accent-primary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '0.9375rem',
                            fontWeight: 600,
                            cursor: loading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => !loading && (e.currentTarget.style.background = 'var(--accent-primary-hover)')}
                        onMouseOut={(e) => !loading && (e.currentTarget.style.background = 'var(--accent-primary)')}
                    >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : 'Confirmar Marcação'}
                    </button>
                </form>
            </div>
        </div>
    );
}
