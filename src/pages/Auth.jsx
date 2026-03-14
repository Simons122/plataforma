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
import {
    User, Mail, Lock, Briefcase, ArrowRight, ArrowLeft,
    Loader2, Check, X, Eye, EyeOff, Crown, Calendar, MessageCircle, Shield
} from 'lucide-react';
import { createCheckoutSession } from '../lib/stripe';
import { useLanguage } from '../i18n/LanguageContext';

const PROFESSIONS = ["Barbeiro", "Personal Trainer", "Tatuador", "Explicador", "Freelancer", "Outro"];

const slugify = (text) => text.toString().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-').replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-').replace(/^-+/, '').replace(/-+$/, '');

const calcPasswordStrength = (password) => {
    if (!password) return { score: 0, label: '', color: '#ef4444' };
    let score = 0;
    const checks = {
        length:    password.length >= 8,
        lowercase: /[a-z]/.test(password),
        uppercase: /[A-Z]/.test(password),
        numbers:   /[0-9]/.test(password),
        special:   /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\/`~]/.test(password)
    };
    if (password.length >= 6)  score += 1;
    if (password.length >= 8)  score += 1;
    if (password.length >= 12) score += 1;
    if (checks.lowercase) score += 1;
    if (checks.uppercase) score += 1;
    if (checks.numbers)   score += 1;
    if (checks.special)   score += 2;
    const pct = Math.min(100, (score / 9) * 100);
    let label, color;
    if (pct < 25)      { label = 'pw_veryWeak';   color = '#ef4444'; }
    else if (pct < 50) { label = 'pw_weak';        color = '#f97316'; }
    else if (pct < 75) { label = 'pw_medium';      color = '#eab308'; }
    else if (pct < 90) { label = 'pw_strong';      color = '#22c55e'; }
    else               { label = 'pw_veryStrong';  color = '#10b981'; }
    return { score: pct, label, color, checks };
};

export default function Auth() {
    const [isLogin, setIsLogin]         = useState(true);
    const [loading, setLoading]         = useState(false);
    const [error, setError]             = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const redirectToPricing = searchParams.get('redirect') === 'pricing';
    const { translations: tr, language } = useLanguage();
    const a  = tr?.auth        || {};
    const lp = tr?.landingPage || {};

    const pwLabels = {
        pw_veryWeak:   language === 'fr' ? 'Très faible' : language === 'en' ? 'Very weak'   : 'Muito fraca',
        pw_weak:       language === 'fr' ? 'Faible'      : language === 'en' ? 'Weak'         : 'Fraca',
        pw_medium:     language === 'fr' ? 'Moyen'       : language === 'en' ? 'Medium'       : 'Média',
        pw_strong:     language === 'fr' ? 'Fort'        : language === 'en' ? 'Strong'       : 'Forte',
        pw_veryStrong: language === 'fr' ? 'Très fort'   : language === 'en' ? 'Very strong'  : 'Muito forte',
    };

    useEffect(() => { if (redirectToPricing) setIsLogin(false); }, [redirectToPricing]);

    const [formData, setFormData] = useState({ name: '', email: '', password: '', profession: PROFESSIONS[0] });
    const passwordStrength = useMemo(() => calcPasswordStrength(formData.password), [formData.password]);
    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleGoogleLogin = async () => {
        try {
            setLoading(true); setError('');
            const provider = new GoogleAuthProvider();
            const result   = await signInWithPopup(auth, provider);
            const user     = result.user;
            const docRef   = doc(db, 'professionals', user.uid);
            const docSnap  = await getDoc(docRef);
            if (!docSnap.exists()) {
                const trialEndsAt = new Date();
                trialEndsAt.setDate(trialEndsAt.getDate() + 5);
                await setDoc(docRef, {
                    name: user.displayName || 'Utilizador Google', email: user.email,
                    profession: 'Por definir', paymentStatus: 'trial',
                    trialEndsAt: trialEndsAt.toISOString(), createdAt: new Date().toISOString(),
                    role: 'professional', slug: slugify(user.displayName || 'utilizador-google')
                });
                if (redirectToPricing) {
                    const r = await createCheckoutSession({ userId: user.uid, userEmail: user.email, userName: user.displayName || 'Utilizador Google' });
                    if (!r.success) navigate('/pricing');
                } else { navigate('/pricing'); }
            } else if (docSnap.data().role === 'admin') {
                navigate('/admin/dashboard');
            } else {
                if (redirectToPricing) {
                    const r = await createCheckoutSession({ userId: user.uid, userEmail: user.email, userName: user.displayName });
                    if (!r.success) navigate('/pricing');
                } else { navigate('/dashboard'); }
            }
        } catch (err) { console.error(err); setError(err.message); }
        finally { setLoading(false); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault(); setLoading(true); setError('');
        try {
            if (isLogin) {
                const uc = await signInWithEmailAndPassword(auth, formData.email, formData.password);
                const ds = await getDoc(doc(db, 'professionals', uc.user.uid));
                navigate(ds.exists() && ds.data().role === 'admin' ? '/admin/dashboard' : '/dashboard');
            } else {
                const uc   = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
                const user = uc.user;
                await updateProfile(user, { displayName: formData.name });
                const trialEndsAt = new Date();
                trialEndsAt.setDate(trialEndsAt.getDate() + 5);
                await setDoc(doc(db, 'professionals', user.uid), {
                    name: formData.name, email: formData.email, profession: formData.profession,
                    paymentStatus: 'trial', trialEndsAt: trialEndsAt.toISOString(),
                    createdAt: new Date().toISOString(), role: 'professional', slug: slugify(formData.name)
                });
                const r = await createCheckoutSession({ userId: user.uid, userEmail: user.email, userName: formData.name });
                if (!r.success) navigate('/pricing');
            }
        } catch (err) { console.error(err); setError(err.message.replace('Firebase: ', '')); }
        finally { setLoading(false); }
    };

    const txt = {
        welcome:        isLogin ? (a.welcomeBack || (language === 'fr' ? 'Bon retour !' : language === 'en' ? 'Welcome back!' : 'Bem-vindo de volta'))
                                : (a.welcomeMessage || (language === 'fr' ? 'Inscrivez-vous pour commencer' : language === 'en' ? 'Create your account' : 'Crie a sua conta profissional')),
        namePlaceholder: a.fullName || (language === 'fr' ? 'Nom complet' : language === 'en' ? 'Full Name' : 'Nome Completo'),
        submitBtn:      isLogin ? (a.login || (language === 'fr' ? 'Connexion' : language === 'en' ? 'Login' : 'Entrar'))
                                : (a.createAccount || (language === 'fr' ? 'Créer un compte' : language === 'en' ? 'Create Account' : 'Criar Conta Profissional')),
        toggleQuestion: isLogin
            ? (a.noAccount ? a.noAccount + ' ' : (language === 'fr' ? "Vous n'avez pas de compte ? " : language === 'en' ? "Don't have an account? " : 'Não tem conta profissional? '))
            : (a.alreadyHaveAccount ? a.alreadyHaveAccount + ' ' : (language === 'fr' ? 'Vous avez déjà un compte ? ' : language === 'en' ? 'Already have an account? ' : 'Já tem uma conta? ')),
        toggleBtn:  isLogin ? (a.register || (language === 'fr' ? "S'inscrire" : language === 'en' ? 'Register' : 'Registe-se agora'))
                            : (a.login    || (language === 'fr' ? 'Se connecter' : language === 'en' ? 'Log in' : 'Inicie sessão')),
        googleBtn:      language === 'fr' ? 'Continuer avec Google'   : language === 'en' ? 'Continue with Google'   : 'Continuar com Google',
        orDivider:      language === 'fr' ? 'ou'                      : language === 'en' ? 'or'                     : 'ou',
        clientQuestion: language === 'fr' ? 'Vous êtes client et voulez prendre rendez-vous ?' : language === 'en' ? 'Are you a client looking to book?' : 'É cliente e quer fazer uma marcação?',
        exploreBtn:     language === 'fr' ? '🔍 Explorer les professionnels' : language === 'en' ? '🔍 Explore Professionals' : '🔍 Explorar Profissionais',
        pricePeriod:    lp.pricePeriod || (language === 'fr' ? '/mois' : language === 'en' ? '/mo' : '/mês'),
        planFeatures:   language === 'fr' ? 'Réservations illimitées • Confirmations automatiques • Tableau de bord complet'
                      : language === 'en' ? 'Unlimited bookings • Automatic confirmations • Full dashboard'
                      : 'Marcações ilimitadas • Confirmações automáticas • Painel completo',
        backBtn:        language === 'fr' ? 'Retour' : language === 'en' ? 'Back' : 'Voltar',
        leftTitle:      language === 'fr' ? 'Gérez vos réservations en toute simplicité' : language === 'en' ? 'Manage your bookings with ease' : 'Gere as tuas marcações com simplicidade',
        leftSubtitle:   language === 'fr' ? 'Booklyo automatise vos réservations, envoie des confirmations et vous fait gagner du temps.'
                      : language === 'en' ? 'Booklyo automates your bookings, sends confirmations and saves you time.'
                      : 'O Booklyo automatiza as tuas marcações, envia confirmações e poupa-te tempo.',
        noCommitment:   language === 'fr' ? 'Accès complet • Sans engagement • Annulez quand vous voulez'
                      : language === 'en' ? 'Full access • No commitment • Cancel anytime'
                      : 'Acesso completo • Sem compromisso • Cancela quando quiseres',
        pwChars:  language === 'fr' ? '8+ caractères'         : language === 'en' ? '8+ chars'        : '8+ caracteres',
        pwLower:  language === 'fr' ? 'Minuscules (a-z)'      : language === 'en' ? 'Lowercase (a-z)' : 'Minúsculas (a-z)',
        pwUpper:  language === 'fr' ? 'Majuscules (A-Z)'      : language === 'en' ? 'Uppercase (A-Z)' : 'Maiúsculas (A-Z)',
        pwNumbers:language === 'fr' ? 'Chiffres (0-9)'        : language === 'en' ? 'Numbers (0-9)'   : 'Números (0-9)',
        pwSpecial:language === 'fr' ? 'Caractères spéciaux (!@#$%...)' : language === 'en' ? 'Special chars (!@#$%...)' : 'Caracteres especiais (!@#$%...)',
        showPw:   language === 'fr' ? 'Afficher le mot de passe' : language === 'en' ? 'Show password' : 'Mostrar password',
        hidePw:   language === 'fr' ? 'Masquer le mot de passe'  : language === 'en' ? 'Hide password' : 'Esconder password',
    };

    // left panel feature bullets
    const leftFeatures = [
        { icon: Calendar,       text: language === 'fr' ? 'Réservations illimitées'    : language === 'en' ? 'Unlimited bookings'         : 'Marcações ilimitadas' },
        { icon: Mail,           text: language === 'fr' ? 'Confirmations automatiques' : language === 'en' ? 'Automatic confirmations'     : 'Confirmações automáticas' },
        { icon: MessageCircle,  text: language === 'fr' ? 'Notifications WhatsApp'     : language === 'en' ? 'WhatsApp notifications'      : 'Notificações WhatsApp' },
        { icon: Shield,         text: language === 'fr' ? 'Paiement sécurisé Stripe'   : language === 'en' ? 'Secure Stripe payment'       : 'Pagamento seguro Stripe' },
    ];

    const s = { // shorthand inline style helpers
        input: { position: 'relative' },
        iconL: { position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' },
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>

            {/* ── Sticky top bar with back button ── */}
            <nav style={{
                display: 'flex', alignItems: 'center', padding: '0.75rem 1.5rem',
                borderBottom: '1px solid var(--border-default)', background: 'var(--bg-card)',
                position: 'sticky', top: 0, zIndex: 50, gap: '1rem',
            }}>
                <button onClick={() => navigate('/')} style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    background: 'none', border: 'none', color: 'var(--text-secondary)',
                    fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
                    padding: '0.35rem 0.75rem', borderRadius: '8px', transition: 'all 0.2s',
                }}
                    onMouseOver={(e) => { e.currentTarget.style.background = 'var(--bg-secondary)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                    onMouseOut={(e)  => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >
                    <ArrowLeft size={16} /> {txt.backBtn}
                </button>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                    <img src="/logo.png" alt="Booklyo" style={{ width: '26px', height: '26px', objectFit: 'contain' }} />
                    <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>Booklyo</span>
                </div>
                <div style={{ width: '80px' }} /> {/* balance spacer */}
            </nav>

            {/* ── 2-col main area ── */}
            <div style={{ flex: 1, display: 'flex', overflow: 'auto' }}>

                {/* LEFT — branding panel (desktop only via CSS) */}
                <div
                    className="auth-left-panel"
                    style={{
                        display: 'none', flex: 1, flexDirection: 'column', justifyContent: 'center',
                        padding: '3rem 4rem',
                        background: 'linear-gradient(135deg,rgba(59,130,246,.07) 0%,rgba(6,182,212,.04) 100%)',
                        borderRight: '1px solid var(--border-default)',
                    }}
                >
                    <div style={{ maxWidth: '400px' }}>
                        <div style={{
                            width: '60px', height: '60px', borderRadius: '16px', marginBottom: '2rem',
                            background: 'linear-gradient(135deg,#3b82f6,#06b6d4)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 8px 24px rgba(59,130,246,.35)',
                        }}>
                            <Crown size={30} style={{ color: 'white' }} />
                        </div>
                        <h2 style={{ fontSize: '1.875rem', fontWeight: 800, lineHeight: 1.2, marginBottom: '1rem', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                            {txt.leftTitle}
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', lineHeight: 1.65, marginBottom: '2rem' }}>
                            {txt.leftSubtitle}
                        </p>
                        {leftFeatures.map(({ icon: Icon, text }) => (
                            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.875rem' }}>
                                <div style={{
                                    width: '34px', height: '34px', borderRadius: '9px', flexShrink: 0,
                                    background: 'rgba(59,130,246,.1)', border: '1px solid rgba(59,130,246,.2)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <Icon size={16} style={{ color: '#60a5fa' }} />
                                </div>
                                <span style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: '0.9rem' }}>{text}</span>
                            </div>
                        ))}
                        <div style={{ marginTop: '2rem', padding: '1.125rem', background: 'var(--bg-card)', borderRadius: '14px', border: '1px solid var(--border-default)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                                <Crown size={15} style={{ color: '#fbbf24' }} />
                                <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>Booklyo Pro</span>
                                <span style={{ marginLeft: 'auto', fontWeight: 800, color: '#3b82f6', fontSize: '1.05rem' }}>
                                    15€<span style={{ fontWeight: 500, fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{txt.pricePeriod}</span>
                                </span>
                            </div>
                            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>{txt.noCommitment}</p>
                        </div>
                    </div>
                </div>

                {/* RIGHT — scrollable form panel */}
                <div style={{
                    flex: 1, overflowY: 'auto',
                    display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                    padding: '2rem 1.25rem',
                }}>
                    <div style={{
                        width: '100%', maxWidth: '440px',
                        background: 'var(--bg-card)', borderRadius: '24px',
                        border: '1px solid var(--border-default)', padding: '2rem',
                        boxShadow: 'var(--shadow-lg)',
                    }} className="animate-fade-in">

                        {/* Form title */}
                        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                            <p style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em', margin: 0 }}>
                                {txt.welcome}
                            </p>
                        </div>

                        {/* Error banner */}
                        {error && (
                            <div style={{
                                padding: '0.75rem 1rem', marginBottom: '1.125rem',
                                background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)',
                                borderRadius: '12px', color: 'var(--accent-danger)', fontSize: '0.875rem', textAlign: 'center', fontWeight: 500,
                            }}>{error}</div>
                        )}

                        {/* Plan card (register from pricing only) */}
                        {redirectToPricing && !isLogin && (
                            <div style={{
                                padding: '0.8rem 1rem', marginBottom: '1.125rem',
                                background: 'linear-gradient(135deg,rgba(59,130,246,.1),rgba(6,182,212,.1))',
                                border: '1px solid rgba(59,130,246,.3)', borderRadius: '12px',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <Crown size={15} style={{ color: '#fbbf24' }} />
                                        <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.875rem' }}>Booklyo Pro</span>
                                    </div>
                                    <span style={{ fontWeight: 800, color: '#3b82f6', fontSize: '0.95rem' }}>
                                        15€<span style={{ fontWeight: 500, fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{txt.pricePeriod}</span>
                                    </span>
                                </div>
                                <p style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', margin: 0 }}>{txt.planFeatures}</p>
                            </div>
                        )}

                        {/* Form */}
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            {!isLogin && (
                                <div style={s.input}>
                                    <User style={s.iconL} size={17} />
                                    <input name="name" placeholder={txt.namePlaceholder} className="input" style={{ paddingLeft: '2.75rem' }} value={formData.name} onChange={handleChange} required />
                                </div>
                            )}
                            <div style={s.input}>
                                <Mail style={s.iconL} size={17} />
                                <input name="email" type="email" placeholder="Email" className="input" style={{ paddingLeft: '2.75rem' }} value={formData.email} onChange={handleChange} required />
                            </div>
                            {!isLogin && (
                                <div style={s.input}>
                                    <Briefcase style={s.iconL} size={17} />
                                    <select name="profession" className="select" style={{ paddingLeft: '2.75rem' }} value={formData.profession} onChange={handleChange}>
                                        {PROFESSIONS.map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </div>
                            )}
                            <div style={s.input}>
                                <Lock style={s.iconL} size={17} />
                                <input name="password" type={showPassword ? 'text' : 'password'} placeholder="Password"
                                    className="input" style={{ paddingLeft: '2.75rem', paddingRight: '2.75rem' }}
                                    value={formData.password} onChange={handleChange} required />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? txt.hidePw : txt.showPw}
                                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', transition: 'color 0.2s' }}
                                    onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                                    onMouseOut={(e)  => e.currentTarget.style.color = 'var(--text-muted)'}
                                >{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
                            </div>

                            {/* Password strength */}
                            {!isLogin && formData.password && (
                                <div style={{ marginTop: '-0.2rem' }}>
                                    <div style={{ width: '100%', height: '5px', background: 'var(--bg-secondary)', borderRadius: '999px', overflow: 'hidden', marginBottom: '0.35rem' }}>
                                        <div style={{ width: `${passwordStrength.score}%`, height: '100%', background: passwordStrength.color, borderRadius: '999px', transition: 'all 0.3s' }} />
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                                        <span style={{ fontSize: '0.68rem', fontWeight: 600, color: passwordStrength.color }}>{pwLabels[passwordStrength.label]}</span>
                                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{Math.round(passwordStrength.score)}%</span>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '0.2rem', padding: '0.55rem', background: 'var(--bg-secondary)', borderRadius: '8px', fontSize: '0.68rem' }}>
                                        {[
                                            { key: 'length',    label: txt.pwChars },
                                            { key: 'lowercase', label: txt.pwLower },
                                            { key: 'uppercase', label: txt.pwUpper },
                                            { key: 'numbers',   label: txt.pwNumbers },
                                            { key: 'special',   label: txt.pwSpecial, span: true },
                                        ].map(({ key, label, span }) => (
                                            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: passwordStrength.checks?.[key] ? '#22c55e' : 'var(--text-muted)', ...(span ? { gridColumn: 'span 2' } : {}) }}>
                                                {passwordStrength.checks?.[key] ? <Check size={9} /> : <X size={9} />} {label}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <button type="submit" disabled={loading} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
                                width: '100%', padding: '0.85rem', marginTop: '0.2rem',
                                fontSize: '1rem', fontWeight: 700, color: 'white',
                                background: 'var(--accent-primary)', border: 'none',
                                borderRadius: '12px', cursor: loading ? 'wait' : 'pointer',
                                transition: 'all 0.2s', boxShadow: 'var(--shadow-md)',
                            }}
                                onMouseOver={(e) => !loading && (e.currentTarget.style.background = 'var(--accent-primary-hover)')}
                                onMouseOut={(e)  => !loading && (e.currentTarget.style.background = 'var(--accent-primary)')}
                            >
                                {loading ? <Loader2 className="spinner" size={20} /> : (<>{txt.submitBtn}<ArrowRight size={17} /></>)}
                            </button>
                        </form>

                        {/* Divider */}
                        <div style={{ display: 'flex', alignItems: 'center', margin: '1.1rem 0', gap: '0.75rem' }}>
                            <div style={{ flex: 1, height: '1px', background: 'var(--border-default)' }} />
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{txt.orDivider}</span>
                            <div style={{ flex: 1, height: '1px', background: 'var(--border-default)' }} />
                        </div>

                        {/* Google */}
                        <button type="button" onClick={handleGoogleLogin} disabled={loading} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.7rem',
                            width: '100%', padding: '0.78rem', fontSize: '0.9375rem', fontWeight: 600,
                            color: 'var(--text-primary)', background: 'transparent',
                            border: '1px solid var(--border-default)', borderRadius: '12px',
                            cursor: 'pointer', transition: 'all 0.2s',
                        }}
                            onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                            onMouseOut={(e)  => e.currentTarget.style.background = 'transparent'}
                        >
                            <svg width="19" height="19" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                            </svg>
                            {txt.googleBtn}
                        </button>

                        {/* Toggle login/register */}
                        <div style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.875rem' }}>
                            <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{txt.toggleQuestion}</span>
                            <button onClick={() => setIsLogin(!isLogin)} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontWeight: 700, cursor: 'pointer', padding: '0 4px', transition: 'color 0.2s' }}>
                                {txt.toggleBtn}
                            </button>
                        </div>

                        {/* Client area link */}
                        <div style={{ marginTop: '1.1rem', paddingTop: '1.1rem', borderTop: '1px solid var(--border-default)', textAlign: 'center' }}>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.65rem', fontWeight: 500 }}>{txt.clientQuestion}</p>
                            <button onClick={() => navigate('/client/explore')} style={{
                                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                                padding: '0.55rem 1.1rem', fontSize: '0.85rem', fontWeight: 600,
                                color: 'var(--text-primary)', background: 'var(--bg-secondary)',
                                border: '1px solid var(--border-default)', borderRadius: '10px',
                                cursor: 'pointer', transition: 'all 0.2s',
                            }}
                                onMouseOver={(e) => { e.currentTarget.style.background = 'var(--accent-primary)'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = 'var(--accent-primary)'; }}
                                onMouseOut={(e)  => { e.currentTarget.style.background = 'var(--bg-secondary)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border-default)'; }}
                            >{txt.exploreBtn}</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Responsive: show left panel on wide screens */}
            <style>{`
                @media (min-width: 900px) {
                    .auth-left-panel { display: flex !important; }
                }
            `}</style>
        </div>
    );
}
