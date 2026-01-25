import React, { useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { User2, Mail, Building2, Save, Loader2, Camera, X, Briefcase, Phone, MapPin, Instagram, Facebook, Globe } from 'lucide-react';
import Layout from '../components/Layout';
import { useToast } from '../components/Toast';
import { useLanguage } from '../i18n';

export default function ProfilePage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [profile, setProfile] = useState({
        name: '',
        email: '',
        businessName: '',
        phone: '',
        logoUrl: '',
        profession: '',
        // Morada
        address: '',
        postalCode: '',
        city: '',
        // Redes Sociais
        instagram: '',
        facebook: '',
        website: ''
    });
    const [savedBusinessName, setSavedBusinessName] = useState('');
    const toast = useToast();
    const { t } = useLanguage();

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user) {
                try {
                    // 1. Try Professional
                    const docRef = doc(db, "professionals", user.uid);
                    const docSnap = await getDoc(docRef);

                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        setProfile(prev => ({
                            ...prev,
                            ...data,
                            isStaff: false,
                            id: user.uid
                        }));
                        setSavedBusinessName(data.businessName || '');
                    } else {
                        // 2. Try Staff
                        const lookupSnap = await getDoc(doc(db, "staff_lookup", user.uid));
                        if (lookupSnap.exists()) {
                            const { ownerId, staffId } = lookupSnap.data();
                            const staffRef = doc(db, `professionals/${ownerId}/staff/${staffId}`);
                            const staffSnap = await getDoc(staffRef);

                            if (staffSnap.exists()) {
                                const data = staffSnap.data();
                                setProfile({
                                    ...data,
                                    logoUrl: data.photoUrl || '',
                                    isStaff: true,
                                    ownerId: ownerId,
                                    id: staffId,
                                    email: user.email
                                });
                            }
                        }
                    }
                } catch (err) {
                    console.error("Error fetching profile:", err);
                    toast.error(t('errors.profileNotFound', "Erro ao carregar perfil."));
                }
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error(t('profile.imageRequired', 'Por favor, selecione uma imagem.'));
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            toast.error(t('profile.imageSize', 'A imagem deve ter no máximo 2MB.'));
            return;
        }

        setUploading(true);
        try {
            const reader = new FileReader();
            reader.onload = async (event) => {
                const img = new Image();
                img.onload = async () => {
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

                    const base64 = canvas.toDataURL('image/jpeg', 0.85);

                    if (profile.isStaff) {
                        await updateDoc(doc(db, `professionals/${profile.ownerId}/staff/${profile.id}`), {
                            photoUrl: base64
                        });
                    } else {
                        await updateDoc(doc(db, "professionals", auth.currentUser.uid), {
                            logoUrl: base64
                        });
                    }

                    setProfile(prev => ({ ...prev, logoUrl: base64 }));
                    toast.success(profile.isStaff ? (t?.profile?.profileUpdated || 'Foto atualizada!') : (t?.profile?.profileUpdated || 'Logo atualizada!'));
                    setUploading(false);
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error(error);
            toast.error(t?.errors?.somethingWentWrong || 'Erro ao processar imagem.');
            setUploading(false);
        }
    };

    const handleRemoveImage = async () => {
        setUploading(true);
        try {
            if (profile.isStaff) {
                await updateDoc(doc(db, `professionals/${profile.ownerId}/staff/${profile.id}`), {
                    photoUrl: ''
                });
            } else {
                await updateDoc(doc(db, "professionals", auth.currentUser.uid), {
                    logoUrl: ''
                });
            }
            setProfile(prev => ({ ...prev, logoUrl: '' }));
            toast.success(t?.profile?.removeImage || 'Imagem removida.');
        } catch (error) {
            console.error(error);
            toast.error(t?.errors?.somethingWentWrong || 'Erro ao remover imagem.');
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (profile.isStaff) {
                await updateDoc(doc(db, `professionals/${profile.ownerId}/staff/${profile.id}`), {
                    name: profile.name,
                    phone: profile.phone || ''
                });
                toast.success(t?.profile?.profileUpdated || 'Perfil atualizado!');
            } else {
                const user = auth.currentUser;
                const slugify = (text) => text.toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/^-+/, '').replace(/-+$/, '');
                const newSlug = slugify(profile.businessName || profile.name);

                await updateDoc(doc(db, "professionals", user.uid), {
                    businessName: profile.businessName,
                    name: profile.name,
                    phone: profile.phone || '',
                    profession: profile.profession || '',
                    logoUrl: profile.logoUrl || '',
                    slug: newSlug,
                    address: profile.address || '',
                    postalCode: profile.postalCode || '',
                    city: profile.city || '',
                    instagram: profile.instagram || '',
                    facebook: profile.facebook || '',
                    website: profile.website || ''
                });
                setSavedBusinessName(profile.businessName);
                toast.success(t?.profile?.profileUpdated || 'Perfil atualizado com sucesso!');
            }
        } catch (error) {
            console.error(error);
            toast.error(t?.errors?.somethingWentWrong || 'Erro ao atualizar perfil.');
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
        <Layout role="professional" brandName={profile.isStaff ? profile.name : savedBusinessName}>
            <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '2rem' }}>
                {/* Hero Header */}
                <div style={{
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(59, 130, 246, 0.05))',
                    borderRadius: '24px',
                    padding: '2rem',
                    marginBottom: '2rem',
                    border: '1px solid var(--border-default)',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    {/* Decorative elements */}
                    <div style={{
                        position: 'absolute',
                        top: '-50px',
                        right: '-50px',
                        width: '200px',
                        height: '200px',
                        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
                        borderRadius: '50%',
                        pointerEvents: 'none'
                    }} />

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', position: 'relative', zIndex: 1, flexWrap: 'wrap' }}>
                        {/* Avatar/Logo */}
                        <div style={{ position: 'relative' }}>
                            <div style={{
                                width: '110px',
                                height: '110px',
                                borderRadius: profile.isStaff ? '50%' : '24px',
                                background: 'var(--bg-card)',
                                border: '3px solid var(--border-default)',
                                overflow: 'hidden',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: 'var(--shadow-lg)'
                            }}>
                                {profile.logoUrl ? (
                                    <img src={profile.logoUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <div style={{
                                        width: '100%', height: '100%',
                                        background: 'linear-gradient(135deg, var(--accent-primary), #60a5fa)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: 'white', fontWeight: 700, fontSize: '2.5rem'
                                    }}>
                                        {(profile.businessName || profile.name || '?').charAt(0).toUpperCase()}
                                    </div>
                                )}
                                {uploading && (
                                    <div style={{
                                        position: 'absolute', inset: 0,
                                        background: 'rgba(0,0,0,0.5)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        borderRadius: profile.isStaff ? '50%' : '24px'
                                    }}>
                                        <Loader2 size={28} className="spinner" style={{ color: 'white' }} />
                                    </div>
                                )}
                            </div>
                            {profile.logoUrl && !uploading && (
                                <button
                                    type="button"
                                    onClick={handleRemoveImage}
                                    className="remove-btn"
                                    style={{
                                        position: 'absolute', top: '-6px', right: '-6px',
                                        width: '28px', height: '28px', borderRadius: '50%',
                                        background: 'var(--accent-danger)', color: 'white',
                                        border: '2px solid var(--bg-card)', display: 'flex',
                                        alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer', boxShadow: 'var(--shadow-md)',
                                        transition: 'transform 0.2s'
                                    }}
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        <div style={{ flex: 1, minWidth: '200px' }}>
                            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                                {profile.isStaff ? t('profile.staffProfile', 'O Meu Perfil') : t('profile.proProfile', 'Perfil Profissional')}
                            </h1>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                                {profile.isStaff ? t('profile.staffProfileSubtitle', 'Gerencie a sua informação pessoal.') : t('profile.proProfileSubtitle', 'Gerencie as informações do seu estabelecimento.')}
                            </p>
                            <label className="upload-btn" style={{
                                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                                padding: '0.625rem 1.25rem', background: 'var(--bg-card)',
                                borderRadius: '12px', cursor: uploading ? 'wait' : 'pointer',
                                fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)',
                                border: '1px solid var(--border-default)', transition: 'all 0.2s',
                                boxShadow: 'var(--shadow-sm)'
                            }}>
                                <Camera size={18} />
                                {profile.logoUrl ? t('profile.changePhoto', 'Alterar Imagem') : t('profile.uploadImage', 'Carregar Imagem')}
                                <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} disabled={uploading} />
                            </label>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSave}>
                    {/* Two Column Layout */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>

                        {/* Left Column */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                            {/* Business Name Card */}
                            {!profile.isStaff && (
                                <div className="card-hover" style={{
                                    background: 'var(--bg-card)',
                                    padding: '1.5rem',
                                    borderRadius: '20px',
                                    border: '1px solid var(--border-default)',
                                    boxShadow: 'var(--shadow-sm)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                                        <div style={{
                                            padding: '0.625rem',
                                            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(99, 102, 241, 0.05))',
                                            borderRadius: '12px',
                                            color: 'var(--accent-primary)'
                                        }}>
                                            <Building2 size={20} />
                                        </div>
                                        <div>
                                            <h3 style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '1rem' }}>{t('profile.businessName', 'Estabelecimento')}</h3>
                                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('profile.businessNameSubtitle', 'Nome visível para clientes')}</p>
                                        </div>
                                    </div>
                                    <input
                                        type="text"
                                        className="input"
                                        value={profile.businessName || ''}
                                        onChange={(e) => setProfile({ ...profile, businessName: e.target.value })}
                                        placeholder="Ex: Barbearia do João..."
                                        style={{ fontSize: '1rem' }}
                                    />
                                </div>
                            )}

                            {/* Personal Info Card */}
                            <div className="card-hover" style={{
                                background: 'var(--bg-card)',
                                padding: '1.5rem',
                                borderRadius: '20px',
                                border: '1px solid var(--border-default)',
                                boxShadow: 'var(--shadow-sm)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                                    <div style={{
                                        padding: '0.625rem',
                                        background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(34, 197, 94, 0.05))',
                                        borderRadius: '12px',
                                        color: 'var(--accent-success)'
                                    }}>
                                        <User2 size={20} />
                                    </div>
                                    <div>
                                        <h3 style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '1rem' }}>{t('profile.personalData', 'Dados Pessoais')}</h3>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('profile.personalDataSubtitle', 'As tuas informações de contacto')}</p>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div>
                                        <label className="label" style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}>
                                            <User2 size={14} /> {t('profile.fullName', 'Nome Completo')}
                                        </label>
                                        <input
                                            type="text"
                                            className="input"
                                            value={profile.name || ''}
                                            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                                            placeholder="O teu nome..."
                                        />
                                    </div>

                                    <div>
                                        <label className="label" style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}>
                                            <Mail size={14} /> {t('profile.email', 'Email')}
                                        </label>
                                        <input
                                            type="email"
                                            className="input disabled-input"
                                            value={profile.email || ''}
                                            readOnly
                                            style={{ background: 'var(--bg-primary)', opacity: 0.6, cursor: 'not-allowed' }}
                                        />
                                    </div>

                                    <div>
                                        <label className="label" style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}>
                                            <Phone size={14} /> {t('bookingPage.phone', 'Telefone')}
                                        </label>
                                        <input
                                            type="tel"
                                            className="input"
                                            value={profile.phone || ''}
                                            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                            placeholder="+351 912 345 678"
                                        />
                                    </div>

                                    {!profile.isStaff && (
                                        <div>
                                            <label className="label" style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}>
                                                <Briefcase size={14} /> {t('profile.profession', 'Profissão')}
                                            </label>
                                            <select
                                                className="select"
                                                value={profile.profession || ''}
                                                onChange={(e) => setProfile({ ...profile, profession: e.target.value })}
                                            >
                                                <option value="">{t('profile.professionPlaceholder', 'Selecione uma profissão')}</option>
                                                <option value="Barbeiro">Barbeiro</option>
                                                <option value="Personal Trainer">Personal Trainer</option>
                                                <option value="Tatuador">Tatuador</option>
                                                <option value="Explicador">Explicador</option>
                                                <option value="Freelancer">Freelancer</option>
                                                <option value="Cabeleireiro">Cabeleireiro</option>
                                                <option value="Esteticista">Esteticista</option>
                                                <option value="Massagista">Massagista</option>
                                                <option value="Fotógrafo">Fotógrafo</option>
                                                <option value="Outro">{t('profile.other', 'Outro')}</option>
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right Column */}
                        {!profile.isStaff && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                                {/* Address Card */}
                                <div className="card-hover" style={{
                                    background: 'var(--bg-card)',
                                    padding: '1.5rem',
                                    borderRadius: '20px',
                                    border: '1px solid var(--border-default)',
                                    boxShadow: 'var(--shadow-sm)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                                        <div style={{
                                            padding: '0.625rem',
                                            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05))',
                                            borderRadius: '12px',
                                            color: '#ef4444'
                                        }}>
                                            <MapPin size={20} />
                                        </div>
                                        <div>
                                            <h3 style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '1rem' }}>{t('profile.address', 'Morada')}</h3>
                                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('profile.addressSubtitle', 'Localização do estabelecimento')}</p>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div>
                                            <label className="label" style={{ marginBottom: '0.5rem', fontSize: '0.8125rem' }}>{t('profile.addressLabel', 'Rua / Endereço')}</label>
                                            <input
                                                type="text"
                                                className="input"
                                                value={profile.address || ''}
                                                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                                                placeholder="Ex: Rua das Flores, 123"
                                            />
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '0.75rem' }}>
                                            <div>
                                                <label className="label" style={{ marginBottom: '0.5rem', fontSize: '0.8125rem' }}>{t('profile.zipCode', 'Código Postal')}</label>
                                                <input
                                                    type="text"
                                                    className="input"
                                                    value={profile.postalCode || ''}
                                                    onChange={(e) => setProfile({ ...profile, postalCode: e.target.value })}
                                                    placeholder="1000-001"
                                                />
                                            </div>
                                            <div>
                                                <label className="label" style={{ marginBottom: '0.5rem', fontSize: '0.8125rem' }}>{t('profile.city', 'Cidade')}</label>
                                                <input
                                                    type="text"
                                                    className="input"
                                                    value={profile.city || ''}
                                                    onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                                                    placeholder="Lisboa"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Social Media Card */}
                                <div className="card-hover" style={{
                                    background: 'var(--bg-card)',
                                    padding: '1.5rem',
                                    borderRadius: '20px',
                                    border: '1px solid var(--border-default)',
                                    boxShadow: 'var(--shadow-sm)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                                        <div style={{
                                            padding: '0.625rem',
                                            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(59, 130, 246, 0.05))',
                                            borderRadius: '12px',
                                            color: '#3b82f6'
                                        }}>
                                            <Globe size={20} />
                                        </div>
                                        <div>
                                            <h3 style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '1rem' }}>{t('profile.socials', 'Redes Sociais')}</h3>
                                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('profile.socialsSubtitle', 'Links para os teus perfis')}</p>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div>
                                            <label className="label" style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}>
                                                <Instagram size={14} style={{ color: '#E4405F' }} /> Instagram
                                            </label>
                                            <div style={{ position: 'relative' }}>
                                                <span style={{
                                                    position: 'absolute', left: '1rem', top: '50%',
                                                    transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.875rem'
                                                }}>@</span>
                                                <input
                                                    type="text"
                                                    className="input"
                                                    value={profile.instagram || ''}
                                                    onChange={(e) => setProfile({ ...profile, instagram: e.target.value.replace('@', '') })}
                                                    placeholder="o_teu_usuario"
                                                    style={{ paddingLeft: '2rem' }}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="label" style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}>
                                                <Facebook size={14} style={{ color: '#1877F2' }} /> Facebook
                                            </label>
                                            <input
                                                type="text"
                                                className="input"
                                                value={profile.facebook || ''}
                                                onChange={(e) => setProfile({ ...profile, facebook: e.target.value })}
                                                placeholder="facebook.com/a-tua-pagina"
                                            />
                                        </div>

                                        <div>
                                            <label className="label" style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}>
                                                <Globe size={14} style={{ color: 'var(--accent-primary)' }} /> {t('profile.website', 'Website')}
                                            </label>
                                            <input
                                                type="text"
                                                className="input"
                                                value={profile.website || ''}
                                                onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                                                placeholder="www.o-teu-site.pt"
                                            />
                                        </div>
                                    </div>

                                    <div style={{
                                        marginTop: '1rem',
                                        padding: '0.875rem',
                                        background: 'rgba(59, 130, 246, 0.05)',
                                        borderRadius: '12px',
                                        border: '1px solid rgba(59, 130, 246, 0.1)',
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '0.75rem'
                                    }}>
                                        <span style={{ fontSize: '1.25rem' }}>💡</span>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                            {t('profile.publicInfoNote', 'Estas informações serão exibidas na tua página pública, ajudando os clientes a encontrarem-te.')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Save Button */}
                    <button
                        type="submit"
                        disabled={saving || uploading}
                        className="save-btn"
                        style={{
                            width: '100%',
                            background: 'linear-gradient(135deg, var(--accent-primary), #60a5fa)',
                            color: 'white',
                            padding: '1.125rem',
                            borderRadius: '16px',
                            fontWeight: 600,
                            fontSize: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.625rem',
                            border: 'none',
                            cursor: (saving || uploading) ? 'wait' : 'pointer',
                            transition: 'all 0.3s ease',
                            boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)'
                        }}
                    >
                        {(saving || uploading) ? <Loader2 size={20} className="spinner" /> : <Save size={20} />}
                        {saving ? t('profile.saving', 'A guardar...') : t('profile.saveProfile', 'Guardar Alterações')}
                    </button>
                </form>
            </div>

            <style>{`
                .card-hover {
                    transition: all 0.3s ease;
                }
                .card-hover:hover {
                    border-color: var(--border-hover);
                    transform: translateY(-2px);
                    box-shadow: var(--shadow-md);
                }
                .upload-btn:hover {
                    background: var(--bg-elevated) !important;
                    border-color: var(--accent-primary) !important;
                }
                .remove-btn:hover {
                    transform: scale(1.1);
                }
                .save-btn:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
                }
                .save-btn:active:not(:disabled) {
                    transform: translateY(0);
                }
            `}</style>
        </Layout>
    );
}
