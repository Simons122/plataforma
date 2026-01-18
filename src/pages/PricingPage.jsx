import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import {
    Check,
    Sparkles,
    Calendar,
    Mail,
    MessageCircle,
    Settings,
    LayoutDashboard,
    Headphones,
    RefreshCw,
    ArrowRight,
    Crown,
    Zap,
    Shield,
    Clock,
    Users,
    TrendingUp,
    Loader2,
    Menu,
    X,
    LogIn,
    User
} from 'lucide-react';
import { createCheckoutSession, BOOKLYO_PRO_PLAN, getSubscriptionStatus, getTrialDaysRemaining } from '../lib/stripe';

export default function PricingPage() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processingPayment, setProcessingPayment] = useState(false);
    const [error, setError] = useState('');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                try {
                    const userDoc = await getDoc(doc(db, 'professionals', currentUser.uid));
                    if (userDoc.exists()) {
                        setUserData(userDoc.data());
                    }
                } catch (err) {
                    console.error('Error fetching user data:', err);
                }
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleSubscribe = async () => {
        if (!user) {
            // Redirect to register if not logged in
            navigate('/auth?redirect=pricing');
            return;
        }

        // Check if Stripe is configured
        const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
        if (!stripeKey) {
            setError('Sistema de pagamentos em configuração. Por favor, contacta o suporte.');
            console.warn('⚠️ VITE_STRIPE_PUBLISHABLE_KEY not configured');
            return;
        }

        setProcessingPayment(true);
        setError('');

        try {
            const result = await createCheckoutSession({
                userId: user.uid,
                userEmail: user.email,
                userName: user.displayName || userData?.name || 'Professional'
            });

            if (!result.success) {
                setError(result.error || 'Erro ao processar pagamento. Tenta novamente.');
            }
        } catch (err) {
            console.error('Payment error:', err);
            setError('Erro ao processar pagamento. Tenta novamente.');
        } finally {
            setProcessingPayment(false);
        }
    };

    const handleLogout = async () => {
        try {
            await auth.signOut();
            navigate('/auth');
        } catch (err) {
            console.error('Logout error:', err);
        }
    };

    const subscriptionStatus = userData ? getSubscriptionStatus(userData) : 'none';
    const trialDays = userData?.trialEndsAt ? getTrialDaysRemaining(userData.trialEndsAt) : 0;

    const features = [
        { icon: Calendar, text: 'Marcações ilimitadas', highlight: true },
        { icon: Mail, text: 'Confirmações automáticas por email' },
        { icon: MessageCircle, text: 'Notificações por WhatsApp' },
        { icon: Settings, text: 'Gestão de serviços e horários' },
        { icon: LayoutDashboard, text: 'Painel profissional completo' },
        { icon: Headphones, text: 'Suporte básico incluído' },
        { icon: RefreshCw, text: 'Atualizações gratuitas' },
        { icon: Users, text: 'Gestão de clientes' }
    ];

    const benefits = [
        {
            icon: Clock,
            title: 'Poupa Tempo',
            description: 'Automatiza as marcações e deixa de perder tempo com chamadas e mensagens.'
        },
        {
            icon: TrendingUp,
            title: 'Cresce o Negócio',
            description: 'Organiza a tua agenda e recebe mais clientes com menos esforço.'
        },
        {
            icon: Shield,
            title: 'Profissional',
            description: 'Transmite uma imagem profissional com confirmações automáticas.'
        },
        {
            icon: Zap,
            title: '100% Online',
            description: 'Funciona em qualquer dispositivo, sem instalar nada.'
        },
        {
            icon: Calendar,
            title: 'Agenda Inteligente',
            description: 'Visualiza todas as marcações num calendário simples e intuitivo.'
        },
        {
            icon: Users,
            title: 'Gestão de Clientes',
            description: 'Mantém o histórico de todos os clientes e marcações num só lugar.'
        }
    ];

    if (loading) {
        return (
            <div className="pricing-page">
                <div className="pricing-loading">
                    <Loader2 className="spinner" size={40} />
                    <p>A carregar...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="pricing-page">
            {/* Navbar */}
            <nav className="pricing-navbar">
                <div className="navbar-container">
                    <div className="navbar-logo" onClick={() => navigate('/')}>
                        <img src="/logo.png" alt="Booklyo" className="navbar-logo-img" />
                        <span>Booklyo</span>
                    </div>

                    {/* Desktop Navigation */}
                    <div className="navbar-links">
                        <a href="#features">Funcionalidades</a>
                        <a href="#benefits">Benefícios</a>
                        <a href="#pricing">Preço</a>
                    </div>

                    <div className="navbar-actions">
                        {user ? (
                            <>
                                <button className="navbar-btn secondary" onClick={() => navigate('/dashboard')}>
                                    <LayoutDashboard size={18} />
                                    <span>Dashboard</span>
                                </button>
                                <button className="navbar-btn text" onClick={handleLogout}>
                                    Sair
                                </button>
                            </>
                        ) : (
                            <>
                                <button className="navbar-btn text" onClick={() => navigate('/auth')}>
                                    <LogIn size={18} />
                                    <span>Entrar</span>
                                </button>
                                <button className="navbar-btn primary" onClick={() => navigate('/auth')}>
                                    <User size={18} />
                                    <span>Criar Conta</span>
                                </button>
                            </>
                        )}
                    </div>

                    {/* Mobile Menu Toggle */}
                    <button className="mobile-menu-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="mobile-menu">
                        <a href="#features" onClick={() => setMobileMenuOpen(false)}>Funcionalidades</a>
                        <a href="#benefits" onClick={() => setMobileMenuOpen(false)}>Benefícios</a>
                        <a href="#pricing" onClick={() => setMobileMenuOpen(false)}>Preço</a>
                        <div className="mobile-menu-divider"></div>
                        {user ? (
                            <>
                                <button onClick={() => { navigate('/dashboard'); setMobileMenuOpen(false); }}>
                                    Dashboard
                                </button>
                                <button onClick={() => { handleLogout(); setMobileMenuOpen(false); }}>
                                    Sair
                                </button>
                            </>
                        ) : (
                            <>
                                <button onClick={() => { navigate('/auth'); setMobileMenuOpen(false); }}>
                                    Entrar
                                </button>
                                <button className="primary" onClick={() => { navigate('/auth'); setMobileMenuOpen(false); }}>
                                    Criar Conta
                                </button>
                            </>
                        )}
                    </div>
                )}
            </nav>

            {/* Hero Section */}
            <section className="pricing-hero">
                <div className="pricing-hero-content">
                    <div className="pricing-badge">
                        <Sparkles size={16} />
                        <span>Plano Único • Tudo Incluído</span>
                    </div>
                    <h1>
                        O teu sistema de marcações
                        <span className="gradient-text"> completo e profissional</span>
                    </h1>
                    <p className="pricing-subtitle">
                        Automatiza as tuas marcações, envia confirmações por email e WhatsApp,
                        e gere o teu negócio de forma simples e eficiente.
                    </p>
                </div>

                {/* Main Pricing Card */}
                <div className="pricing-card-wrapper" id="pricing">
                    <div className="pricing-card">
                        <div className="pricing-card-header">
                            <div className="plan-badge">
                                <Crown size={18} />
                                <span>Booklyo Pro</span>
                            </div>
                            <div className="price-container">
                                <span className="price-amount">15€</span>
                                <span className="price-period">/mês</span>
                            </div>
                            <p className="price-description">
                                Tudo o que precisas para gerir as tuas marcações online
                            </p>
                        </div>

                        <div className="pricing-card-features" id="features">
                            {features.map((feature, index) => (
                                <div
                                    key={index}
                                    className={`feature-item ${feature.highlight ? 'highlight' : ''}`}
                                >
                                    <div className="feature-icon">
                                        <Check size={16} />
                                    </div>
                                    <span>{feature.text}</span>
                                </div>
                            ))}
                        </div>

                        <div className="pricing-card-cta">
                            {subscriptionStatus === 'active' ? (
                                <button className="cta-button active" disabled>
                                    <Check size={20} />
                                    <span>Subscrição Ativa</span>
                                </button>
                            ) : (
                                <>
                                    <button
                                        className="cta-button"
                                        onClick={handleSubscribe}
                                        disabled={processingPayment}
                                    >
                                        {processingPayment ? (
                                            <>
                                                <Loader2 className="spinner" size={20} />
                                                <span>A processar...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>{user ? 'Subscrever Agora' : 'Começar Agora'}</span>
                                                <ArrowRight size={20} />
                                            </>
                                        )}
                                    </button>
                                    {!user && (
                                        <p className="cta-note">
                                            Cria uma conta e começa a receber marcações hoje
                                        </p>
                                    )}
                                    {subscriptionStatus === 'expired' && (
                                        <p className="expired-badge">
                                            ⚠️ Subscrição expirada - Renova para continuar
                                        </p>
                                    )}
                                </>
                            )}

                            {error && (
                                <p className="error-message">{error}</p>
                            )}
                        </div>

                        <div className="pricing-card-footer">
                            <div className="guarantee">
                                <Shield size={16} />
                                <span>Pagamento seguro via Stripe</span>
                            </div>
                            <div className="guarantee">
                                <RefreshCw size={16} />
                                <span>Cancela quando quiseres</span>
                            </div>
                        </div>
                    </div>

                    {/* Decorative elements */}
                    <div className="pricing-card-glow"></div>
                </div>
            </section>

            {/* Benefits Section */}
            <section className="pricing-benefits" id="benefits">
                <div className="section-container">
                    <h2>Porquê escolher o Booklyo?</h2>
                    <div className="benefits-grid">
                        {benefits.map((benefit, index) => (
                            <div key={index} className="benefit-card">
                                <div className="benefit-icon">
                                    <benefit.icon size={24} />
                                </div>
                                <h3>{benefit.title}</h3>
                                <p>{benefit.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Video Demo Section */}
            <section className="pricing-video" id="demo">
                <div className="section-container">
                    <h2>Vê como funciona</h2>
                    <p className="video-subtitle">Descobre em poucos minutos como o Booklyo pode transformar o teu negócio</p>
                    <div className="video-wrapper">
                        <div className="video-placeholder">
                            <div className="play-button">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M8 5v14l11-7z" />
                                </svg>
                            </div>
                            <p>Vídeo de demonstração em breve</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="pricing-final-cta">
                <div className="section-container">
                    <div className="final-cta-content">
                        <h2>Pronto para automatizar as tuas marcações?</h2>
                        <p>Por apenas 15€/mês tens acesso a tudo. Sem surpresas.</p>
                        <button
                            className="cta-button large"
                            onClick={handleSubscribe}
                            disabled={processingPayment || subscriptionStatus === 'active'}
                        >
                            {subscriptionStatus === 'active' ? (
                                <>
                                    <Check size={24} />
                                    <span>Já tens o Booklyo Pro</span>
                                </>
                            ) : processingPayment ? (
                                <>
                                    <Loader2 className="spinner" size={24} />
                                    <span>A processar...</span>
                                </>
                            ) : (
                                <>
                                    <span>Subscrever Agora</span>
                                    <ArrowRight size={24} />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="pricing-footer">
                <div className="section-container">
                    <p>© 2026 Booklyo. Todos os direitos reservados.</p>
                    <div className="footer-links">
                        <a href="/terms">Termos de Serviço</a>
                        <a href="/privacy">Política de Privacidade</a>
                    </div>
                </div>
            </footer>

            <style>{`
                .pricing-page {
                    min-height: 100vh;
                    background: linear-gradient(135deg, #0a0f1a 0%, #0d1528 50%, #0f1a30 100%);
                    color: #ffffff;
                    overflow-x: hidden;
                }

                .pricing-loading {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    gap: 1rem;
                }

                .spinner {
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                .section-container {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 0 2rem;
                }

                /* Navbar */
                .pricing-navbar {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    z-index: 1000;
                    background: rgba(10, 15, 26, 0.9);
                    backdrop-filter: blur(20px);
                    border-bottom: 1px solid rgba(59, 130, 246, 0.1);
                }

                .navbar-container {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 1rem 2rem;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }

                .navbar-logo {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    font-size: 1.5rem;
                    font-weight: 800;
                    color: #ffffff;
                    cursor: pointer;
                    transition: opacity 0.2s ease;
                }

                .navbar-logo:hover {
                    opacity: 0.9;
                }

                .navbar-logo-img {
                    width: 40px;
                    height: 40px;
                    object-fit: contain;
                }

                .navbar-logo svg {
                    color: #3b82f6;
                }

                .navbar-links {
                    display: flex;
                    align-items: center;
                    gap: 2rem;
                }

                .navbar-links a {
                    color: #94a3b8;
                    text-decoration: none;
                    font-weight: 500;
                    font-size: 0.95rem;
                    transition: color 0.2s ease;
                }

                .navbar-links a:hover {
                    color: #ffffff;
                }

                .navbar-actions {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }

                .navbar-btn {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.625rem 1.25rem;
                    border-radius: 10px;
                    font-weight: 600;
                    font-size: 0.9rem;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    border: none;
                }

                .navbar-btn.text {
                    background: transparent;
                    color: #94a3b8;
                }

                .navbar-btn.text:hover {
                    color: #ffffff;
                    background: rgba(255, 255, 255, 0.05);
                }

                .navbar-btn.secondary {
                    background: rgba(59, 130, 246, 0.1);
                    color: #60a5fa;
                    border: 1px solid rgba(59, 130, 246, 0.3);
                }

                .navbar-btn.secondary:hover {
                    background: rgba(59, 130, 246, 0.2);
                }

                .navbar-btn.primary {
                    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                    color: white;
                    box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
                }

                .navbar-btn.primary:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
                }

                .mobile-menu-toggle {
                    display: none;
                    background: transparent;
                    border: none;
                    color: #ffffff;
                    cursor: pointer;
                    padding: 0.5rem;
                }

                .mobile-menu {
                    display: none;
                    flex-direction: column;
                    padding: 1rem 2rem 2rem;
                    gap: 0.5rem;
                }

                .mobile-menu a,
                .mobile-menu button {
                    padding: 0.75rem 1rem;
                    color: #94a3b8;
                    text-decoration: none;
                    font-weight: 500;
                    border-radius: 8px;
                    transition: all 0.2s ease;
                    background: transparent;
                    border: none;
                    text-align: left;
                    cursor: pointer;
                    font-size: 1rem;
                }

                .mobile-menu a:hover,
                .mobile-menu button:hover {
                    background: rgba(255, 255, 255, 0.05);
                    color: #ffffff;
                }

                .mobile-menu button.primary {
                    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                    color: white;
                    text-align: center;
                }

                .mobile-menu-divider {
                    height: 1px;
                    background: rgba(255, 255, 255, 0.1);
                    margin: 0.5rem 0;
                }

                @media (max-width: 768px) {
                    .navbar-links,
                    .navbar-actions {
                        display: none;
                    }

                    .mobile-menu-toggle {
                        display: block;
                    }

                    .mobile-menu {
                        display: flex;
                    }
                }

                /* Hero Section */
                .pricing-hero {
                    padding: 8rem 2rem 4rem;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                    position: relative;
                }

                .pricing-hero::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 100%;
                    height: 100%;
                    background: radial-gradient(ellipse at center top, rgba(59, 130, 246, 0.15) 0%, transparent 60%);
                    pointer-events: none;
                }

                .pricing-hero-content {
                    max-width: 800px;
                    margin-bottom: 3rem;
                    position: relative;
                    z-index: 1;
                }

                .pricing-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.5rem 1rem;
                    background: rgba(59, 130, 246, 0.15);
                    border: 1px solid rgba(59, 130, 246, 0.3);
                    border-radius: 100px;
                    font-size: 0.9rem;
                    color: #60a5fa;
                    margin-bottom: 1.5rem;
                }

                .pricing-hero h1 {
                    font-size: clamp(2rem, 5vw, 3.5rem);
                    font-weight: 800;
                    line-height: 1.2;
                    margin-bottom: 1.5rem;
                    color: #ffffff;
                }

                .gradient-text {
                    background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 50%, #22d3ee 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }

                .pricing-subtitle {
                    font-size: 1.25rem;
                    color: #94a3b8;
                    line-height: 1.6;
                    max-width: 600px;
                    margin: 0 auto;
                }

                /* Pricing Card */
                .pricing-card-wrapper {
                    position: relative;
                    z-index: 1;
                    width: 100%;
                    max-width: 420px;
                    display: flex;
                    justify-content: center;
                }

                .pricing-card {
                    background: linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(10, 15, 26, 0.95) 100%);
                    border: 1px solid rgba(59, 130, 246, 0.3);
                    border-radius: 24px;
                    padding: 2rem;
                    backdrop-filter: blur(20px);
                    position: relative;
                    overflow: hidden;
                    width: 100%;
                }

                .pricing-card::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 4px;
                    background: linear-gradient(90deg, #3b82f6, #06b6d4, #22d3ee);
                }

                .pricing-card-glow {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 150%;
                    height: 150%;
                    background: radial-gradient(ellipse at center, rgba(59, 130, 246, 0.1) 0%, transparent 70%);
                    pointer-events: none;
                    z-index: 0;
                }

                .pricing-card-header {
                    text-align: center;
                    margin-bottom: 2rem;
                    padding-bottom: 2rem;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                }

                .plan-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.5rem 1rem;
                    background: linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(6, 182, 212, 0.3));
                    border-radius: 100px;
                    font-weight: 600;
                    color: #93c5fd;
                    margin-bottom: 1.5rem;
                }

                .plan-badge svg {
                    color: #fbbf24;
                }

                .price-container {
                    display: flex;
                    align-items: baseline;
                    justify-content: center;
                    gap: 0.25rem;
                    margin-bottom: 0.75rem;
                }

                .price-amount {
                    font-size: 4rem;
                    font-weight: 800;
                    background: linear-gradient(135deg, #ffffff, #93c5fd);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }

                .price-period {
                    font-size: 1.25rem;
                    color: #94a3b8;
                }

                .price-description {
                    color: #94a3b8;
                    font-size: 0.95rem;
                }

                .pricing-card-features {
                    display: flex;
                    flex-direction: column;
                    gap: 0.875rem;
                    margin-bottom: 2rem;
                }

                .feature-item {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    font-size: 0.95rem;
                    color: #cbd5e1;
                }

                .feature-item.highlight {
                    color: #ffffff;
                    font-weight: 500;
                }

                .feature-icon {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 24px;
                    height: 24px;
                    background: linear-gradient(135deg, #3b82f6, #06b6d4);
                    border-radius: 50%;
                    flex-shrink: 0;
                }

                .feature-icon svg {
                    color: white;
                }

                .pricing-card-cta {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 1rem;
                }

                .cta-button {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.75rem;
                    padding: 1rem 2rem;
                    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                    border: none;
                    border-radius: 12px;
                    font-size: 1.1rem;
                    font-weight: 600;
                    color: white;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 20px rgba(59, 130, 246, 0.4);
                }

                .cta-button:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 30px rgba(59, 130, 246, 0.5);
                }

                .cta-button:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                }

                .cta-button.active {
                    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
                    box-shadow: 0 4px 20px rgba(34, 197, 94, 0.4);
                }

                .cta-button.large {
                    padding: 1.25rem 3rem;
                    font-size: 1.25rem;
                    max-width: 400px;
                }

                .cta-note {
                    font-size: 0.875rem;
                    color: #94a3b8;
                    text-align: center;
                }

                .trial-badge {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.875rem;
                    color: #fbbf24;
                    background: rgba(251, 191, 36, 0.1);
                    padding: 0.5rem 1rem;
                    border-radius: 8px;
                }

                .expired-badge {
                    font-size: 0.875rem;
                    color: #f87171;
                    background: rgba(248, 113, 113, 0.1);
                    padding: 0.5rem 1rem;
                    border-radius: 8px;
                }

                .error-message {
                    color: #f87171;
                    font-size: 0.875rem;
                    text-align: center;
                    padding: 0.75rem 1rem;
                    background: rgba(248, 113, 113, 0.1);
                    border-radius: 8px;
                    width: 100%;
                }

                .pricing-card-footer {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                    margin-top: 1.5rem;
                    padding-top: 1.5rem;
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                }

                .guarantee {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    font-size: 0.85rem;
                    color: #64748b;
                }

                /* Benefits Section */
                .pricing-benefits {
                    padding: 5rem 2rem;
                    background: rgba(0, 0, 0, 0.2);
                }

                .pricing-benefits h2 {
                    text-align: center;
                    font-size: 2rem;
                    font-weight: 700;
                    margin-bottom: 3rem;
                }

                .benefits-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 1.5rem;
                    max-width: 1100px;
                    margin: 0 auto;
                }

                @media (max-width: 900px) {
                    .benefits-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }
                }

                @media (max-width: 600px) {
                    .benefits-grid {
                        grid-template-columns: 1fr;
                    }
                }

                .benefit-card {
                    background: rgba(15, 23, 42, 0.5);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 16px;
                    padding: 1.5rem;
                    text-align: center;
                    transition: all 0.3s ease;
                }

                .benefit-card:hover {
                    transform: translateY(-4px);
                    border-color: rgba(59, 130, 246, 0.3);
                }

                .benefit-icon {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 56px;
                    height: 56px;
                    background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(6, 182, 212, 0.2));
                    border-radius: 14px;
                    margin: 0 auto 1rem;
                    color: #60a5fa;
                }

                .benefit-card h3 {
                    font-size: 1.1rem;
                    font-weight: 600;
                    margin-bottom: 0.5rem;
                }

                .benefit-card p {
                    font-size: 0.95rem;
                    color: #94a3b8;
                    line-height: 1.5;
                }

                /* Video Demo Section */
                .pricing-video {
                    padding: 5rem 2rem;
                    background: rgba(0, 0, 0, 0.1);
                }

                .pricing-video h2 {
                    text-align: center;
                    font-size: 2rem;
                    font-weight: 700;
                    margin-bottom: 0.75rem;
                }

                .video-subtitle {
                    text-align: center;
                    color: #94a3b8;
                    font-size: 1.1rem;
                    margin-bottom: 2.5rem;
                    max-width: 500px;
                    margin-left: auto;
                    margin-right: auto;
                }

                .video-wrapper {
                    max-width: 800px;
                    margin: 0 auto;
                }

                .video-placeholder {
                    aspect-ratio: 16 / 9;
                    background: linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(10, 15, 26, 0.9) 100%);
                    border: 2px dashed rgba(59, 130, 246, 0.3);
                    border-radius: 16px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 1rem;
                    color: #64748b;
                    transition: all 0.3s ease;
                }

                .video-placeholder:hover {
                    border-color: rgba(59, 130, 246, 0.5);
                    background: linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(10, 15, 26, 1) 100%);
                }

                .play-button {
                    width: 80px;
                    height: 80px;
                    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    box-shadow: 0 4px 20px rgba(59, 130, 246, 0.4);
                    transition: all 0.3s ease;
                }

                .video-placeholder:hover .play-button {
                    transform: scale(1.1);
                    box-shadow: 0 8px 30px rgba(59, 130, 246, 0.5);
                }

                .video-placeholder p {
                    font-size: 1rem;
                    font-weight: 500;
                }

                /* Final CTA */
                .pricing-final-cta {
                    padding: 5rem 2rem;
                    background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(6, 182, 212, 0.1) 100%);
                }

                .final-cta-content {
                    max-width: 600px;
                    margin: 0 auto;
                    text-align: center;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }

                .final-cta-content h2 {
                    font-size: 2rem;
                    font-weight: 700;
                    margin-bottom: 0.75rem;
                }

                .final-cta-content p {
                    font-size: 1.1rem;
                    color: #94a3b8;
                    margin-bottom: 2rem;
                }

                /* Footer */
                .pricing-footer {
                    padding: 2rem;
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                }

                .pricing-footer .section-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 1rem;
                }

                .pricing-footer p {
                    color: #64748b;
                    font-size: 0.875rem;
                }

                .footer-links {
                    display: flex;
                    justify-content: center;
                    gap: 2rem;
                }

                .footer-links a {
                    color: #94a3b8;
                    font-size: 0.875rem;
                    text-decoration: none;
                    transition: color 0.2s ease;
                }

                .footer-links a:hover {
                    color: #3b82f6;
                }

                /* Responsive */
                @media (max-width: 768px) {
                    .pricing-hero {
                        padding: 6rem 1rem 3rem;
                    }

                    .pricing-card {
                        padding: 1.5rem;
                    }

                    .price-amount {
                        font-size: 3rem;
                    }

                    .benefits-grid {
                        grid-template-columns: 1fr;
                    }

                    .pricing-benefits,
                    .pricing-social-proof,
                    .pricing-final-cta {
                        padding: 3rem 1rem;
                    }
                }
            `}</style>
        </div>
    );
}
