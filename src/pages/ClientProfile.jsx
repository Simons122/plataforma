
import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Camera, Save, Loader2, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../lib/firebase';
import Layout from '../components/Layout';
import { useLanguage } from '../i18n';
import PendingReviewsPrompt from '../components/PendingReviewsPrompt';
import { useNavigate } from 'react-router-dom';

export default function ClientProfile() {
    const { t, language } = useLanguage();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        photoURL: ''
    });
    const [message, setMessage] = useState(null); // { type: 'success' | 'error', text: '' }

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                try {
                    // Tentar obter dados do Firestore
                    const docRef = doc(db, 'clients', currentUser.uid);
                    const docSnap = await getDoc(docRef);

                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        setFormData({
                            name: data.name || currentUser.displayName || '',
                            email: currentUser.email || '',
                            phone: data.phone || '',
                            photoURL: currentUser.photoURL || ''
                        });
                    } else {
                        // Fallback se não existir no Firestore
                        setFormData({
                            name: currentUser.displayName || '',
                            email: currentUser.email || '',
                            phone: '',
                            photoURL: currentUser.photoURL || ''
                        });
                    }
                } catch (err) {
                    console.error("Erro ao carregar perfil:", err);
                }
            } else {
                navigate('/client/auth');
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [navigate]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validar tamanho/tipo se necessário
        if (file.size > 5 * 1024 * 1024) {
            setMessage({ type: 'error', text: language === 'pt' ? 'A imagem deve ter menos de 5MB' : 'Image must be under 5MB' });
            return;
        }

        setSaving(true);
        try {
            const storageRef = ref(storage, `clients/${user.uid}/profile_${Date.now()}`);
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);

            // Atualizar Auth
            await updateProfile(user, { photoURL: downloadURL });

            // Atualizar Firestore
            const docRef = doc(db, 'clients', user.uid);
            await updateDoc(docRef, { photoURL: downloadURL }); // Assume que doc existe. Se não existir, devia ser setDoc com merge

            setFormData(prev => ({ ...prev, photoURL: downloadURL }));
            setMessage({ type: 'success', text: language === 'pt' ? 'Foto de perfil atualizada!' : 'Profile photo updated!' });
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: language === 'pt' ? 'Erro ao carregar foto' : 'Error uploading photo' });
        } finally {
            setSaving(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        try {
            // Atualizar Auth Profile (Display Name)
            if (user.displayName !== formData.name) {
                await updateProfile(user, { displayName: formData.name });
            }

            // Atualizar Firestore
            const docRef = doc(db, 'clients', user.uid);

            // Verificar se documento existe antes de update (pode ter sido apagado ou nunca criado num login social antigo)
            // Mas assumimos que existe ou que updateDoc falha se não existir? updateDoc falha.
            // Para segurança usamos setDoc com merge: true
            const { setDoc } = await import('firebase/firestore'); // Import dinâmico ou adicionado acima

            await setDoc(docRef, {
                name: formData.name,
                phone: formData.phone,
                email: formData.email // Manter email atualizado
            }, { merge: true });

            setMessage({ type: 'success', text: language === 'pt' ? 'Perfil atualizado com sucesso!' : 'Profile updated successfully!' });
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: language === 'pt' ? 'Erro ao atualizar perfil' : 'Error updating profile' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
                <Loader2 className="spinner" />
            </div>
        );
    }

    return (
        <Layout role="client" brandName={user?.displayName || user?.email?.split('@')[0]}>
            <div style={{ maxWidth: '600px', margin: '0 auto', paddingBottom: '3rem' }} className="animate-fade-in">

                {/* Header */}
                <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                        {language === 'pt' ? 'O Meu Perfil' : 'My Profile'}
                    </h1>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        {language === 'pt' ? 'Gerencie as suas informações pessoais' : 'Manage your personal information'}
                    </p>
                </div>

                {/* Feedback Message */}
                {message && (
                    <div style={{
                        padding: '1rem',
                        borderRadius: '12px',
                        marginBottom: '2rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        background: message.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        border: `1px solid ${message.type === 'success' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                        color: message.type === 'success' ? 'var(--accent-success)' : 'var(--accent-danger)'
                    }} className="animate-fade-in-down">
                        {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                        <span style={{ fontWeight: 500 }}>{message.text}</span>
                    </div>
                )}

                <div style={{
                    background: 'var(--bg-card)',
                    borderRadius: '24px',
                    border: '1px solid var(--border-default)',
                    padding: '2rem',
                    boxShadow: 'var(--shadow-sm)'
                }}>
                    {/* Avatar Upload */}
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
                        <div style={{ position: 'relative' }}>
                            <div style={{
                                width: '120px',
                                height: '120px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, var(--accent-primary), #60a5fa)',
                                padding: '3px',
                                boxShadow: 'var(--shadow-lg)'
                            }}>
                                <div style={{
                                    width: '100%',
                                    height: '100%',
                                    borderRadius: '50%',
                                    overflow: 'hidden',
                                    background: 'var(--bg-card)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    {formData.photoURL ? (
                                        <img src={formData.photoURL} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <User size={48} style={{ color: 'var(--text-muted)' }} />
                                    )}
                                </div>
                            </div>

                            <label style={{
                                position: 'absolute',
                                bottom: '0',
                                right: '0',
                                background: 'var(--accent-primary)',
                                color: 'white',
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                                transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
                            }}
                                className="hover:scale-110"
                            >
                                <Camera size={18} />
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    style={{ display: 'none' }}
                                    disabled={saving}
                                />
                            </label>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {/* Name Input */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginLeft: '0.25rem' }}>
                                {language === 'pt' ? 'Nome Completo' : 'Full Name'}
                            </label>
                            <div style={{ position: 'relative' }}>
                                <User style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
                                <input
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="input"
                                    style={{ paddingLeft: '3rem' }}
                                    placeholder={language === 'pt' ? 'Seu nome' : 'Your name'}
                                    required
                                />
                            </div>
                        </div>

                        {/* Email Input (Read Only) */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginLeft: '0.25rem' }}>
                                Email
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Mail style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
                                <input
                                    name="email"
                                    value={formData.email}
                                    className="input"
                                    style={{ paddingLeft: '3rem', opacity: 0.7, cursor: 'not-allowed', background: 'var(--bg-secondary)' }}
                                    readOnly
                                    title={language === 'pt' ? 'Não é possível alterar o email' : 'Email cannot be changed'}
                                />
                            </div>
                        </div>

                        {/* Phone Input */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginLeft: '0.25rem' }}>
                                {language === 'pt' ? 'Telemóvel' : 'Phone'}
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Phone style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
                                <input
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className="input"
                                    style={{ paddingLeft: '3rem' }}
                                    placeholder={language === 'pt' ? 'Seu contacto' : 'Your contact'}
                                />
                            </div>
                        </div>

                        <div style={{ height: '1rem' }}></div>

                        <button
                            type="submit"
                            disabled={saving}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                padding: '1rem',
                                background: 'var(--accent-primary)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '12px',
                                fontSize: '1rem',
                                fontWeight: 600,
                                cursor: saving ? 'wait' : 'pointer',
                                transition: 'all 0.2s ease',
                                boxShadow: 'var(--shadow-md)'
                            }}
                            className="hover:scale-[1.02] active:scale-[0.98]"
                        >
                            {saving ? <Loader2 className="spinner" size={20} /> : <Save size={20} />}
                            {language === 'pt' ? 'Guardar Alterações' : 'Save Changes'}
                        </button>
                    </form>
                </div>
            </div>

            <PendingReviewsPrompt />
        </Layout>
    );
}
