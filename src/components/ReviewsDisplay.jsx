/**
 * 📊 Reviews Display Component
 * Exibe avaliações de um profissional com estatísticas
 */

import React, { useState, useEffect } from 'react';
import { Star, MessageCircle, ChevronDown, CheckCircle, User } from 'lucide-react';
import StarRating, { StarRatingInline, RatingDistribution } from './StarRating';
import { getProfessionalReviews, getReviewStats, getRatingDistribution } from '../lib/reviews';
import { useLanguage } from '../i18n';
import { format, formatDistanceToNow } from 'date-fns';
import { pt, enUS } from 'date-fns/locale';

/**
 * Card de Estatísticas de Avaliação
 */
export function ReviewStatsCard({ professionalId, compact = false }) {
    const { t, language } = useLanguage();
    const [stats, setStats] = useState({ averageRating: 0, totalReviews: 0 });
    const [distribution, setDistribution] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            const [statsData, distData] = await Promise.all([
                getReviewStats(professionalId),
                getRatingDistribution(professionalId)
            ]);
            setStats(statsData);
            setDistribution(distData);
            setLoading(false);
        };

        if (professionalId) fetchStats();
    }, [professionalId]);

    if (loading) {
        return (
            <div style={{
                padding: compact ? '1rem' : '1.5rem',
                background: 'var(--bg-card)',
                borderRadius: '16px',
                border: '1px solid var(--border-default)'
            }}>
                <div className="skeleton" style={{ height: '60px' }} />
            </div>
        );
    }

    if (compact) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                background: 'var(--bg-elevated)',
                borderRadius: '10px',
                border: '1px solid var(--border-default)'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem'
                }}>
                    <Star size={18} fill="#fbbf24" stroke="#fbbf24" />
                    <span style={{
                        fontWeight: 700,
                        fontSize: '1rem',
                        color: 'var(--text-primary)'
                    }}>
                        {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '—'}
                    </span>
                </div>
                <span style={{
                    fontSize: '0.8125rem',
                    color: 'var(--text-muted)'
                }}>
                    ({stats.totalReviews} {t?.reviews?.totalReviews || 'reviews'})
                </span>
            </div>
        );
    }

    return (
        <div style={{
            padding: '1.5rem',
            background: 'var(--bg-card)',
            borderRadius: '16px',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-sm)'
        }}>
            <h3 style={{
                fontSize: '1rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: '1.25rem'
            }}>
                {t?.reviews?.title || 'Reviews'}
            </h3>

            <div style={{
                display: 'flex',
                gap: '2rem',
                flexWrap: 'wrap'
            }}>
                {/* Média Geral */}
                <div style={{ textAlign: 'center', minWidth: '100px' }}>
                    <div style={{
                        fontSize: '3rem',
                        fontWeight: 800,
                        color: 'var(--text-primary)',
                        lineHeight: 1,
                        marginBottom: '0.5rem'
                    }}>
                        {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '—'}
                    </div>
                    <div style={{ marginBottom: '0.5rem' }}>
                        <StarRating
                            rating={stats.averageRating}
                            size={16}
                            readOnly
                        />
                    </div>
                    <p style={{
                        fontSize: '0.8125rem',
                        color: 'var(--text-muted)'
                    }}>
                        {stats.totalReviews} {t?.reviews?.totalReviews || 'reviews'}
                    </p>
                </div>

                {/* Distribuição */}
                <div style={{ flex: 1, minWidth: '200px' }}>
                    <RatingDistribution
                        distribution={distribution}
                        totalReviews={stats.totalReviews}
                    />
                </div>
            </div>
        </div>
    );
}

/**
 * Lista de Avaliações
 */
