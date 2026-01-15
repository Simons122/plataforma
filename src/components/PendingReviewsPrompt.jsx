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
    const [showListModal, setShowListModal] = useState(false);

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
                                {pendingReviews.length > 1
                                    ? (language === 'pt' ? `${pendingReviews.length} avaliações pendentes` : `${pendingReviews.length} pending reviews`)
                                    : (t?.reviews?.rateExperience || 'How was your experience?')}
                            </p>
                            <p style={{
                                color: 'rgba(255, 255, 255, 0.7)',
                                fontSize: '0.8125rem'
                            }}>
                                {pendingReviews.length > 1
                                    ? (language === 'pt' ? 'Toque para ver e avaliar.' : 'Tap to view and rate.')
                                    : `${firstPending.serviceName} ${language === 'pt' ? 'com' : 'with'} ${firstPending.professionalName}`}
                            </p>
                        </div>

                        <button
                            onClick={() => {
                                if (pendingReviews.length > 1) {
                                    setShowListModal(true);
                                } else {
                                    setSelectedBooking({
                                        ...firstPending,
                                        clientId: auth.currentUser?.uid,
                                        clientName: firstPending.clientName
                                    });
                                    setShowModal(true);
                                }
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
                            {pendingReviews.length > 1
                                ? (language === 'pt' ? 'Ver' : 'View')
                                : (t?.reviews?.leaveReview || 'Review')}
                            <ChevronRight size={14} />
                        </button>
                    </div>


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
            {/* List Modal */}
            <PendingListModal
                isOpen={showListModal}
                onClose={() => setShowListModal(false)}
                reviews={pendingReviews}
                onSelect={(review) => {
                    setSelectedBooking({
                        ...review,
                        clientId: auth.currentUser?.uid,
                        clientName: review.clientName
                    });
                    setShowListModal(false);
                    setShowModal(true);
                }}
                language={language}
            />
        </>
    );
}

function PendingListModal({ isOpen, onClose, reviews, onSelect, language }) {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem'
        }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
            <div style={{
                position: 'relative', width: '100%', maxWidth: '400px',
                background: 'var(--bg-card)', borderRadius: '20px',
                padding: '1.5rem', boxShadow: 'var(--shadow-xl)',
                maxHeight: '80vh', overflowY: 'auto',
                border: '1px solid var(--border-default)'
            }} className="animate-scale-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                        {language === 'pt' ? 'Avaliações Pendentes' : 'Pending Reviews'}
                    </h3>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                        <X size={20} />
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {reviews.map(review => (
                        <div key={review.id} style={{
                            padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '12px',
                            display: 'flex', gap: '1rem', alignItems: 'center',
                            border: '1px solid var(--border-subtle)'
                        }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '8px', overflow: 'hidden', background: '#e5e7eb', flexShrink: 0 }}>
                                {review.professionalImage ? (
                                    <img src={review.professionalImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', fontWeight: 'bold' }}>
                                        {review.professionalName?.[0]}
                                    </div>
                                )}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem', margin: '0 0 2px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{review.serviceName}</p>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0 }}>{review.professionalName}</p>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    {format(new Date(review.date || review.selectedTime), 'd MMM', { locale: language === 'pt' ? pt : enUS })} • {review.price}€
                                </p>
                            </div>
                            <button
                                onClick={() => onSelect(review)}
                                style={{
                                    padding: '0.5rem 1rem', background: 'var(--accent-primary)', color: 'white',
                                    border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                {language === 'pt' ? 'Avaliar' : 'Rate'}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
