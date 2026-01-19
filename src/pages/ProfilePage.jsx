import React, { useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { User2, Mail, Building2, Save, Loader2, Camera, X, Briefcase, Phone, MapPin, Instagram, Facebook, Globe } from 'lucide-react';
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
                                    logoUrl: data.photoUrl || '', // Map photoUrl to logoUrl for UI consistency
                                    isStaff: true,
                                    ownerId: ownerId,
                                    id: staffId,
                                    email: user.email // Ensure email comes from Auth if not in doc
                                });
                            }
                        }
                    }
                } catch (err) {
                    console.error("Error fetching profile:", err);
                    toast.error("Erro ao carregar perfil.");
                }
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleImageUpload = async (e) => {
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
                    const MAX_WIDTH = 400; // Increased resolution slightly
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

                    // Update immediately in Firestore depending on role
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
                    toast.success(profile.isStaff ? 'Foto atualizada!' : 'Logo atualizada!');
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
            toast.success('Imagem removida.');
        } catch (error) {
            console.error(error);
            toast.error('Erro ao remover imagem.');
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (profile.isStaff) {
                // STAFF SAVE
                await updateDoc(doc(db, `professionals/${profile.ownerId}/staff/${profile.id}`), {
                    name: profile.name,
                    phone: profile.phone || ''
                });
                toast.success('Perfil atualizado!');
            } else {
                // OWNER SAVE
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
                    // Morada
                    address: profile.address || '',
                    postalCode: profile.postalCode || '',
                    city: profile.city || '',
                    // Redes Sociais
                    instagram: profile.instagram || '',
                    facebook: profile.facebook || '',
                    website: profile.website || ''
                });
                setSavedBusinessName(profile.businessName);
                toast.success('Perfil atualizado com sucesso!');
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
        <Layout role="professional" brandName={profile.isStaff ? profile.name : savedBusinessName}>
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                <div style={{ marginBottom: '2rem' }}>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                        {profile.isStaff ? 'O Meu Perfil' : 'Perfil Profissional'}
                    </h1>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        {profile.isStaff ? 'Gerencie a sua informação pessoal.' : 'Gerencie as informações do seu estabelecimento.'}
                    </p>
                </div>

                <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Image Upload Section */}
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
                                borderRadius: profile.isStaff ? '50%' : '20px', // Round for staff, square-ish for logo
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
                                        alt="Profile"
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                ) : (
                                    <Camera size={24} strokeWidth={1.75} style={{ color: 'var(--text-muted)' }} />
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
                                    onClick={handleRemoveImage}
                                    style={{
                                        position: 'absolute',
                                        top: '-4px',
                                        right: '-4px', // Adjusted position
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
                                {profile.logoUrl ? (profile.isStaff ? 'Alterar Foto' : 'Alterar Logo') : (profile.isStaff ? 'Carregar Foto' : 'Carregar Logo')}
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    style={{ display: 'none' }}
                                    disabled={uploading}
                                />
                            </label>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                JPG ou PNG. Máximo 2MB.
                            </p>
                        </div>
                    </div>

                    {/* Business Name - Only for Owners */}
                    {!profile.isStaff && (
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
                                placeholder="Ex: Barbearia do João..."
                            />
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
                                Este nome será exibido no topo do seu dashboard.
                            </p>
                        </div>
                    )}

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

                        <div>
                            <label className="label" style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Phone size={16} /> Telefone
                            </label>
                            <input
                                type="tel"
                                className="input"
                                value={profile.phone || ''}
                                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                placeholder="(Opcional)"
                            />
                        </div>

                        {!profile.isStaff && (
                            <div>
                                <label className="label" style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Briefcase size={16} /> Profissão
                                </label>
                                <select
                                    className="select"
                                    value={profile.profession || ''}
                                    onChange={(e) => setProfile({ ...profile, profession: e.target.value })}
                                >
                                    <option value="">Selecione uma profissão</option>
                                    <option value="Barbeiro">Barbeiro</option>
                                    <option value="Personal Trainer">Personal Trainer</option>
                                    <option value="Tatuador">Tatuador</option>
                                    <option value="Explicador">Explicador</option>
                                    <option value="Freelancer">Freelancer</option>
                                    <option value="Cabeleireiro">Cabeleireiro</option>
                                    <option value="Esteticista">Esteticista</option>
                                    <option value="Massagista">Massagista</option>
                                    <option value="Fotógrafo">Fotógrafo</option>
                                    <option value="Outro">Outro</option>
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Morada - Only for Owners */}
                    {!profile.isStaff && (
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <MapPin size={18} strokeWidth={1.75} style={{ color: 'var(--accent-primary)' }} />
                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Morada do Estabelecimento</span>
                            </div>

                            <div>
                                <label className="label" style={{ marginBottom: '0.5rem' }}>
                                    Rua / Endereço
                                </label>
                                <input
                                    type="text"
                                    className="input"
                                    value={profile.address || ''}
                                    onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                                    placeholder="Ex: Rua das Flores, 123"
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                                <div>
                                    <label className="label" style={{ marginBottom: '0.5rem' }}>
                                        Código Postal
                                    </label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={profile.postalCode || ''}
                                        onChange={(e) => setProfile({ ...profile, postalCode: e.target.value })}
                                        placeholder="1000-001"
                                    />
                                </div>
                                <div>
                                    <label className="label" style={{ marginBottom: '0.5rem' }}>
                                        Cidade
                                    </label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={profile.city || ''}
                                        onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                                        placeholder="Ex: Lisboa"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Redes Sociais - Only for Owners */}
                    {!profile.isStaff && (
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <Globe size={18} strokeWidth={1.75} style={{ color: 'var(--accent-primary)' }} />
                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Redes Sociais</span>
                            </div>

                            <div>
                                <label className="label" style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Instagram size={16} strokeWidth={1.75} /> Instagram
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <span style={{
                                        position: 'absolute',
                                        left: '1rem',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: 'var(--text-muted)',
                                        fontSize: '0.875rem'
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
                                <label className="label" style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Facebook size={16} strokeWidth={1.75} /> Facebook
                                </label>
                                <input
                                    type="text"
                                    className="input"
                                    value={profile.facebook || ''}
                                    onChange={(e) => setProfile({ ...profile, facebook: e.target.value })}
                                    placeholder="https://facebook.com/a-tua-pagina"
                                />
                            </div>

                            <div>
                                <label className="label" style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Globe size={16} strokeWidth={1.75} /> Website
                                </label>
                                <input
                                    type="text"
                                    className="input"
                                    value={profile.website || ''}
                                    onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                                    placeholder="https://o-teu-site.pt"
                                />
                            </div>

                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                Estas informações serão exibidas na sua página pública de marcações.
                            </p>
                        </div>
                    )}

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