export function ReviewsList({ professionalId, initialLimit = 5 }) {
    const { t, language } = useLanguage();
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCount, setShowCount] = useState(initialLimit);

    const dateLocale = language === 'pt' ? pt : enUS;

    useEffect(() => {
        const fetchReviews = async () => {
            const data = await getProfessionalReviews(professionalId, { limitCount: 50 });
            setReviews(data);
            setLoading(false);
        };

        if (professionalId) fetchReviews();
    }, [professionalId]);

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {[...Array(3)].map((_, i) => (
                    <div key={i} style={{
                        padding: '1.25rem',
                        background: 'var(--bg-card)',
                        borderRadius: '14px',
                        border: '1px solid var(--border-default)'
                    }}>
                        <div className="skeleton" style={{ height: '80px' }} />
                    </div>
                ))}
            </div>
        );
    }

    if (reviews.length === 0) {
        return (
            <div style={{
                padding: '3rem 2rem',
                textAlign: 'center',
                background: 'var(--bg-card)',
                borderRadius: '16px',
                border: '1px solid var(--border-default)'
            }}>
                <Star
                    size={48}
                    style={{
                        color: 'var(--border-default)',
                        marginBottom: '1rem',
                        opacity: 0.5
                    }}
                />
                <p style={{
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBottom: '0.5rem'
                }}>
                    {t?.reviews?.noReviews || 'No reviews yet'}
                </p>
                <p style={{
                    fontSize: '0.875rem',
                    color: 'var(--text-muted)'
                }}>
                    {t?.reviews?.beFirstToReview || 'Be the first to review!'}
                </p>
            </div>
        );
    }

    const visibleReviews = reviews.slice(0, showCount);

    return (
        <div>
            <h3 style={{
                fontSize: '1rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: '1rem'
            }}>
                {t?.reviews?.recentReviews || 'Recent Reviews'}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {visibleReviews.map((review) => (
                    <ReviewCard key={review.id} review={review} dateLocale={dateLocale} t={t} />
                ))}
            </div>

            {reviews.length > showCount && (
                <button
                    onClick={() => setShowCount(prev => prev + 5)}
                    style={{
                        width: '100%',
                        marginTop: '1rem',
                        padding: '0.875rem',
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-default)',
                        borderRadius: '12px',
                        color: 'var(--text-primary)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        transition: 'all 0.2s ease'
                    }}
                >
                    <ChevronDown size={16} />
                    {t?.common?.viewMore || 'View more'} ({reviews.length - showCount} {language === 'pt' ? 'restantes' : 'remaining'})
                </button>
            )}
        </div>
    );
}

/**
 * Card Individual de Avaliação
 */
function ReviewCard({ review, dateLocale, t }) {
    const timeAgo = formatDistanceToNow(new Date(review.createdAt), {
        addSuffix: true,
        locale: dateLocale
    });

    return (
        <div style={{
            padding: '1.25rem',
            background: 'var(--bg-card)',
            borderRadius: '14px',
            border: '1px solid var(--border-default)',
            transition: 'all 0.2s ease'
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                marginBottom: '0.75rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--accent-primary), #60a5fa)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 600,
                        fontSize: '1rem'
                    }}>
                        {review.clientName?.charAt(0).toUpperCase() || 'C'}
                    </div>
                    <div>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}>
                            <span style={{
                                fontWeight: 600,
                                color: 'var(--text-primary)'
                            }}>
                                {review.clientName}
                            </span>
                            {review.isVerified && (
                                <CheckCircle
                                    size={14}
                                    style={{ color: 'var(--accent-success)' }}
                                    title={t?.reviews?.verifiedClient || 'Verified Client'}
                                />
                            )}
                        </div>
                        <span style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-muted)'
                        }}>
                            {review.serviceName} • {timeAgo}
                        </span>
                    </div>
                </div>
                <StarRating rating={review.rating} size={14} readOnly />
            </div>

            {/* Comment */}
            {review.comment && (
                <p style={{
                    color: 'var(--text-secondary)',
                    fontSize: '0.9375rem',
                    lineHeight: 1.6,
                    marginBottom: review.professionalResponse ? '1rem' : 0
                }}>
                    "{review.comment}"
                </p>
            )}

            {/* Professional Response */}
            {review.professionalResponse && (
                <div style={{
                    marginTop: '1rem',
                    padding: '1rem',
                    background: 'var(--bg-secondary)',
                    borderRadius: '10px',
                    borderLeft: '3px solid var(--accent-primary)'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginBottom: '0.5rem'
                    }}>
                        <MessageCircle size={14} style={{ color: 'var(--accent-primary)' }} />
                        <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: 'var(--accent-primary)'
                        }}>
                            {t?.reviews?.professionalResponse || 'Professional response'}
                        </span>
                    </div>
                    <p style={{
                        color: 'var(--text-secondary)',
                        fontSize: '0.875rem',
                        lineHeight: 1.5
                    }}>
                        {review.professionalResponse}
                    </p>
                </div>
            )}
        </div>
    );
}

export default ReviewsList;
