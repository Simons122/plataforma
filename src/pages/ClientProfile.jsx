
import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Camera, Save, Loader2, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
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

        // Validations
        if (!file.type.startsWith('image/')) {
            setMessage({ type: 'error', text: language === 'pt' ? 'Por favor, selecione uma imagem.' : 'Please select an image.' });
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            setMessage({ type: 'error', text: language === 'pt' ? 'A imagem deve ter no máximo 2MB.' : 'Image must be under 2MB.' });
            return;
        }

        setSaving(true);
        try {
            const reader = new FileReader();
            reader.onload = async (event) => {
                const img = new Image();
                img.onload = async () => {
                    // Create canvas for resizing
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 400;
                    const MAX_HEIGHT = 400;
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

                    // Get compressed Base64
                    const base64 = canvas.toDataURL('image/jpeg', 0.85);

                    try {
                        // Update Firestore with Base64
                        const docRef = doc(db, 'clients', user.uid);
                        const { setDoc } = await import('firebase/firestore');
                        await setDoc(docRef, { photoURL: base64 }, { merge: true });

                        // Update Auth profile
                        await updateProfile(user, { photoURL: base64 });

                        setFormData(prev => ({ ...prev, photoURL: base64 }));
                        setMessage({ type: 'success', text: language === 'pt' ? 'Foto de perfil atualizada!' : 'Profile photo updated!' });
                    } catch (error) {
                        console.error(error);
                        setMessage({ type: 'error', text: language === 'pt' ? 'Erro ao guardar foto' : 'Error saving photo' });
                    } finally {
                        setSaving(false);
                    }
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: language === 'pt' ? 'Erro ao processar imagem' : 'Error processing image' });
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
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                {/* Header - Left aligned like ProfilePage */}
                <div style={{ marginBottom: '2rem' }}>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                        {language === 'pt' ? 'O Meu Perfil' : 'My Profile'}
                    </h1>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        {language === 'pt' ? 'Gerencie as suas informações pessoais.' : 'Manage your personal information.'}
                    </p>
                </div>

                {/* Feedback Message */}
                {message && (
                    <div style={{
                        padding: '1rem',
                        borderRadius: '12px',
                        marginBottom: '1.5rem',
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

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Image Upload Section - Separate Card */}
                    <div style={{
                        background: 'var(--bg-card)',
                        padding: '1.5rem',
                        borderRadius: '16px',
                        border: '1px solid var(--border-default)',
                        boxShadow: 'var(--shadow-sm)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '1rem'
                    }}>
                        <div style={{ position: 'relative' }}>
                            <div style={{
                                width: '100px',
                                height: '100px',
                                borderRadius: '50%',
                                background: 'var(--bg-secondary)',
                                border: '2px dashed var(--border-default)',
                                overflow: 'hidden',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'relative'
                            }}>
                                {formData.photoURL ? (
                                    <img
                                        src={formData.photoURL}
                                        alt="Profile"
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                ) : (
                                    <Camera size={24} strokeWidth={1.75} style={{ color: 'var(--text-muted)' }} />
                                )}
                                {saving && (
                                    <div style={{
                                        position: 'absolute',
                                        inset: 0,
                                        background: 'rgba(0,0,0,0.4)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'white'
                                    }}>
                                        <Loader2 size={24} className="spinner" />
                                    </div>
                                )}
                            </div>
                            {formData.photoURL && !saving && (
                                <button
                                    type="button"
                                    onClick={async () => {
                                        setSaving(true);
                                        try {
                                            await updateProfile(user, { photoURL: '' });
                                            const docRef = doc(db, 'clients', user.uid);
                                            const { setDoc } = await import('firebase/firestore');
                                            await setDoc(docRef, { photoURL: '' }, { merge: true });
                                            setFormData(prev => ({ ...prev, photoURL: '' }));
                                            setMessage({ type: 'success', text: language === 'pt' ? 'Foto removida!' : 'Photo removed!' });
                                        } catch (error) {
                                            console.error(error);
                                            setMessage({ type: 'error', text: language === 'pt' ? 'Erro ao remover foto' : 'Error removing photo' });
                                        } finally {
                                            setSaving(false);
                                        }
                                    }}
                                    style={{
                                        position: 'absolute',
                                        top: '-4px',
                                        right: '-4px',
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '50%',
                                        background: 'var(--accent-danger)',
                                        color: 'white',
                                        border: 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        boxShadow: 'var(--shadow-sm)'
                                    }}
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        <div style={{ textAlign: 'center' }}>
                            <label className="label" style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.5rem 1rem',
                                background: 'var(--bg-elevated)',
                                borderRadius: '8px',
                                cursor: saving ? 'wait' : 'pointer',
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-default)',
                                transition: 'all 0.2s ease'
                            }}>
                                <Camera size={16} />
                                {formData.photoURL
                                    ? (language === 'pt' ? 'Alterar Foto' : 'Change Photo')
                                    : (language === 'pt' ? 'Carregar Foto' : 'Upload Photo')
                                }
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    style={{ display: 'none' }}
                                    disabled={saving}
                                />
                            </label>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                {language === 'pt' ? 'JPG ou PNG. Máximo 2MB.' : 'JPG or PNG. Max 2MB.'}
                            </p>
                        </div>
                    </div>

                    {/* Basic Info - Separate Card */}
                    <div style={{
                        background: 'var(--bg-card)',
                        padding: '1.5rem',
                        borderRadius: '16px',
                        border: '1px solid var(--border-default)',
                        boxShadow: 'var(--shadow-sm)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1.25rem'
                    }}>
                        {/* Name */}
                        <div>
                            <label className="label" style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <User size={16} strokeWidth={1.75} /> {language === 'pt' ? 'Nome Completo' : 'Full Name'}
                            </label>
                            <input
                                type="text"
                                name="name"
                                className="input"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder={language === 'pt' ? 'Seu nome' : 'Your name'}
                                required
                            />
                        </div>

                        {/* Email (Read-only) */}
                        <div>
                            <label className="label" style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Mail size={16} /> {language === 'pt' ? 'Email (Não editável)' : 'Email (Not editable)'}
                            </label>
                            <input
                                type="email"
                                className="input"
                                value={formData.email}
                                readOnly
                                style={{
                                    background: 'var(--bg-primary)',
                                    opacity: 0.6,
                                    cursor: 'not-allowed'
                                }}
                            />
                        </div>

                        {/* Phone */}
                        <div>
                            <label className="label" style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Phone size={16} /> {language === 'pt' ? 'Telefone' : 'Phone'}
                            </label>
                            <input
                                type="tel"
                                name="phone"
                                className="input"
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder={language === 'pt' ? '(Opcional)' : '(Optional)'}
                            />
                        </div>
                    </div>

                    {/* Save Button */}
                    <button
                        type="submit"
                        disabled={saving}
                        style={{
                            background: 'var(--accent-primary)',
                            color: 'white',
                            padding: '1rem',
                            borderRadius: '12px',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.625rem',
                            border: 'none',
                            cursor: saving ? 'wait' : 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: 'var(--shadow-md)'
                        }}
                        onMouseOver={(e) => !saving && (e.currentTarget.style.background = 'var(--accent-primary-hover)')}
                        onMouseOut={(e) => !saving && (e.currentTarget.style.background = 'var(--accent-primary)')}
                    >
                        {saving ? <Loader2 size={18} className="spinner" /> : <Save size={18} />}
                        {saving
                            ? (language === 'pt' ? 'A guardar...' : 'Saving...')
                            : (language === 'pt' ? 'Guardar Alterações' : 'Save Changes')
                        }
                    </button>
                </form>
            </div>

            <PendingReviewsPrompt />
        </Layout>
    );
}
