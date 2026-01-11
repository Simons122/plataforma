import React, { useEffect, useState } from 'react';
import { db, auth, storage } from '../lib/firebase';
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Layout from '../components/Layout';
import { UserPlus, Trash2, Clock, Edit2, Save, X, Users, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

const DAY_MAP_PT = { mon: 'Segunda', tue: 'Terça', wed: 'Quarta', thu: 'Quinta', fri: 'Sexta', sat: 'Sábado', sun: 'Domingo' };

export default function ManageStaff() {
    const [loading, setLoading] = useState(true);
    const [staff, setStaff] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState(null);
    const [newStaff, setNewStaff] = useState({ name: '', email: '', phone: '', photoUrl: '' });
    const [photoFile, setPhotoFile] = useState(null);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [establishmentSchedule, setEstablishmentSchedule] = useState(null);
    const [staffSchedule, setStaffSchedule] = useState(null);

    useEffect(() => {
        fetchStaff();
        fetchEstablishmentSchedule();
    }, []);

    const fetchEstablishmentSchedule = async () => {
        try {
            const user = auth.currentUser;
            if (!user) return;

            const scheduleDoc = await getDoc(doc(db, `professionals/${user.uid}/settings`, 'schedule'));
            if (scheduleDoc.exists()) {
                setEstablishmentSchedule(scheduleDoc.data());
            }
        } catch (error) {
            console.error("Erro ao buscar horário do estabelecimento:", error);
        }
    };

    const fetchStaff = async () => {
        try {
            const user = auth.currentUser;
            if (!user) return;

            const staffSnap = await getDocs(collection(db, `professionals/${user.uid}/staff`));
            const staffData = await Promise.all(staffSnap.docs.map(async (d) => {
                const scheduleDoc = await getDoc(doc(db, `professionals/${user.uid}/staff/${d.id}/settings`, 'schedule'));
                return {
                    id: d.id,
                    ...d.data(),
                    schedule: scheduleDoc.exists() ? scheduleDoc.data() : null
                };
            }));
            setStaff(staffData);
        } catch (error) {
            console.error("Erro ao buscar profissionais:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddStaff = async (e) => {
        e.preventDefault();
        try {
            const user = auth.currentUser;
            if (!user) return;

            setUploadingPhoto(true);
            let photoUrl = '';

            // Upload photo to Firebase Storage if file is selected
            if (photoFile) {
                const photoRef = ref(storage, `staff/${user.uid}/${Date.now()}_${photoFile.name}`);
                await uploadBytes(photoRef, photoFile);
                photoUrl = await getDownloadURL(photoRef);
            }

            await addDoc(collection(db, `professionals/${user.uid}/staff`), {
                ...newStaff,
                photoUrl: photoUrl || newStaff.photoUrl,
                createdAt: new Date().toISOString(),
                establishmentId: user.uid
            });

            setNewStaff({ name: '', email: '', phone: '', photoUrl: '' });
            setPhotoFile(null);
            setShowAddModal(false);
            fetchStaff();
        } catch (error) {
            console.error("Erro ao adicionar profissional:", error);
            alert("Erro ao adicionar profissional!");
        } finally {
            setUploadingPhoto(false);
        }
    };

    const handleDeleteStaff = async (staffId) => {
        if (!confirm("Tem certeza que deseja remover este profissional?")) return;

        try {
            const user = auth.currentUser;
            if (!user) return;

            await deleteDoc(doc(db, `professionals/${user.uid}/staff`, staffId));
            fetchStaff();
        } catch (error) {
            console.error("Erro ao remover profissional:", error);
            alert("Erro ao remover profissional!");
        }
    };

    const handleEditSchedule = (staffMember) => {
        setEditingSchedule(staffMember.id);
        setStaffSchedule(staffMember.schedule || {
            mon: { enabled: true, start: '09:00', end: '18:00' },
            tue: { enabled: true, start: '09:00', end: '18:00' },
            wed: { enabled: true, start: '09:00', end: '18:00' },
            thu: { enabled: true, start: '09:00', end: '18:00' },
            fri: { enabled: true, start: '09:00', end: '18:00' },
            sat: { enabled: false, start: '09:00', end: '18:00' },
            sun: { enabled: false, start: '09:00', end: '18:00' }
        });
    };

    const handleSaveSchedule = async () => {
        try {
            const user = auth.currentUser;
            if (!user) return;

            // Validar que os horários estão dentro do horário do estabelecimento
            if (establishmentSchedule) {
                for (const [day, schedule] of Object.entries(staffSchedule)) {
                    if (schedule.enabled && establishmentSchedule[day]?.enabled) {
                        const estStart = establishmentSchedule[day].start;
                        const estEnd = establishmentSchedule[day].end;

                        if (schedule.start < estStart || schedule.end > estEnd) {
                            alert(`O horário de ${DAY_MAP_PT[day]} deve estar dentro do horário do estabelecimento (${estStart} - ${estEnd})`);
                            return;
                        }
                    }
                }
            }

            // Use setDoc with merge to create or update the document
            await setDoc(doc(db, `professionals/${user.uid}/staff/${editingSchedule}/settings`, 'schedule'), staffSchedule, { merge: true });

            setEditingSchedule(null);
            setStaffSchedule(null);
            fetchStaff();
        } catch (error) {
            console.error("Erro ao salvar horário:", error);
            alert("Erro ao salvar horário!");
        }
    };

    const updateStaffSchedule = (day, field, value) => {
        setStaffSchedule(prev => ({
            ...prev,
            [day]: { ...prev[day], [field]: value }
        }));
    };

    if (loading) {
        return (
            <Layout role="professional" brandName="Profissionais">
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                    <div className="spinner"></div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout role="professional" brandName="Profissionais">
            <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                            Gerir Profissionais
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                            Adicione e gerencie os profissionais do seu estabelecimento
                        </p>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.75rem 1.5rem',
                            background: 'var(--accent-primary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: 'var(--shadow-md)'
                        }}
                        className="hover:bg-[var(--accent-primary-hover)]"
                    >
                        <UserPlus size={18} />
                        Adicionar Profissional
                    </button>
                </div>
            </div>

            {/* Staff Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '1.5rem'
            }}>
                {staff.length === 0 ? (
                    <div style={{
                        gridColumn: '1 / -1',
                        textAlign: 'center',
                        padding: '4rem 1rem',
                        color: 'var(--text-muted)'
                    }}>
                        <Users size={48} style={{ opacity: 0.3, margin: '0 auto 1rem' }} />
                        <p>Nenhum profissional adicionado ainda.</p>
                        <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>Clique em "Adicionar Profissional" para começar.</p>
                    </div>
                ) : staff.map(member => (
                    <div key={member.id} style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-default)',
                        borderRadius: '16px',
                        padding: '1.5rem',
                        transition: 'all 0.3s ease'
                    }}
                        onMouseOver={e => {
                            e.currentTarget.style.transform = 'translateY(-4px)';
                            e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
                        }}
                        onMouseOut={e => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    >
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
                            <div style={{
                                width: '56px',
                                height: '56px',
                                borderRadius: '50%',
                                background: member.photoUrl ? 'transparent' : 'linear-gradient(135deg, var(--accent-primary), #60a5fa)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.5rem',
                                fontWeight: 700,
                                color: 'white',
                                overflow: 'hidden',
                                flexShrink: 0,
                                border: '2px solid var(--bg-card)',
                                boxShadow: 'var(--shadow-md)'
                            }}>
                                {member.photoUrl ? (
                                    <img src={member.photoUrl} alt={member.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    member.name?.charAt(0).toUpperCase()
                                )}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                                    {member.name}
                                </h3>
                                {member.profession && (
                                    <span style={{
                                        fontSize: '0.75rem',
                                        padding: '2px 8px',
                                        background: 'var(--bg-elevated)',
                                        borderRadius: '6px',
                                        color: 'var(--text-secondary)',
                                        fontWeight: 500
                                    }}>
                                        {member.profession}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Contact Info */}
                        <div style={{
                            background: 'var(--bg-elevated)',
                            padding: '1rem',
                            borderRadius: '12px',
                            marginBottom: '1rem'
                        }}>
                            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                                📧 {member.email}
                            </div>
                            {member.phone && (
                                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                                    📞 {member.phone}
                                </div>
                            )}
                        </div>

                        {/* Schedule Info */}
                        {member.schedule && (
                            <div style={{
                                background: 'var(--bg-elevated)',
                                padding: '0.75rem',
                                borderRadius: '10px',
                                marginBottom: '1rem'
                            }}>
                                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Horário
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                    {Object.entries(member.schedule).filter(([_, s]) => s.enabled).map(([day, schedule]) => (
                                        <span key={day} style={{
                                            fontSize: '0.7rem',
                                            padding: '3px 6px',
                                            background: 'var(--accent-primary)',
                                            color: 'white',
                                            borderRadius: '4px',
                                            fontWeight: 600
                                        }}>
                                            {DAY_MAP_PT[day]}: {schedule.start}-{schedule.end}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                onClick={() => handleEditSchedule(member)}
                                style={{
                                    flex: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    padding: '0.625rem',
                                    background: 'var(--bg-elevated)',
                                    border: '1px solid var(--border-default)',
                                    borderRadius: '8px',
                                    color: 'var(--text-secondary)',
                                    fontSize: '0.8125rem',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                                className="hover:bg-[var(--bg-card)] hover:border-[var(--accent-primary)] hover:color-[var(--accent-primary)]"
                            >
                                <Clock size={16} />
                                Horário
                            </button>
                            <button
                                onClick={() => handleDeleteStaff(member.id)}
                                style={{
                                    padding: '0.625rem',
                                    background: 'var(--bg-elevated)',
                                    border: '1px solid var(--border-default)',
                                    borderRadius: '8px',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                                className="hover:bg-[var(--accent-danger)] hover:border-[var(--accent-danger)] hover:color-white"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Add Staff Modal */}
            {showAddModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.7)',
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '1rem'
                }} onClick={() => setShowAddModal(false)}>
                    <div style={{
                        background: 'var(--bg-card)',
                        borderRadius: '20px 20px 0 0',
                        padding: '2rem',
                        maxWidth: '500px',
                        width: '100%',
                        border: '1px solid var(--border-default)',
                        boxShadow: 'var(--shadow-xl)',
                        maxHeight: '90vh',
                        overflowY: 'auto'
                    }} onClick={e => e.stopPropagation()}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
                            Adicionar Profissional
                        </h2>
                        <form onSubmit={handleAddStaff} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label className="label" style={{ marginBottom: '0.5rem' }}>Nome Completo *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Nome do profissional"
                                    value={newStaff.name}
                                    onChange={e => setNewStaff({ ...newStaff, name: e.target.value })}
                                    className="input"
                                />
                            </div>
                            <div>
                                <label className="label" style={{ marginBottom: '0.5rem' }}>Email *</label>
                                <input
                                    type="email"
                                    required
                                    placeholder="email@exemplo.com"
                                    value={newStaff.email}
                                    onChange={e => setNewStaff({ ...newStaff, email: e.target.value })}
                                    className="input"
                                />
                            </div>
                            <div>
                                <label className="label" style={{ marginBottom: '0.5rem' }}>Telemóvel</label>
                                <input
                                    type="tel"
                                    placeholder="9xx xxx xxx"
                                    value={newStaff.phone}
                                    onChange={e => setNewStaff({ ...newStaff, phone: e.target.value })}
                                    className="input"
                                />
                            </div>
                            <div>
                                <label className="label" style={{ marginBottom: '0.5rem' }}>Foto do Profissional</label>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                    {photoFile && (
                                        <div style={{
                                            width: '64px',
                                            height: '64px',
                                            borderRadius: '50%',
                                            overflow: 'hidden',
                                            border: '2px solid var(--accent-primary)',
                                            flexShrink: 0
                                        }}>
                                            <img
                                                src={URL.createObjectURL(photoFile)}
                                                alt="Preview"
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                        </div>
                                    )}
                                    <label style={{
                                        flex: 1,
                                        padding: '0.875rem',
                                        background: 'var(--bg-elevated)',
                                        border: '1px solid var(--border-default)',
                                        borderRadius: '12px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        textAlign: 'center',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem',
                                        color: 'var(--text-primary)',
                                        fontWeight: 600,
                                        fontSize: '0.9375rem'
                                    }} className="hover:bg-[var(--bg-card)]">
                                        <Upload size={18} />
                                        {photoFile ? 'Alterar Foto' : 'Escolher Foto'}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={e => setPhotoFile(e.target.files[0])}
                                            style={{ display: 'none' }}
                                        />
                                    </label>
                                </div>
                                {photoFile && (
                                    <button
                                        type="button"
                                        onClick={() => setPhotoFile(null)}
                                        style={{
                                            marginTop: '0.5rem',
                                            padding: '0.5rem',
                                            background: 'transparent',
                                            border: 'none',
                                            color: 'var(--accent-danger)',
                                            cursor: 'pointer',
                                            fontSize: '0.8125rem',
                                            fontWeight: 500
                                        }}
                                    >
                                        Remover foto
                                    </button>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    style={{
                                        flex: 1,
                                        padding: '0.875rem',
                                        background: 'var(--bg-elevated)',
                                        border: '1px solid var(--border-default)',
                                        borderRadius: '12px',
                                        color: 'var(--text-secondary)',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={uploadingPhoto}
                                    style={{
                                        flex: 1,
                                        padding: '0.875rem',
                                        background: uploadingPhoto ? 'var(--bg-elevated)' : 'var(--accent-primary)',
                                        color: uploadingPhoto ? 'var(--text-muted)' : 'white',
                                        border: 'none',
                                        borderRadius: '12px',
                                        fontWeight: 600,
                                        cursor: uploadingPhoto ? 'wait' : 'pointer',
                                        boxShadow: uploadingPhoto ? 'none' : 'var(--shadow-md)'
                                    }}
                                >
                                    {uploadingPhoto ? 'Enviando...' : 'Adicionar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Schedule Modal */}
            {editingSchedule && staffSchedule && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '1rem',
                    overflowY: 'auto'
                }} onClick={() => setEditingSchedule(null)}>
                    <div style={{
                        background: 'var(--bg-card)',
                        borderRadius: '20px',
                        padding: '2rem',
                        maxWidth: '600px',
                        width: '100%',
                        border: '1px solid var(--border-default)',
                        boxShadow: 'var(--shadow-xl)',
                        maxHeight: '90vh',
                        overflowY: 'auto'
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                Definir Horário
                            </h2>
                            <button onClick={() => setEditingSchedule(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                <X size={24} />
                            </button>
                        </div>

                        {establishmentSchedule && (
                            <div style={{
                                background: 'var(--bg-elevated)',
                                padding: '0.75rem 1rem',
                                borderRadius: '10px',
                                marginBottom: '1.5rem',
                                border: '1px solid var(--border-default)'
                            }}>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', fontWeight: 600 }}>
                                    ℹ️ Horário do Estabelecimento
                                </p>
                                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                                    O horário do profissional deve estar dentro do horário do estabelecimento.
                                </p>
                            </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {Object.entries(DAY_MAP_PT).map(([dayKey, dayName]) => (
                                <div key={dayKey} style={{
                                    background: 'var(--bg-elevated)',
                                    padding: '1rem',
                                    borderRadius: '12px',
                                    border: '1px solid var(--border-default)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{dayName}</span>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                checked={staffSchedule[dayKey]?.enabled || false}
                                                onChange={e => updateStaffSchedule(dayKey, 'enabled', e.target.checked)}
                                                style={{ cursor: 'pointer' }}
                                            />
                                            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Ativo</span>
                                        </label>
                                    </div>
                                    {staffSchedule[dayKey]?.enabled && (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                            <div>
                                                <label className="label" style={{ fontSize: '0.75rem', marginBottom: '0.375rem' }}>Início</label>
                                                <input
                                                    type="time"
                                                    value={staffSchedule[dayKey].start}
                                                    onChange={e => updateStaffSchedule(dayKey, 'start', e.target.value)}
                                                    className="input"
                                                    style={{ fontSize: '0.875rem' }}
                                                />
                                            </div>
                                            <div>
                                                <label className="label" style={{ fontSize: '0.75rem', marginBottom: '0.375rem' }}>Fim</label>
                                                <input
                                                    type="time"
                                                    value={staffSchedule[dayKey].end}
                                                    onChange={e => updateStaffSchedule(dayKey, 'end', e.target.value)}
                                                    className="input"
                                                    style={{ fontSize: '0.875rem' }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                    {establishmentSchedule?.[dayKey] && (
                                        <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                            Estabelecimento: {establishmentSchedule[dayKey].enabled ? `${establishmentSchedule[dayKey].start} - ${establishmentSchedule[dayKey].end}` : 'Fechado'}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                            <button
                                onClick={() => setEditingSchedule(null)}
                                style={{
                                    flex: 1,
                                    padding: '0.875rem',
                                    background: 'var(--bg-elevated)',
                                    border: '1px solid var(--border-default)',
                                    borderRadius: '12px',
                                    color: 'var(--text-secondary)',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveSchedule}
                                style={{
                                    flex: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    padding: '0.875rem',
                                    background: 'var(--accent-primary)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '12px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    boxShadow: 'var(--shadow-md)'
                                }}
                            >
                                <Save size={18} />
                                Salvar Horário
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}
