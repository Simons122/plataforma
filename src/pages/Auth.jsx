import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { User, Mail, Lock, Briefcase, ArrowRight, Loader2, Check, X, Eye, EyeOff, Crown } from 'lucide-react';
import { createCheckoutSession } from '../lib/stripe';
import { useLanguage } from '../i18n/LanguageContext';

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
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
};

const calculatePasswordStrength = (password) => {
    if (!password) return { score: 0, label: '', color: '#ef4444' };

    let score = 0;
    const checks = {
        length: password.length >= 8,
        lowercase: /[a-z]/.test(password),
        uppercase: /[A-Z]/.test(password),
        numbers: /[0-9]/.test(password),
        special: /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\/`~]/.test(password)
    };

    if (password.length >= 6) score += 1;
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (checks.lowercase) score += 1;
    if (checks.uppercase) score += 1;
    if (checks.numbers) score += 1;
    if (checks.special) score += 2;

    const percentage = Math.min(100, (score / 9) * 100);

    let label, color;
    if (percentage < 25) { label = 'pw_veryWeak'; color = '#ef4444'; }
    else if (percentage < 50) { label = 'pw_weak'; color = '#f97316'; }
    else if (percentage < 75) { label = 'pw_medium'; color = '#eab308'; }
    else if (percentage < 90) { label = 'pw_strong'; color = '#22c55e'; }
    else { label = 'pw_veryStrong'; color = '#10b981'; }

    return { score: percentage, label, color, checks };
};

export default function Auth() {
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const redirectToPricing = searchParams.get('redirect') === 'pricing';
    const { translations: tr, language } = useLanguage();
    const a = tr?.auth || {};
    const lp = tr?.landingPage || {};

    // Labels de força da password traduzidos
    const pwLabels = {
        pw_veryWeak:   language === 'fr' ? 'Très faible' : language === 'en' ? 'Very weak'   : 'Muito fraca',
        pw_weak:       language === 'fr' ? 'Faible'      : language === 'en' ? 'Weak'         : 'Fraca',
        pw_medium:     language === 'fr' ? 'Moyen'       : language === 'en' ? 'Medium'       : 'Média',
        pw_strong:     language === 'fr' ? 'Fort'        : language === 'en' ? 'Strong'       : 'Forte',
        pw_veryStrong: language === 'fr' ? 'Très fort'   : language === 'en' ? 'Very strong'  : 'Muito forte',
    };

    useEffect(() => {
        if (redirectToPricing) setIsLogin(false);
    }, [redirectToPricing]);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        profession: PROFESSIONS[0]
    });

    const passwordStrength = useMemo(() =>
        calculatePasswordStrength(formData.password),
        [formData.password]
    );

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
                const trialEndsAt = new Date();
                trialEndsAt.setDate(trialEndsAt.getDate() + 5);

                await setDoc(docRef, {
                    name: user.displayName || "Utilizador Google",
                    email: user.email,
                    profession: "Por definir",
                    paymentStatus: 'trial',
                    trialEndsAt: trialEndsAt.toISOString(),
                    createdAt: new Date().toISOString(),
                    role: 'professional',
                    slug: slugify(user.displayName || "utilizador-google")
                });
                if (redirectToPricing) {
                    const result = await createCheckoutSession({
                        userId: user.uid,
                        userEmail: user.email,
                        userName: user.displayName || 'Utilizador Google'
                    });
                    if (!result.success) navigate('/pricing');
                } else {
                    navigate('/pricing');
                }
            } else if (docSnap.data().role === 'admin') {
                navigate('/admin/dashboard');
            } else {
                if (redirectToPricing) {
                    const result = await createCheckoutSession({
                        userId: user.uid,
                        userEmail: user.email,
                        userName: user.displayName
                    });
                    if (!result.success) navigate('/pricing');
                } else {
                    navigate('/dashboard');
                }
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

                await updateProfile(user, { displayName: formData.name });

                const trialEndsAt = new Date();
                trialEndsAt.setDate(trialEndsAt.getDate() + 5);

                await setDoc(doc(db, "professionals", user.uid), {
                    name: formData.name,
                    email: formData.email,
                    profession: formData.profession,
                    paymentStatus: 'trial',
                    trialEndsAt: trialEndsAt.toISOString(),
                    createdAt: new Date().toISOString(),
                    role: 'professional',
                    slug: slugify(formData.name)
                });

                const result = await createCheckoutSession({
                    userId: user.uid,
                    userEmail: user.email,
                    userName: formData.name
                });

                if (!result.success) navigate('/pricing');
            }
        } catch (err) {
            console.error(err);
            setError(err.message.replace('Firebase: ', ''));
        } finally {
            setLoading(false);
        }
    };

    // Textos traduzidos
    const txt = {
        welcome:        isLogin ? (a.welcomeBack || 'Bem-vindo de volta') : (a.welcomeMessage || 'Crie a sua conta profissional'),
        namePlaceholder: a.fullName || 'Nome Completo',
        submitBtn:      isLogin ? (a.login || 'Entrar') : (a.createAccount || 'Criar Conta Profissional'),
        toggleQuestion: isLogin
            ? (a.noAccount ? a.noAccount + ' ' : 'Não tem conta profissional? ')
            : (a.alreadyHaveAccount ? a.alreadyHaveAccount + ' ' : 'Já tem uma conta? '),
        toggleBtn:      isLogin ? (a.register || 'Registe-se agora') : (a.login || 'Inicie sessão'),
        googleBtn:      language === 'fr' ? 'Continuer avec Google'
                       : language === 'en' ? 'Continue with Google'
                       : 'Continuar com Google',
        orDivider:      language === 'fr' ? 'ou' : language === 'en' ? 'or' : 'ou',
        clientQuestion: language === 'fr' ? 'Vous êtes client et voulez prendre rendez-vous ?'
                       : language === 'en' ? 'Are you a client looking to book?'
                       : 'É cliente e quer fazer uma marcação?',
        exploreBtn:     language === 'fr' ? '🔍 Explorer les professionnels'
                       : language === 'en' ? '🔍 Explore Professionals'
                       : '🔍 Explorar Profissionais',
        passwordField:  'Password',
        planFeatures:   language === 'fr' ? 'Réservations illimitées • Confirmations automatiques • Tableau de bord complet'
                       : language === 'en' ? 'Unlimited bookings • Automatic confirmations • Full dashboard'
                       : 'Marcações ilimitadas • Confirmações automáticas • Painel completo',
        pricePeriod:    lp.pricePeriod || '/mês',
        pwChars:        language === 'fr' ? '8+ caractères' : language === 'en' ? '8+ chars' : '8+ caracteres',
        pwLower:        language === 'fr' ? 'Minuscules (a-z)' : language === 'en' ? 'Lowercase (a-z)' : 'Minúsculas (a-z)',
        pwUpper:        language === 'fr' ? 'Majuscules (A-Z)' : language === 'en' ? 'Uppercase (A-Z)' : 'Maiúsculas (A-Z)',
        pwNumbers:      language === 'fr' ? 'Chiffres (0-9)'   : language === 'en' ? 'Numbers (0-9)'   : 'Números (0-9)',
        pwSpecial:      language === 'fr' ? 'Caractères spéciaux (!@#$%...)' : language === 'en' ? 'Special chars (!@#$%...)' : 'Caracteres especiais (!@#$%...)',
        showPw:         language === 'fr' ? 'Afficher le mot de passe' : language === 'en' ? 'Show password' : 'Mostrar password',
        hidePw:         language === 'fr' ? 'Masquer le mot de passe'  : language === 'en' ? 'Hide password' : 'Esconder password',
        processing:     lp.processing || 'A processar...',
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
                        {txt.welcome}
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

                {/* Selected Plan Card */}
                {redirectToPricing && !isLogin && (
                    <div style={{
                        padding: '1rem 1.25rem',
                        marginBottom: '1.5rem',
                        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(6, 182, 212, 0.1))',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        borderRadius: '14px'
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '0.5rem'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Crown size={18} style={{ color: '#fbbf24' }} />
                                <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                                    Booklyo Pro
                                </span>
                            </div>
                            <span style={{ fontWeight: 800, color: '#3b82f6', fontSize: '1.1rem' }}>
                                15€<span style={{ fontWeight: 500, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{txt.pricePeriod}</span>
                            </span>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                            {txt.planFeatures}
                        </p>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
                    {!isLogin && (
                        <div style={{ position: 'relative' }}>
                            <User style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
                            <input
                                name="name"
                                placeholder={txt.namePlaceholder}
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
                            type={showPassword ? "text" : "password"}
                            placeholder={txt.passwordField}
                            className="input"
                            style={{ paddingLeft: '2.75rem', paddingRight: '2.75rem' }}
                            value={formData.password}
                            onChange={handleChange}
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            style={{
                                position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                                background: 'none', border: 'none', padding: '4px', cursor: 'pointer',
                                color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'color 0.2s ease'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                            onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                            aria-label={showPassword ? txt.hidePw : txt.showPw}
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>

                    {/* Password strength indicator */}
                    {!isLogin && formData.password && (
                        <div style={{ marginTop: '-0.5rem', animation: 'fadeIn 0.3s ease' }}>
                            <div style={{
                                width: '100%', height: '6px', background: 'var(--bg-secondary)',
                                borderRadius: '999px', overflow: 'hidden', marginBottom: '0.5rem'
                            }}>
                                <div style={{
                                    width: `${passwordStrength.score}%`, height: '100%',
                                    background: passwordStrength.color, borderRadius: '999px', transition: 'all 0.3s ease'
                                }} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: passwordStrength.color, transition: 'color 0.3s ease' }}>
                                    {pwLabels[passwordStrength.label] || passwordStrength.label}
                                </span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    {Math.round(passwordStrength.score)}%
                                </span>
                            </div>
                            <div style={{
                                display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.375rem',
                                padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: '10px', fontSize: '0.75rem'
                            }}>
                                {[
                                    { key: 'length',   label: txt.pwChars },
                                    { key: 'lowercase',label: txt.pwLower },
                                    { key: 'uppercase',label: txt.pwUpper },
                                    { key: 'numbers',  label: txt.pwNumbers },
                                    { key: 'special',  label: txt.pwSpecial, span: true },
                                ].map(({ key, label, span }) => (
                                    <div key={key} style={{
                                        display: 'flex', alignItems: 'center', gap: '0.375rem',
                                        color: passwordStrength.checks?.[key] ? '#22c55e' : 'var(--text-muted)',
                                        ...(span ? { gridColumn: 'span 2' } : {})
                                    }}>
                                        {passwordStrength.checks?.[key] ? <Check size={12} /> : <X size={12} />}
                                        {label}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.625rem',
                            width: '100%', padding: '0.875rem', marginTop: '0.5rem', fontSize: '1rem',
                            fontWeight: 700, color: 'white', background: 'var(--accent-primary)', border: 'none',
                            borderRadius: '12px', cursor: loading ? 'wait' : 'pointer', transition: 'all 0.2s ease',
                            boxShadow: 'var(--shadow-md)'
                        }}
                        onMouseOver={(e) => !loading && (e.currentTarget.style.background = 'var(--accent-primary-hover)')}
                        onMouseOut={(e) => !loading && (e.currentTarget.style.background = 'var(--accent-primary)')}
                    >
                        {loading ? <Loader2 className="spinner" size={20} /> : (
                            <>
                                {txt.submitBtn}
                                <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </form>

                {/* Divider */}
                <div style={{ display: 'flex', alignItems: 'center', margin: '1.75rem 0', gap: '1rem' }}>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border-default)' }}></div>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{txt.orDivider}</span>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border-default)' }}></div>
                </div>

                {/* Google Button */}
                <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
                        width: '100%', padding: '0.875rem', fontSize: '0.9375rem', fontWeight: 600,
                        color: 'var(--text-primary)', background: 'transparent',
                        border: '1px solid var(--border-default)', borderRadius: '12px',
                        cursor: 'pointer', transition: 'all 0.2s ease'
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
                    {txt.googleBtn}
                </button>

                {/* Toggle */}
                <div style={{ marginTop: '2.5rem', textAlign: 'center', fontSize: '0.9375rem' }}>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>
                        {txt.toggleQuestion}
                    </span>
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        style={{
                            background: 'none', border: 'none', color: 'var(--accent-primary)',
                            fontWeight: 700, cursor: 'pointer', padding: '0 4px', transition: 'color 0.2s ease'
                        }}
                    >
                        {txt.toggleBtn}
                    </button>
                </div>

                {/* Client Access Section */}
                <div style={{
                    marginTop: '2rem', paddingTop: '2rem',
                    borderTop: '1px solid var(--border-default)', textAlign: 'center'
                }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem', fontWeight: 500 }}>
                        {txt.clientQuestion}
                    </p>
                    <button
                        onClick={() => navigate('/client/explore')}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.75rem 1.5rem', fontSize: '0.9375rem', fontWeight: 600,
                            color: 'var(--text-primary)', background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-default)', borderRadius: '10px',
                            cursor: 'pointer', transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.background = 'var(--accent-primary)';
                            e.currentTarget.style.color = 'white';
                            e.currentTarget.style.borderColor = 'var(--accent-primary)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.background = 'var(--bg-secondary)';
                            e.currentTarget.style.color = 'var(--text-primary)';
                            e.currentTarget.style.borderColor = 'var(--border-default)';
                        }}
                    >
                        {txt.exploreBtn}
                    </button>
                </div>
            </div>
        </div>
    );
}
