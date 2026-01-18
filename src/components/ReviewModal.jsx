/**
 * 📝 Review Modal Component
 * Modal para cliente deixar avaliação após sessão
 */

import React, { useState } from 'react';
import { X, Star, Send, Check, Calendar, User } from 'lucide-react';
import StarRating from './StarRating';
import { submitReview } from '../lib/reviews';
import { useLanguage } from '../i18n';
import { format } from 'date-fns';
import { pt, enUS } from 'date-fns/locale';

export default function ReviewModal({
    isOpen,
    onClose,
    booking,
    onReviewSubmitted = () => { }
}) {
    const { t, language } = useLanguage();
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState(null);

    if (!isOpen || !booking) return null;

    const dateLocale = language === 'pt' ? pt : enUS;
    const formattedDate = format(
        new Date(booking.date),
        "EEEE, d 'de' MMMM",
        { locale: dateLocale }
    );

    const handleSubmit = async () => {
        if (rating === 0) {
            setError(language === 'pt'
                ? 'Por favor, selecione uma classificação'
                : 'Please select a rating'
            );
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            const result = await submitReview({
                bookingId: booking.id,
                professionalId: booking.professionalId,
                staffId: booking.staffId || null,
                clientId: booking.clientId,
                clientName: booking.clientName,
                rating,
                comment,
                serviceName: booking.serviceName,
                serviceDate: booking.date
            });

            if (result.success) {
                setSuccess(true);
                onReviewSubmitted(result.reviewId);
                setTimeout(() => {
                    onClose();
                    setSuccess(false);
                    setRating(0);
                    setComment('');
                }, 2000);
            } else {
                setError(result.message || (language === 'pt'
                    ? 'Erro ao enviar avaliação'
                    : 'Error submitting review'
                ));
            }
        } catch (err) {
            setError(language === 'pt'
                ? 'Erro ao enviar avaliação. Tente novamente.'
                : 'Error submitting review. Please try again.'
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            {/* Backdrop */}
            <div
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.6)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 1000,
                    animation: 'fadeIn 0.2s ease'
                }}
                onClick={onClose}
            />

            {/* Modal */}
            <div style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 'calc(100% - 2rem)',
                maxWidth: '420px',
                background: 'var(--bg-card)',
                borderRadius: '20px',
                border: '1px solid var(--border-default)',
                boxShadow: 'var(--shadow-xl)',
                zIndex: 1001,
                overflow: 'hidden',
                animation: 'modalIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
                {/* Header */}
                <div style={{
                    padding: '1.5rem',
                    borderBottom: '1px solid var(--border-default)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div>
                        <h2 style={{
                            fontSize: '1.25rem',
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            marginBottom: '0.25rem'
                        }}>
                            {t?.reviews?.leaveReview || 'Leave a Review'}
                        </h2>
                        <p style={{
                            fontSize: '0.875rem',
                            color: 'var(--text-secondary)'
                        }}>
                            {t?.reviews?.rateExperience || 'How was your experience?'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            width: '36px',
                            height: '36px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--border-default)',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            color: 'var(--text-secondary)',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <X size={18} />
                    </button>
                </div>

                {!success ? (
                    <>
                        {/* Booking Info */}
                        <div style={{
                            padding: '1.25rem 1.5rem',
                            background: 'var(--bg-secondary)',
                            borderBottom: '1px solid var(--border-default)'
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem'
                            }}>
                                {booking.logoUrl ? (
                                    <img
                                        src={booking.logoUrl}
                                        alt=""
                                        style={{
                                            width: '48px',
                                            height: '48px',
                                            borderRadius: '12px',
                                            objectFit: 'cover'
                                        }}
                                    />
                                ) : (
                                    <div style={{
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: '12px',
                                        background: 'linear-gradient(135deg, var(--accent-primary), #60a5fa)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'white',
                                        fontWeight: 700,
                                        fontSize: '1.25rem'
                                    }}>
                                        {booking.professionalName?.charAt(0) || 'P'}
                                    </div>
                                )}
                                <div style={{ flex: 1 }}>
                                    <p style={{
                                        fontWeight: 600,
                                        color: 'var(--text-primary)',
                                        marginBottom: '0.25rem'
                                    }}>
                                        {booking.businessName || booking.professionalName}
                                    </p>
                                    <p style={{
                                        fontSize: '0.8125rem',
                                        color: 'var(--text-secondary)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    }}>
                                        <span style={{
                                            padding: '2px 6px',
                                            background: 'color-mix(in srgb, var(--accent-primary), transparent 90%)',
                                            borderRadius: '4px',
                                            color: 'var(--accent-primary)',
                                            fontWeight: 500
                                        }}>
                                            {booking.serviceName}
                                        </span>
                                    </p>
                                </div>
                            </div>
                            <div style={{
                                marginTop: '0.75rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                fontSize: '0.8125rem',
                                color: 'var(--text-muted)'
                            }}>
                                <Calendar size={14} />
                                <span>{formattedDate}</span>
                            </div>
                        </div>

                        {/* Rating */}
                        <div style={{ padding: '1.5rem', textAlign: 'center' }}>
                            <p style={{
                                marginBottom: '1rem',
                                color: 'var(--text-secondary)',
                                fontSize: '0.9375rem'
                            }}>
                                {t?.reviews?.yourRating || 'Your rating'}
                            </p>
                            <StarRating
                                rating={rating}
                                size={40}
                                onChange={setRating}
                                showLabel={true}
                            />
                        </div>

                        {/* Comment */}
                        <div style={{ padding: '0 1.5rem 1.5rem' }}>
                            <textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder={t?.reviews?.reviewPlaceholder || 'Tell us about your experience...'}
                                style={{
                                    width: '100%',
                                    minHeight: '100px',
                                    padding: '1rem',
                                    border: '1px solid var(--border-default)',
                                    borderRadius: '12px',
                                    background: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)',
                                    fontSize: '0.9375rem',
                                    resize: 'vertical',
                                    fontFamily: 'inherit'
                                }}
                            />
                            <p style={{
                                marginTop: '0.5rem',
                                fontSize: '0.75rem',
                                color: 'var(--text-muted)'
                            }}>
                                {language === 'pt' ? 'Opcional' : 'Optional'}
                            </p>
                        </div>

                        {/* Error */}
                        {error && (
                            <div style={{
                                margin: '0 1.5rem 1rem',
                                padding: '0.75rem 1rem',
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                borderRadius: '10px',
                                color: '#ef4444',
                                fontSize: '0.875rem'
                            }}>
                                {error}
                            </div>
                        )}

                        {/* Actions */}
                        <div style={{
                            padding: '1rem 1.5rem 1.5rem',
                            display: 'flex',
                            gap: '0.75rem'
                        }}>
                            <button
                                onClick={onClose}
                                style={{
                                    flex: 1,
                                    padding: '0.875rem',
                                    background: 'var(--bg-elevated)',
                                    border: '1px solid var(--border-default)',
                                    borderRadius: '12px',
                                    color: 'var(--text-primary)',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                {t?.reviews?.skipReview || 'Review later'}
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={submitting || rating === 0}
                                style={{
                                    flex: 1,
                                    padding: '0.875rem',
                                    background: rating > 0 ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                                    border: 'none',
                                    borderRadius: '12px',
                                    color: rating > 0 ? 'white' : 'var(--text-muted)',
                                    fontWeight: 600,
                                    cursor: rating > 0 ? 'pointer' : 'not-allowed',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    transition: 'all 0.2s ease',
                                    boxShadow: rating > 0 ? 'var(--shadow-md)' : 'none'
                                }}
                            >
                                {submitting ? (
                                    <div className="spinner" style={{ width: '18px', height: '18px' }} />
                                ) : (
                                    <>
                                        <Send size={16} />
                                        {t?.reviews?.submitReview || 'Submit Review'}
                                    </>
                                )}
                            </button>
                        </div>
                    </>
                ) : (
                    /* Success State */
                    <div style={{
                        padding: '3rem 1.5rem',
                        textAlign: 'center'
                    }}>
                        <div style={{
                            width: '72px',
                            height: '72px',
                            margin: '0 auto 1.5rem',
                            background: 'rgba(34, 197, 94, 0.1)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--accent-success)',
                            animation: 'scaleIn 0.3s ease'
                        }}>
                            <Check size={36} strokeWidth={3} />
                        </div>
                        <h3 style={{
                            fontSize: '1.25rem',
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            marginBottom: '0.5rem'
                        }}>
                            {t?.reviews?.reviewSubmitted || 'Review submitted!'}
                        </h3>
                        <p style={{
                            color: 'var(--text-secondary)'
                        }}>
                            {t?.reviews?.thankYouReview || 'Thank you for your feedback!'}
                        </p>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes modalIn {
                    from {
                        opacity: 0;
                        transform: translate(-50%, -50%) scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: translate(-50%, -50%) scale(1);
                    }
                }
                @keyframes scaleIn {
                    from { transform: scale(0); }
                    to { transform: scale(1); }
                }
            `}</style>
        </>
    );
}
