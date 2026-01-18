import React, { useEffect, useState } from 'react';
import { db, auth } from '../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import Layout from '../components/Layout';
import { User, Mail, Shield, ShieldAlert, Save, AlertCircle } from 'lucide-react';
import { useToast } from '../components/Toast';

export default function AdminSettings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profile, setProfile] = useState({
        name: '',
        email: '',
        role: '',
        superAdmin: false
    });
    const toast = useToast();

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const user = auth.currentUser;
            if (user) {
                const docSnap = await getDoc(doc(db, "professionals", user.uid));
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setProfile({
                        name: data.name || '',
                        email: user.email || '',
                        role: data.role || '',
                        superAdmin: data.superAdmin || false
                    });
                }
            }
        } catch (error) {
            console.error("Error fetching profile:", error);
            toast.error('Erro ao carregar perfil');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            const user = auth.currentUser;
            await updateDoc(doc(db, "professionals", user.uid), {
                name: profile.name
            });

            toast.success('Perfil atualizado com sucesso!');
        } catch (error) {
            console.error("Error updating profile:", error);
            toast.error('Erro ao atualizar perfil');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-primary)'
            }}>
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <Layout role="admin" brandName="Administração">
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                {/* Header */}
                <div style={{ marginBottom: '2rem' }}>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                        Configurações Admin
                    </h1>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Gerencie as suas informações de perfil
                    </p>
                </div>

                {/* Role Badge */}
                {profile.superAdmin && (
                    <div style={{
                        padding: '1rem 1.5rem',
                        background: 'linear-gradient(135deg, #7c3aed15, #a855f715)',
                        border: '2px solid #7c3aed30',
                        borderRadius: '12px',
                        marginBottom: '1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem'
                    }}>
                        <div style={{
                            padding: '0.75rem',
                            background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                            borderRadius: '12px',
                            color: 'white',
                            display: 'flex'
                        }}>
                            <ShieldAlert size={24} />
                        </div>
                        <div>
                            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                                Super Administrador
                            </div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                Tens acesso total a todas as funcionalidades da plataforma
                            </div>
                        </div>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSave}>
                    <div style={{
                        background: 'var(--bg-card)',
                        borderRadius: '16px',
                        border: '1px solid var(--border-default)',
                        padding: '2rem',
                        boxShadow: 'var(--shadow-sm)'
                    }}>
                        <h2 style={{
                            fontSize: '1.125rem',
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            marginBottom: '1.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}>
                            <User size={20} />
                            Informações Pessoais
                        </h2>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {/* Nome */}
                            <div>
                                <label style={{
                                    display: 'block',
                                    fontSize: '0.875rem',
                                    fontWeight: 600,
                                    color: 'var(--text-primary)',
                                    marginBottom: '0.5rem'
                                }}>
                                    Nome Completo
                                </label>
                                <input
                                    type="text"
                                    value={profile.name}
                                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                                    className="input"
                                    placeholder="O teu nome"
                                    required
                                />
                            </div>

                            {/* Email (Read-only) */}
                            <div>
                                <label style={{
                                    display: 'block',
                                    fontSize: '0.875rem',
                                    fontWeight: 600,
                                    color: 'var(--text-primary)',
                                    marginBottom: '0.5rem'
                                }}>
                                    Email
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <Mail size={18} style={{
                                        position: 'absolute',
                                        left: '12px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: 'var(--text-muted)'
                                    }} />
                                    <input
                                        type="email"
                                        value={profile.email}
                                        className="input"
                                        style={{ paddingLeft: '2.5rem', background: 'var(--bg-elevated)', cursor: 'not-allowed' }}
                                        disabled
                                    />
                                </div>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                    O email não pode ser alterado
                                </p>
                            </div>

                            {/* Role (Read-only) */}
                            <div>
                                <label style={{
                                    display: 'block',
                                    fontSize: '0.875rem',
                                    fontWeight: 600,
                                    color: 'var(--text-primary)',
                                    marginBottom: '0.5rem'
                                }}>
                                    Função
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <Shield size={18} style={{
                                        position: 'absolute',
                                        left: '12px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: profile.superAdmin ? '#7c3aed' : 'var(--accent-primary)'
                                    }} />
                                    <input
                                        type="text"
                                        value={profile.superAdmin ? 'Super Administrador' : 'Administrador'}
                                        className="input"
                                        style={{
                                            paddingLeft: '2.5rem',
                                            background: profile.superAdmin ? 'linear-gradient(135deg, #7c3aed10, #a855f710)' : 'var(--bg-elevated)',
                                            cursor: 'not-allowed',
                                            fontWeight: 600,
                                            color: profile.superAdmin ? '#7c3aed' : 'var(--accent-primary)'
                                        }}
                                        disabled
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Info Alert */}
                        <div style={{
                            marginTop: '1.5rem',
                            padding: '1rem',
                            background: 'var(--bg-elevated)',
                            borderRadius: '10px',
                            border: '1px solid var(--border-default)',
                            display: 'flex',
                            gap: '0.75rem'
                        }}>
                            <AlertCircle size={20} style={{ color: 'var(--accent-info)', flexShrink: 0, marginTop: '2px' }} />
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                Para alterar o email ou a função, contacta o Super Administrador da plataforma.
                            </div>
                        </div>

                        {/* Save Button */}
                        <button
                            type="submit"
                            disabled={saving}
                            className="button"
                            style={{
                                marginTop: '1.5rem',
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                padding: '0.875rem',
                                background: 'var(--accent-primary)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '10px',
                                fontSize: '0.9375rem',
                                fontWeight: 600,
                                cursor: saving ? 'not-allowed' : 'pointer',
                                opacity: saving ? 0.6 : 1,
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <Save size={18} />
                            {saving ? 'A guardar...' : 'Guardar Alterações'}
                        </button>
                    </div>
                </form>
            </div>
        </Layout>
    );
}
