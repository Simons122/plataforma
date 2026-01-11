import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { db, auth, firebaseConfig, functions } from '../lib/firebase';
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { httpsCallable } from 'firebase/functions';
import Layout from '../components/Layout';
import { useToast } from '../components/Toast';
import { UserPlus, Trash2, Clock, Edit2, Save, X, Users, Upload, Check } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

const DAY_MAP_PT = { mon: 'Segunda', tue: 'Terça', wed: 'Quarta', thu: 'Quinta', fri: 'Sexta', sat: 'Sábado', sun: 'Domingo' };

const Toggle = ({ checked, onChange }) => (
    <button
        type="button"
        onClick={onChange}
        style={{
            width: '40px',
            height: '24px',
            borderRadius: '12px',
            background: checked ? 'var(--accent-primary)' : 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            cursor: 'pointer',
            position: 'relative',
            transition: 'all 0.2s ease',
            flexShrink: 0,
            padding: 0
        }}
    >
        <div style={{
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            background: 'white',
            position: 'absolute',
            top: '3px',
            left: checked ? '19px' : '3px',
            transition: 'left 0.2s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
        }} />
    </button>
);

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
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const toast = useToast();

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                fetchStaff();
                fetchEstablishmentSchedule();
            } else {
                setLoading(false);
            }
        });
        return () => unsubscribe();
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

    const processImage = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 300; // Um pouco maior que logo
                    const MAX_HEIGHT = 300;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.8));
                };
                img.onerror = reject;
                img.src = event.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const handleEditStaff = (member) => {
        setNewStaff({
            name: member.name || '',
            email: member.email || '',
            phone: member.phone || '',
            photoUrl: member.photoUrl || ''
        });
        setIsEditing(true);
        setEditingId(member.id);
        setShowAddModal(true);
    };





    const handleAddStaff = async (e) => {
        e.preventDefault();
        try {
            const user = auth.currentUser;
            if (!user) return;

            setUploadingPhoto(true);
            let photoUrl = newStaff.photoUrl;

            if (photoFile) {
                try {
                    photoUrl = await processImage(photoFile);
                } catch (err) {
                    console.error("Erro ao processar imagem", err);
                    alert("Erro ao processar imagem. Tente uma menor.");
                    setUploadingPhoto(false);
                    return;
                }
            }

            // Create Staff User Account if not editing
            let authUserId = null;
            if (!isEditing && newStaff.password) {
                try {
                    // Initialize a secondary app to create user without logging out admin
                    const secondaryApp = initializeApp(firebaseConfig, "Secondary");
                    const secondaryAuth = getAuth(secondaryApp);
                    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newStaff.email, newStaff.password);
                    authUserId = userCredential.user.uid;
                    await signOut(secondaryAuth); // Cleanup

                    // Delete the secondary app instance locally (improves memory, though optional in JS GC)
                    // (firebase/app deleteApp is available but initializeApp re-use is complex. 
                    //  Just signing out is usually enough for this flow.)

                } catch (authError) {
                    console.error("Erro ao criar conta de utilizador:", authError);
                    alert("Erro ao criar conta de login para o funcionário: " + authError.message);
                    setUploadingPhoto(false);
                    return;
                }
            }

            const staffData = {
                ...newStaff,
                photoUrl: photoUrl,
                establishmentId: user.uid,
                // Remove password from stored data for security
            };
            delete staffData.password;

            if (authUserId) {
                staffData.authUserId = authUserId;
            }

            if (isEditing && editingId) {
                // Update existing staff
                await updateDoc(doc(db, `professionals/${user.uid}/staff`, editingId), {
                    ...staffData,
                    updatedAt: new Date().toISOString()
                });
            } else {
                // Create new staff
                const docRef = await addDoc(collection(db, `professionals/${user.uid}/staff`), {
                    ...staffData,
                    createdAt: new Date().toISOString()
                });

                // Create Lookup Entry for Login
                if (authUserId) {
                    await setDoc(doc(db, "staff_lookup", authUserId), {
                        ownerId: user.uid,
                        staffId: docRef.id,
                        email: newStaff.email,
                        role: 'staff'
                    });
                }
            }

            setNewStaff({ name: '', email: '', phone: '', photoUrl: '', password: '' });
            setPhotoFile(null);
            setIsEditing(false);
            setEditingId(null);
            setShowAddModal(false);

            if (isEditing) toast.success("Profissional atualizado com sucesso!");
            else toast.success("Profissional adicionado com sucesso!");

            fetchStaff();
        } catch (error) {
            console.error("Erro ao salvar profissional:", error);
            if (error.code === 'auth/email-already-in-use') {
                toast.error("Este email já está registado no sistema.");
                alert("Erro: Este email já existe no Firebase Authentication.\n\nSe apagou este utilizador recentemente e o erro persiste, é porque a limpeza automática falhou. Terá de contactar o suporte ou usar outro email.");
            } else {
                toast.error("Erro ao salvar: " + error.message);
            }
        } finally {
            setUploadingPhoto(false);
        }
    };

    const handleDeleteStaff = async (staffMember) => {
        if (!confirm("Tem certeza que deseja remover este profissional? Esta ação é irreversível.")) return;

        try {
            const user = auth.currentUser;
            if (!user) return;

            // 1. Apagar conta Auth e Lookup (Cloud Function)
            if (staffMember.authUserId) {
                try {
                    const deleteAccount = httpsCallable(functions, 'deleteStaffAccount');
                    await deleteAccount({ staffAuthId: staffMember.authUserId });
                    toast.success("Conta de acesso removida.");
                } catch (funcError) {
                    console.error("Erro na Cloud Function:", funcError);
                    toast.warning("Atenção: O login não foi apagado (Erro no Servidor).");
                    alert("Aviso Técnico: A 'Cloud Function' de limpeza falhou ou não existe.\n\nO registo visual será apagado, mas o EMAIL deste funcionário continuará registado no sistema de Login.\n\nPara reutilizar este email, terá de o apagar manualmente na consola do Firebase Authentication.");
                    // Não parar, tentar apagar localmente mesmo assim
                }
            }

            // 2. Apagar Documento do Profissional
            await deleteDoc(doc(db, `professionals/${user.uid}/staff`, staffMember.id));

            toast.success("Profissional removido com sucesso!");
            fetchStaff();
        } catch (error) {
            console.error("Erro ao remover profissional:", error);
            toast.error("Erro ao remover profissional.");
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
            toast.success("Horários atualizados!");
            fetchStaff();
        } catch (error) {
            console.error("Erro ao salvar horário:", error);
            toast.error("Erro ao salvar horário!");
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
            <Layout role="professional">
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                    <div className="spinner"></div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout role="professional">
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
            {/* Staff Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '1.5rem'
            }}>
                {staff.map((member) => (
                    <div key={member.id} style={{
                        background: 'var(--bg-card)',
                        borderRadius: '16px',
                        border: '1px solid var(--border-default)',
                        padding: '1.5rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{
                                width: '60px',
                                height: '60px',
                                borderRadius: '50%',
                                background: 'var(--bg-secondary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.5rem',
                                fontWeight: 600,
                                color: 'var(--accent-primary)',
                                overflow: 'hidden'
                            }}>
                                {member.photoUrl ? (
                                    <img src={member.photoUrl} alt={member.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    (member.name && member.name.charAt(0).toUpperCase()) || '?'
                                )}
                            </div>
                            <div>
                                <h3 style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--text-primary)', marginBottom: '0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {member.name}
                                </h3>
                                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{member.email}</p>
                                {member.phone && <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{member.phone}</p>}
                            </div>
                        </div>

                        <div style={{ borderTop: '1px solid var(--border-default)', margin: '0.5rem 0' }} />

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                onClick={() => handleEditSchedule(member)}
                                style={{
                                    padding: '0.625rem',
                                    background: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)',
                                    border: '1px solid var(--border-default)',
                                    borderRadius: '8px',
                                    fontWeight: 600,
                                    fontSize: '0.875rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    flex: 2
                                }}
                            >
                                <Clock size={16} /> Horários
                            </button>
                            <button
                                onClick={() => handleEditStaff(member)}
                                style={{
                                    padding: '0.625rem',
                                    background: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)',
                                    border: '1px solid var(--border-default)',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flex: 1
                                }}
                            >
                                <Edit2 size={16} />
                            </button>
                            <button
                                onClick={() => handleDeleteStaff(member)}
                                style={{
                                    padding: '0.625rem',
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    color: 'var(--accent-error)',
                                    border: '1px solid transparent',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flex: 1
                                }}
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}

                {staff.length === 0 && !loading && (
                    <div style={{
                        gridColumn: '1 / -1',
                        textAlign: 'center',
                        padding: '4rem 2rem',
                        background: 'var(--bg-card)',
                        borderRadius: '16px',
                        border: '1px dashed var(--border-default)',
                        color: 'var(--text-muted)'
                    }}>
                        <Users size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                            Ainda não tem profissionais
                        </h3>
                        <p style={{ maxWidth: '400px', margin: '0 auto', marginBottom: '1.5rem' }}>
                            Adicione membros à sua equipa para que os clientes possam marcar serviços com eles.
                        </p>
                        <button
                            onClick={() => {
                                setNewStaff({ name: '', email: '', phone: '', photoUrl: '' });
                                setPhotoFile(null);
                                setIsEditing(false);
                                setEditingId(null);
                                setShowAddModal(true);
                            }}
                            style={{
                                color: 'var(--accent-primary)',
                                background: 'transparent',
                                border: 'none',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            + Adicionar o primeiro profissional
                        </button>
                    </div>
                )}
            </div>

            {/* Add/Edit Staff Modal */}
            {
                showAddModal && ReactDOM.createPortal(
                    <div style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0, 0, 0, 0.7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999,
                        padding: '2rem',
                        overflow: 'auto'
                    }} onClick={() => setShowAddModal(false)}>
                        <div style={{
                            background: 'var(--bg-card)',
                            borderRadius: '20px',
                            padding: '2rem',
                            maxWidth: '500px',
                            width: '100%',
                            border: '1px solid var(--border-default)',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                            maxHeight: 'calc(100vh - 4rem)',
                            overflowY: 'auto',
                            margin: 'auto'
                        }} onClick={e => e.stopPropagation()}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
                                {isEditing ? 'Editar Profissional' : 'Adicionar Profissional'}
                            </h2>
                            <form onSubmit={handleAddStaff} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <label className="label">Nome Completo *</label>
                                    <input
                                        className="input"
                                        placeholder="Nome do profissional"
                                        value={newStaff.name}
                                        onChange={e => setNewStaff({ ...newStaff, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="label">Email *</label>
                                    <input
                                        type="email"
                                        className="input"
                                        placeholder="email@exemplo.com"
                                        value={newStaff.email}
                                        onChange={e => setNewStaff({ ...newStaff, email: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="label">Telemóvel</label>
                                    <input
                                        className="input"
                                        placeholder="9xx xxx xxx"
                                        value={newStaff.phone}
                                        onChange={e => setNewStaff({ ...newStaff, phone: e.target.value })}
                                    />
                                </div>

                                {!isEditing && (
                                    <div>
                                        <label className="label">Senha para Login *</label>
                                        <input
                                            type="password"
                                            className="input"
                                            placeholder="Senha segura (mín. 6 caracteres)"
                                            value={newStaff.password || ''}
                                            onChange={e => setNewStaff({ ...newStaff, password: e.target.value })}
                                            required
                                            minLength={6}
                                        />
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                            Esta senha será usada pelo funcionário para entrar na plataforma.
                                        </p>
                                    </div>
                                )}

                                {/* Photo Upload */}
                                <div>
                                    <label className="label">Foto do Profissional</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        {(photoFile || newStaff.photoUrl) && (
                                            <div style={{
                                                width: '64px',
                                                height: '64px',
                                                borderRadius: '50%',
                                                overflow: 'hidden',
                                                border: '2px solid var(--accent-primary)',
                                                flexShrink: 0
                                            }}>
                                                <img
                                                    src={photoFile ? URL.createObjectURL(photoFile) : newStaff.photoUrl}
                                                    alt="Preview"
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                />
                                            </div>
                                        )}

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                                            <label
                                                className="input"
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '0.5rem',
                                                    cursor: 'pointer',
                                                    background: 'var(--bg-secondary)',
                                                    border: '1px dashed var(--border-default)',
                                                    height: 'auto',
                                                    padding: '0.75rem'
                                                }}
                                            >
                                                <Upload size={18} />
                                                {newStaff.photoUrl || photoFile ? 'Alterar Foto' : 'Escolher Foto'}
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => {
                                                        if (e.target.files[0]) {
                                                            setPhotoFile(e.target.files[0]);
                                                        }
                                                    }}
                                                    style={{ display: 'none' }}
                                                />
                                            </label>
                                            {(photoFile || newStaff.photoUrl) && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setPhotoFile(null);
                                                        setNewStaff(prev => ({ ...prev, photoUrl: '' }));
                                                    }}
                                                    style={{
                                                        color: 'var(--accent-error)',
                                                        background: 'transparent',
                                                        border: 'none',
                                                        fontSize: '0.875rem',
                                                        cursor: 'pointer',
                                                        alignSelf: 'flex-start'
                                                    }}
                                                >
                                                    Remover foto
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                    <button
                                        type="button"
                                        onClick={() => setShowAddModal(false)}
                                        style={{
                                            flex: 1,
                                            padding: '0.875rem',
                                            background: 'var(--bg-secondary)',
                                            color: 'var(--text-primary)',
                                            border: '1px solid var(--border-default)',
                                            borderRadius: '12px',
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
                                        {uploadingPhoto ? 'Enviando...' : (isEditing ? 'Guardar Alterações' : 'Adicionar')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                    , document.body)
            }

            {/* Edit Schedule Modal */}
            {
                editingSchedule && staffSchedule && ReactDOM.createPortal(
                    <div style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0, 0, 0, 0.7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999,
                        padding: '2rem',
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
                            margin: 'auto'
                        }} onClick={e => e.stopPropagation()}>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                                <div>
                                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                        Horário de Trabalho
                                    </h2>
                                    <p style={{ color: 'var(--text-muted)' }}>
                                        Defina a disponibilidade de {staff.find(s => s.id === editingSchedule)?.name}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setEditingSchedule(null)}
                                    style={{
                                        background: 'var(--bg-elevated)',
                                        border: 'none',
                                        borderRadius: '50%',
                                        width: '36px',
                                        height: '36px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'var(--text-secondary)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '60vh', overflowY: 'auto', paddingRight: '0.5rem' }}>
                                {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((day) => (
                                    <div key={day} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '1rem',
                                        padding: '1rem',
                                        background: staffSchedule[day].enabled ? 'var(--bg-secondary)' : 'var(--bg-card)',
                                        borderRadius: '12px',
                                        border: '1px solid',
                                        borderColor: staffSchedule[day].enabled ? 'var(--border-default)' : 'var(--border-default)',
                                        opacity: staffSchedule[day].enabled ? 1 : 0.6,
                                        transition: 'all 0.2s ease'
                                    }}>
                                        <Toggle
                                            checked={staffSchedule[day].enabled}
                                            onChange={() => updateStaffSchedule(day, 'enabled', !staffSchedule[day].enabled)}
                                        />

                                        <span style={{
                                            width: '80px',
                                            fontWeight: 600,
                                            color: staffSchedule[day].enabled ? 'var(--text-primary)' : 'var(--text-muted)'
                                        }}>
                                            {DAY_MAP_PT[day]}
                                        </span>

                                        {staffSchedule[day].enabled ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                                                <input
                                                    type="time"
                                                    className="input"
                                                    value={staffSchedule[day].start}
                                                    onChange={(e) => updateStaffSchedule(day, 'start', e.target.value)}
                                                    style={{ padding: '0.5rem', borderRadius: '8px', minWidth: '100px' }}
                                                />
                                                <span style={{ color: 'var(--text-muted)' }}>até</span>
                                                <input
                                                    type="time"
                                                    className="input"
                                                    value={staffSchedule[day].end}
                                                    onChange={(e) => updateStaffSchedule(day, 'end', e.target.value)}
                                                    style={{ padding: '0.5rem', borderRadius: '8px', minWidth: '100px' }}
                                                />
                                            </div>
                                        ) : (
                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Folga</span>
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
                    , document.body)
            }
        </Layout >
    );
}
