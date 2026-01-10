import React, { useEffect, useState } from 'react';
import { auth, db, storage } from '../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { User2, Mail, Building2, Save, CheckCircle2, Loader2, Camera, X } from 'lucide-react';
import Layout from '../components/Layout';
import { useToast } from '../components/Toast';

export default function ProfilePage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [profile, setProfile] = useState({
        name: '',
        email: '',
        businessName: '',
        phone: '',
        logoUrl: ''
    });
    const [savedBusinessName, setSavedBusinessName] = useState('');
    const toast = useToast();

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user) {
                const docRef = doc(db, "professionals", user.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setProfile(prev => ({ ...prev, ...data }));
                    setSavedBusinessName(data.businessName || '');
                }
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validations
        if (!file.type.startsWith('image/')) {
            toast.error('Por favor, selecione uma imagem.');
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            toast.error('A imagem deve ter no máximo 2MB.');
            return;
        }

        setUploading(true);
        try {
            const reader = new FileReader();
            reader.onload = async (event) => {
                const img = new Image();
                img.onload = async () => {
                    // Create canvas for resizing
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 200;
                    const MAX_HEIGHT = 200;
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
                    const base64 = canvas.toDataURL('image/jpeg', 0.8);

                    const user = auth.currentUser;
                    await updateDoc(doc(db, "professionals", user.uid), {
                        logoUrl: base64
                    });

                    setProfile(prev => ({ ...prev, logoUrl: base64 }));
                    toast.success('Logo atualizada com sucesso!');
                    setUploading(false);
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error(error);
            toast.error('Erro ao processar imagem.');
            setUploading(false);
        }
    };

    const handleRemoveLogo = async () => {
        const user = auth.currentUser;
        setUploading(true);
        try {
            await updateDoc(doc(db, "professionals", user.uid), {
                logoUrl: ''
            });
            setProfile(prev => ({ ...prev, logoUrl: '' }));
            toast.success('Logo removida.');
        } catch (error) {
            console.error(error);
            toast.error('Erro ao remover logo.');
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const user = auth.currentUser;
            if (user) {
                const slugify = (text) => {
                    return text
                        .toString()
                        .toLowerCase()
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .replace(/\s+/g, '-')
                        .replace(/[^\w\-]+/g, '')
                        .replace(/\-\-+/g, '-')
                        .replace(/^-+/, '')
                        .replace(/-+$/, '');
                };

                const newSlug = slugify(profile.businessName || profile.name);

                await updateDoc(doc(db, "professionals", user.uid), {
                    businessName: profile.businessName,
                    name: profile.name,
                    phone: profile.phone || '',
                    logoUrl: profile.logoUrl || '',
                    slug: newSlug
                });
                setSavedBusinessName(profile.businessName);
                toast.success('Guardado com sucesso!');
            }
        } catch (error) {
            console.error(error);
            toast.error('Erro ao atualizar perfil.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <Layout role="professional" brandName={savedBusinessName}>
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                <div style={{ marginBottom: '2rem' }}>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Perfil Profissional</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Gerencie as informações do seu estabelecimento.</p>
                </div>

                <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Logo Upload Section */}
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
                                borderRadius: '20px',
                                background: 'var(--bg-secondary)',
                                border: '2px dashed var(--border-default)',
                                overflow: 'hidden',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'relative'
                            }}>
                                {profile.logoUrl ? (
                                    <img
                                        src={profile.logoUrl}
                                        alt="Logo"
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                ) : (
                                    <Building2 size={24} strokeWidth={1.75} style={{ color: 'var(--text-muted)' }} />
                                )}
                                {uploading && (
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
                            {profile.logoUrl && !uploading && (
                                <button
                                    type="button"
                                    onClick={handleRemoveLogo}
                                    style={{
                                        position: 'absolute',
                                        top: '-8px',
                                        right: '-8px',
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
                                    <X size={14} />
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
                                cursor: uploading ? 'wait' : 'pointer',
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-default)',
                                transition: 'all 0.2s ease'
                            }}>
                                <Camera size={16} />
                                {profile.logoUrl ? 'Alterar Logo' : 'Carregar Logo'}
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleLogoUpload}
                                    style={{ display: 'none' }}
                                    disabled={uploading}
                                />
                            </label>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                JPG ou PNG. Máximo 2MB.
                            </p>
                        </div>
                    </div>

                    {/* Business Name */}
                    <div style={{
                        background: 'var(--bg-card)',
                        padding: '1.5rem',
                        borderRadius: '16px',
                        border: '1px solid var(--border-default)',
                        boxShadow: 'var(--shadow-sm)'
                    }}>
                        <label className="label" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Building2 size={16} strokeWidth={1.75} /> Nome do Estabelecimento
                        </label>
                        <input
                            type="text"
                            className="input"
                            value={profile.businessName || ''}
                            onChange={(e) => setProfile({ ...profile, businessName: e.target.value })}
                            placeholder="Ex: Barbearia do João, Clínica Estética..."
                        />
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
                            Este nome será exibido no topo do seu dashboard e no seu link de marcações.
                        </p>
                    </div>

                    {/* Basic Info */}
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
                        <div>
                            <label className="label" style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <User2 size={16} strokeWidth={1.75} /> Nome Completo
                            </label>
                            <input
                                type="text"
                                className="input"
                                value={profile.name || ''}
                                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="label" style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Mail size={16} /> Email (Não editável)
                            </label>
                            <input
                                type="email"
                                className="input"
                                value={profile.email || ''}
                                readOnly
                                style={{
                                    background: 'var(--bg-primary)',
                                    opacity: 0.6,
                                    cursor: 'not-allowed'
                                }}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={saving || uploading}
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
                            cursor: (saving || uploading) ? 'wait' : 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: 'var(--shadow-md)'
                        }}
                        onMouseOver={(e) => !(saving || uploading) && (e.currentTarget.style.background = 'var(--accent-primary-hover)')}
                        onMouseOut={(e) => !(saving || uploading) && (e.currentTarget.style.background = 'var(--accent-primary)')}
                    >
                        {(saving || uploading) ? <Loader2 size={18} className="spinner" /> : <Save size={18} />}
                        {saving ? 'A guardar...' : 'Guardar Alterações'}
                    </button>
                </form>
            </div>
        </Layout>
    );
}
