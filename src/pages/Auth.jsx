import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { User, Mail, Lock, Briefcase, ArrowRight, Loader2 } from 'lucide-react';

const PROFESSIONS = [
    "Barbeiro",
    "Personal Trainer",
    "Tatuador",
    "Explicador",
    "Freelancer",
    "Outro"
];

const slugify = (text) => {
    return text
        .toString()
        .toLowerCase()
        .normalize('NFD') // Split accents
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/\s+/g, '-') // Replace spaces with -
        .replace(/[^\w\-]+/g, '') // Remove all non-word chars
        .replace(/\-\-+/g, '-') // Replace multiple - with single -
        .replace(/^-+/, '') // Trim - from start
        .replace(/-+$/, ''); // Trim - from end
};

export default function Auth() {
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        profession: PROFESSIONS[0]
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleGoogleLogin = async () => {
        try {
            setLoading(true);
            setError("");
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            const docRef = doc(db, "professionals", user.uid);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                await setDoc(docRef, {
                    name: user.displayName || "Utilizador Google",
                    email: user.email,
                    profession: "Por definir",
                    paymentStatus: 'pending',
                    createdAt: new Date().toISOString(),
                    role: 'professional',
                    slug: slugify(user.displayName || "utilizador-google")
                });
                navigate('/dashboard');
            } else if (docSnap.data().role === 'admin') {
                navigate('/admin/dashboard');
            } else {
                navigate('/dashboard');
            }
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            if (isLogin) {
                const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
                const docRef = doc(db, "professionals", userCredential.user.uid);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists() && docSnap.data().role === 'admin') {
                    navigate('/admin/dashboard');
                } else {
                    navigate('/dashboard');
                }
            } else {
                const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
                const user = userCredential.user;

                await updateProfile(user, {
                    displayName: formData.name
                });

                await setDoc(doc(db, "professionals", user.uid), {
                    name: formData.name,
                    email: formData.email,
                    profession: formData.profession,
                    paymentStatus: 'pending',
                    createdAt: new Date().toISOString(),
                    role: 'professional',
                    slug: slugify(formData.name)
                });

                navigate('/dashboard');
            }
        } catch (err) {
            console.error(err);
            setError(err.message.replace('Firebase: ', ''));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            background: 'var(--bg-primary)'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '420px',
                background: 'var(--bg-card)',
                borderRadius: '24px',
                border: '1px solid var(--border-default)',
                padding: '2.5rem',
                boxShadow: 'var(--shadow-lg)'
            }} className="animate-fade-in">
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <img
                        src="/logo.png"
                        alt="Booklyo Logo"
                        style={{
                            width: '80px',
                            height: '80px',
                            margin: '0 auto 1.25rem',
                            display: 'block',
                            objectFit: 'contain'
                        }}
                    />
                    <h1 style={{
                        fontSize: '1.75rem',
                        fontWeight: 800,
                        marginBottom: '0.5rem',
                        color: 'var(--text-primary)',
                        letterSpacing: '-0.02em'
                    }}>
                        Booklyo
                    </h1>
                    <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                        {isLogin ? "Bem-vindo de volta" : "Crie a sua conta profissional"}
                    </p>
                </div>

                {/* Error */}
                {error && (
                    <div style={{
                        padding: '0.875rem 1rem',
                        marginBottom: '1.5rem',
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        borderRadius: '12px',
                        color: 'var(--accent-danger)',
                        fontSize: '0.875rem',
                        textAlign: 'center',
                        fontWeight: 500
                    }}>
                        {error}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
                    {!isLogin && (
                        <div style={{ position: 'relative' }}>
                            <User style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
                            <input
                                name="name"
                                placeholder="Nome Completo"
                                className="input"
                                style={{ paddingLeft: '2.75rem' }}
                                value={formData.name}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    )}

                    <div style={{ position: 'relative' }}>
                        <Mail style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
                        <input
                            name="email"
                            type="email"
                            placeholder="Email"
                            className="input"
                            style={{ paddingLeft: '2.75rem' }}
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    {!isLogin && (
                        <div style={{ position: 'relative' }}>
                            <Briefcase style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
                            <select
                                name="profession"
                                className="select"
                                style={{ paddingLeft: '2.75rem' }}
                                value={formData.profession}
                                onChange={handleChange}
                            >
                                {PROFESSIONS.map(p => (
                                    <option key={p} value={p}>{p}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div style={{ position: 'relative' }}>
                        <Lock style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
                        <input
                            name="password"
                            type="password"
                            placeholder="Password"
                            className="input"
                            style={{ paddingLeft: '2.75rem' }}
                            value={formData.password}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.625rem',
                            width: '100%',
                            padding: '0.875rem',
                            marginTop: '0.5rem',
                            fontSize: '1rem',
                            fontWeight: 700,
                            color: 'white',
                            background: 'var(--accent-primary)',
                            border: 'none',
                            borderRadius: '12px',
                            cursor: loading ? 'wait' : 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: 'var(--shadow-md)'
                        }}
                        onMouseOver={(e) => !loading && (e.currentTarget.style.background = 'var(--accent-primary-hover)')}
                        onMouseOut={(e) => !loading && (e.currentTarget.style.background = 'var(--accent-primary)')}
                    >
                        {loading ? <Loader2 className="spinner" size={20} /> : (
                            <>
                                {isLogin ? "Entrar" : "Criar Conta Profissional"}
                                <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </form>

                {/* Divider */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    margin: '1.75rem 0',
                    gap: '1rem'
                }}>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border-default)' }}></div>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>ou</span>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border-default)' }}></div>
                </div>

                {/* Google Button */}
                <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.75rem',
                        width: '100%',
                        padding: '0.875rem',
                        fontSize: '0.9375rem',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        background: 'transparent',
                        border: '1px solid var(--border-default)',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Continuar com Google
                </button>

                {/* Toggle */}
                <div style={{ marginTop: '2.5rem', textAlign: 'center', fontSize: '0.9375rem' }}>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>
                        {isLogin ? "Não tem conta profissional? " : "Já tem uma conta? "}
                    </span>
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--accent-primary)',
                            fontWeight: 700,
                            cursor: 'pointer',
                            padding: '0 4px',
                            transition: 'color 0.2s ease'
                        }}
                    >
                        {isLogin ? "Registe-se agora" : "Inicie sessão"}
                    </button>
                </div>
            </div>
        </div>
    );
}
