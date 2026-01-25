import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Plus, Trash2, Edit2, Clock, Euro, Briefcase } from 'lucide-react';
import { useLanguage } from '../i18n';

export default function ServiceManager({ userId }) {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({ name: '', duration: 30, price: 0 });
    const { t } = useLanguage();

    useEffect(() => {
        fetchServices();
    }, [userId]);

    const fetchServices = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, `professionals/${userId}/services`));
            setServices(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (formData.id) {
                // Edit
                await updateDoc(doc(db, `professionals/${userId}/services`, formData.id), {
                    name: formData.name,
                    duration: Number(formData.duration),
                    price: Number(formData.price)
                });
            } else {
                // Create
                await addDoc(collection(db, `professionals/${userId}/services`), {
                    name: formData.name,
                    duration: Number(formData.duration),
                    price: Number(formData.price),
                    createdAt: new Date().toISOString()
                });
            }
            setFormData({ name: '', duration: 30, price: 0 });
            setIsEditing(false);
            fetchServices();
        } catch (e) {
            console.error(e);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm(t('services.confirmDelete', "Are you sure you want to delete this service?"))) return;
        await deleteDoc(doc(db, `professionals/${userId}/services`, id));
        fetchServices();
    };

    return (
        <div style={{
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-default)',
            padding: '1.5rem',
            boxShadow: 'var(--shadow-sm)'
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem'
            }}>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {t('services.myServices', 'My Services')}
                </h2>
                <button
                    onClick={() => setIsEditing(!isEditing)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 1rem',
                        background: isEditing ? 'transparent' : 'var(--accent-primary)',
                        color: isEditing ? 'var(--text-secondary)' : 'white',
                        border: isEditing ? '1px solid var(--border-default)' : 'none',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                    }}
                    onMouseOver={(e) => {
                        if (!isEditing) e.currentTarget.style.background = 'var(--accent-primary-hover)';
                        else e.currentTarget.style.background = 'var(--bg-elevated)';
                    }}
                    onMouseOut={(e) => {
                        if (!isEditing) e.currentTarget.style.background = 'var(--accent-primary)';
                        else e.currentTarget.style.background = 'transparent';
                    }}
                >
                    {isEditing ? t('common.cancel', 'Cancel') : <><Plus size={16} /> {t('services.newService', 'New Service')}</>}
                </button>
            </div>

            {isEditing && (
                <form
                    onSubmit={handleSubmit}
                    style={{
                        marginBottom: '2rem',
                        background: 'var(--bg-secondary)',
                        padding: '1.25rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-default)',
                        animation: 'fadeIn 0.3s ease'
                    }}
                >
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '1rem'
                    }}>
                        <div style={{ flex: 1 }}>
                            <label className="label">{t('services.serviceName', 'Nome do Serviço')}</label>
                            <input
                                className="input"
                                placeholder={t('services.exampleService', "Ex: Corte de Cabelo")}
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label className="label">{t('services.duration', 'Duração')} (min)</label>
                            <select
                                className="select"
                                value={formData.duration}
                                onChange={e => setFormData({ ...formData, duration: e.target.value })}
                            >
                                <option value="15">15 min</option>
                                <option value="30">30 min</option>
                                <option value="45">45 min</option>
                                <option value="60">60 min</option>
                                <option value="90">1h 30m</option>
                                <option value="120">2h 00m</option>
                            </select>
                        </div>
                        <div style={{ flex: 1 }}>
                            <label className="label">{t('services.price', 'Preço')} (€)</label>
                            <input
                                type="number"
                                step="0.5"
                                className="input"
                                placeholder="0.00"
                                value={formData.price}
                                onChange={e => setFormData({ ...formData, price: e.target.value })}
                            />
                        </div>
                    </div>
                    <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                            type="submit"
                            style={{
                                padding: '0.625rem 1.25rem',
                                background: 'var(--accent-primary)',
                                color: 'white',
                                border: 'none',
                                borderRadius: 'var(--radius-md)',
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.background = 'var(--accent-primary-hover)'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'var(--accent-primary)'}
                        >
                            {t('services.saveService', 'Guardar Serviço')}
                        </button>
                    </div>
                </form>
            )}

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {services.length === 0 && !loading && (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        <Briefcase size={32} style={{ marginBottom: '0.5rem', opacity: 0.3 }} />
                        <p style={{ fontSize: '0.875rem' }}>{t('services.noServices', 'Ainda não criou nenhum serviço.')}</p>
                    </div>
                )}

                {services.map(service => (
                    <div
                        key={service.id}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '1rem',
                            background: 'var(--bg-secondary)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-default)',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.borderColor = 'var(--accent-primary)';
                            e.currentTarget.style.background = 'var(--bg-elevated)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border-default)';
                            e.currentTarget.style.background = 'var(--bg-secondary)';
                        }}
                    >
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <h4 style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{service.name}</h4>
                            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={14} /> {service.duration} min</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--accent-success)', fontWeight: 600 }}><Euro size={14} /> {service.price}€</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                onClick={() => { setFormData(service); setIsEditing(true); }}
                                style={{
                                    padding: '0.5rem',
                                    color: 'var(--text-muted)',
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'color 0.15s ease'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                                onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                            >
                                <Edit2 size={16} />
                            </button>
                            <button
                                onClick={() => handleDelete(service.id)}
                                style={{
                                    padding: '0.5rem',
                                    color: 'var(--text-muted)',
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'color 0.15s ease'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.color = 'var(--accent-error)'}
                                onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
