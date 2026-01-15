/**
 * 🔔 Pending Reviews Prompt
 * Componente que aparece para clientes com avaliações pendentes
 */

import React, { useState, useEffect } from 'react';
import { Star, X, ChevronRight } from 'lucide-react';
import { getPendingReviews } from '../lib/reviews';
import { useLanguage } from '../i18n';
import { format } from 'date-fns';
import { pt, enUS } from 'date-fns/locale';
import ReviewModal from './ReviewModal';
import { auth } from '../lib/firebase';

export default function PendingReviewsPrompt() {
    const { t, language } = useLanguage();
    const [pendingReviews, setPendingReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dismissed, setDismissed] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [showModal, setShowModal] = useState(false);

    const dateLocale = language === 'pt' ? pt : enUS;

    useEffect(() => {
        const checkPendingReviews = async () => {
            const user = auth.currentUser;
            if (!user?.email) return;

            try {
                const pending = await getPendingReviews(user.email);
                setPendingReviews(pending);
            } catch (error) {
                console.error('Error checking reviews:', error);
            } finally {
                setLoading(false);
            }
        };

        checkPendingReviews();
    }, []);

    const handleReviewSubmitted = (reviewId) => {
        // Remove from pending list
        setPendingReviews(prev => prev.filter(p => p.id !== selectedBooking?.id));
        setShowModal(false);
        setSelectedBooking(null);
    };

    if (loading) return null;

    const firstPending = pendingReviews[0];

    return (
        <>


            {(pendingReviews.length > 0 && !dismissed) && (
                <div style={{
                    position: 'fixed',
                    bottom: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 'calc(100% - 2rem)',
                    maxWidth: '440px',
                    background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
                    borderRadius: '16px',
                    padding: '1.25rem',
                    boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.5)',
                    zIndex: 1000,
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
                }}>
                    {/* Close Button */}
                    <button
                        onClick={() => setDismissed(true)}
                        style={{
                            position: 'absolute',
                            top: '10px',
                            right: '10px',
                            width: '24px',
                            height: '24px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: 'none',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: 'rgba(255, 255, 255, 0.6)'
                        }}
                    >
                        <X size={14} />
                    </button>

                    {/* Content */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '12px',
                            background: 'rgba(251, 191, 36, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                        }}>
                            <Star size={24} fill="#fbbf24" stroke="#fbbf24" />
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{
                                color: 'white',
                                fontWeight: 600,
                                fontSize: '0.9375rem',
                                marginBottom: '0.25rem'
                            }}>
                                {t?.reviews?.rateExperience || 'How was your experience?'}
                            </p>
                            <p style={{
                                color: 'rgba(255, 255, 255, 0.7)',
                                fontSize: '0.8125rem'
                            }}>
                                {firstPending.serviceName} {language === 'pt' ? 'com' : 'with'} {firstPending.professionalName}
                            </p>
                        </div>

                        <button
                            onClick={() => {
                                setSelectedBooking({
                                    ...firstPending,
                                    clientId: auth.currentUser?.uid,
                                    clientName: firstPending.clientName
                                });
                                setShowModal(true);
                            }}
                            style={{
                                padding: '0.625rem 1rem',
                                background: 'rgba(255, 255, 255, 0.15)',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                borderRadius: '10px',
                                color: 'white',
                                fontWeight: 600,
                                fontSize: '0.8125rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.375rem',
                                whiteSpace: 'nowrap',
                                transition: 'all 0.2s ease'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
                        >
                            {t?.reviews?.leaveReview || 'Review'}
                            <ChevronRight size={14} />
                        </button>
                    </div>

                    {/* More reviews indicator */}
                    {pendingReviews.length > 1 && (
                        <p style={{
                            marginTop: '0.75rem',
                            paddingTop: '0.75rem',
                            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                            fontSize: '0.75rem',
                            color: 'rgba(255, 255, 255, 0.5)',
                            textAlign: 'center'
                        }}>
                            + {pendingReviews.length - 1} {language === 'pt' ? 'mais por avaliar' : 'more to review'}
                        </p>
                    )}
                </div>
            )}

            {/* Review Modal */}
            <ReviewModal
                isOpen={showModal}
                onClose={() => {
                    setShowModal(false);
                    setSelectedBooking(null);
                }}
                booking={selectedBooking}
                onReviewSubmitted={handleReviewSubmitted}
            />

            <style>{`
                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateX(-50%) translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(-50%) translateY(0);
                    }
                }
            `}</style>
        </>
    );
}
