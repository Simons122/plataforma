import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { CheckCircle, Sparkles, ArrowRight, PartyPopper, Loader2 } from 'lucide-react';

export default function PaymentSuccessPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [updated, setUpdated] = useState(false);

    useEffect(() => {
        const updateSubscriptionStatus = async () => {
            const sessionId = searchParams.get('session_id');
            const user = auth.currentUser;

            if (user) {
                try {
                    // Update user's payment status to active
                    await updateDoc(doc(db, 'professionals', user.uid), {
                        paymentStatus: 'active',
                        subscriptionStartedAt: serverTimestamp(),
                        lastPaymentAt: serverTimestamp(),
                        stripeSessionId: sessionId || null
                    });
                    setUpdated(true);
                    console.log('✅ Subscription activated successfully');
                } catch (error) {
                    console.error('Error updating subscription status:', error);
                }
            }
            setLoading(false);
        };

        updateSubscriptionStatus();
    }, [searchParams]);

    const handleContinue = () => {
        navigate('/dashboard');
    };

    return (
        <div className="payment-success-page">
            <div className="success-container">
                {loading ? (
                    <div className="loading-state">
                        <Loader2 className="spinner" size={48} />
                        <p>A ativar a tua subscrição...</p>
                    </div>
                ) : (
                    <>
                        <div className="success-icon">
                            <div className="icon-glow"></div>
                            <CheckCircle size={64} />
                            <PartyPopper className="confetti confetti-1" size={24} />
                            <PartyPopper className="confetti confetti-2" size={24} />
                            <Sparkles className="sparkle sparkle-1" size={20} />
                            <Sparkles className="sparkle sparkle-2" size={20} />
                        </div>

                        <h1>Pagamento Confirmado! 🎉</h1>
                        <p className="success-message">
                            Bem-vindo ao <strong>Booklyo Pro</strong>! A tua subscrição está agora ativa
                            e tens acesso a todas as funcionalidades.
                        </p>

                        <div className="features-unlocked">
                            <h3>Agora podes:</h3>
                            <ul>
                                <li>✅ Receber marcações ilimitadas</li>
                                <li>✅ Enviar confirmações automáticas</li>
                                <li>✅ Gerir serviços e horários</li>
                                <li>✅ Aceder ao painel profissional completo</li>
                            </ul>
                        </div>

                        <button className="continue-button" onClick={handleContinue}>
                            <span>Ir para o Dashboard</span>
                            <ArrowRight size={20} />
                        </button>

                        <p className="support-note">
                            Precisas de ajuda? Contacta-nos a qualquer momento.
                        </p>
                    </>
                )}
            </div>

            <style>{`
                .payment-success-page {
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%);
                    padding: 2rem;
                }

                .success-container {
                    max-width: 500px;
                    text-align: center;
                    color: white;
                }

                .loading-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 1.5rem;
                }

                .spinner {
                    animation: spin 1s linear infinite;
                    color: #8b5cf6;
                }

                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                .success-icon {
                    position: relative;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 2rem;
                }

                .success-icon > svg:first-of-type {
                    color: #22c55e;
                    z-index: 1;
                }

                .icon-glow {
                    position: absolute;
                    width: 120px;
                    height: 120px;
                    background: radial-gradient(circle, rgba(34, 197, 94, 0.3) 0%, transparent 70%);
                    border-radius: 50%;
                    animation: pulse 2s ease-in-out infinite;
                }

                @keyframes pulse {
                    0%, 100% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.2); opacity: 0.5; }
                }

                .confetti, .sparkle {
                    position: absolute;
                    color: #fbbf24;
                    animation: float 2s ease-in-out infinite;
                }

                .confetti-1 { top: -10px; left: -40px; animation-delay: 0s; }
                .confetti-2 { top: -10px; right: -40px; animation-delay: 0.5s; }
                .sparkle-1 { bottom: 0; left: -30px; animation-delay: 0.25s; }
                .sparkle-2 { bottom: 0; right: -30px; animation-delay: 0.75s; }

                @keyframes float {
                    0%, 100% { transform: translateY(0) rotate(0deg); }
                    50% { transform: translateY(-10px) rotate(10deg); }
                }

                h1 {
                    font-size: 2rem;
                    font-weight: 700;
                    margin-bottom: 1rem;
                    background: linear-gradient(135deg, #22c55e, #4ade80);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }

                .success-message {
                    font-size: 1.1rem;
                    color: #a1a1aa;
                    line-height: 1.6;
                    margin-bottom: 2rem;
                }

                .success-message strong {
                    color: #e9d5ff;
                }

                .features-unlocked {
                    background: rgba(30, 30, 50, 0.5);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 16px;
                    padding: 1.5rem;
                    margin-bottom: 2rem;
                    text-align: left;
                }

                .features-unlocked h3 {
                    font-size: 1rem;
                    font-weight: 600;
                    margin-bottom: 1rem;
                    color: #e4e4e7;
                }

                .features-unlocked ul {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                }

                .features-unlocked li {
                    font-size: 0.95rem;
                    color: #a1a1aa;
                }

                .continue-button {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.75rem;
                    padding: 1rem 2rem;
                    background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
                    border: none;
                    border-radius: 12px;
                    font-size: 1.1rem;
                    font-weight: 600;
                    color: white;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 20px rgba(139, 92, 246, 0.4);
                    margin-bottom: 1.5rem;
                }

                .continue-button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 30px rgba(139, 92, 246, 0.5);
                }

                .support-note {
                    font-size: 0.875rem;
                    color: #71717a;
                }
            `}</style>
        </div>
    );
}
