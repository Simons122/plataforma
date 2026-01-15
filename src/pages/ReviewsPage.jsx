/**
 * ⭐ Reviews Management Page
 * Página para profissionais verem e responderem às avaliações
 */

import React, { useState, useEffect } from 'react';
import { Star, MessageCircle, TrendingUp, ChevronDown, Send, X } from 'lucide-react';
import Layout from '../components/Layout';
import { ReviewStatsCard, ReviewsList } from '../components/ReviewsDisplay';
import StarRating, { RatingDistribution } from '../components/StarRating';
import { getProfessionalReviews, getReviewStats, getRatingDistribution, respondToReview } from '../lib/reviews';
import { useLanguage } from '../i18n';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { pt, enUS } from 'date-fns/locale';

export default function ReviewsPage() {
    const { t, language } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [stats, setStats] = useState({ averageRating: 0, totalReviews: 0 });
    const [distribution, setDistribution] = useState({});
    const [respondingTo, setRespondingTo] = useState(null);
    const [responseText, setResponseText] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const dateLocale = language === 'pt' ? pt : enUS;

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user) {
                try {
                    const docRef = doc(db, 'professionals', user.uid);
                    const docSnap = await getDoc(docRef);

                    if (docSnap.exists()) {
                        const data = { id: user.uid, ...docSnap.data() };
                        setProfile(data);

                        // Fetch reviews data
                        const [reviewsData, statsData, distData] = await Promise.all([
                            getProfessionalReviews(user.uid, { limitCount: 100 }),
                            getReviewStats(user.uid),
                            getRatingDistribution(user.uid)
                        ]);

                        setReviews(reviewsData);
                        setStats(statsData);
                        setDistribution(distData);
                    }
                } catch (error) {
                    console.error('Error fetching data:', error);
                }
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleRespond = async (reviewId) => {
        if (!responseText.trim()) return;

        setSubmitting(true);
        try {
            const result = await respondToReview(profile.id, reviewId, responseText);
            if (result.success) {
                // Update local state
                setReviews(prev => prev.map(review =>
                    review.id === reviewId
                        ? { ...review, professionalResponse: responseText.trim() }
                        : review
                ));
                setRespondingTo(null);
                setResponseText('');
            }
        } catch (error) {
            console.error('Error responding:', error);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <Layout role="professional">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
                    <div className="spinner" />
                </div>
            </Layout>
        );
    }

    return (
        <Layout role="professional">
            {/* Header */}
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    marginBottom: '0.5rem',
                    color: 'var(--text-primary)'
                }}>
                    {t?.reviews?.title || 'Reviews'}
                </h1>
                <p style={{ color: 'var(--text-secondary)' }}>
                    {language === 'pt'
                        ? 'Veja e responda às avaliações dos seus clientes'
                        : 'View and respond to your client reviews'
                    }
                </p>
            </div>

            {/* Stats Overview */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1.5rem',
                marginBottom: '2rem'
            }}>
                {/* Main Stats Card */}
                <div style={{
                    padding: '1.75rem',
                    background: 'var(--bg-card)',
                    borderRadius: '16px',
                    border: '1px solid var(--border-default)',
                    boxShadow: 'var(--shadow-sm)'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        marginBottom: '1.5rem'
                    }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            background: 'rgba(251, 191, 36, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Star size={20} fill="#fbbf24" stroke="#fbbf24" />
                        </div>
                        <div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {t?.reviews?.averageRating || 'Average Rating'}
                            </p>
                            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '—'}
                            </p>
                        </div>
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                        <StarRating rating={stats.averageRating} size={24} readOnly />
                    </div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        {stats.totalReviews} {t?.reviews?.totalReviews || 'reviews'}
                    </p>
                </div>

                {/* Distribution Card */}
                <div style={{
                    padding: '1.75rem',
                    background: 'var(--bg-card)',
                    borderRadius: '16px',
                    border: '1px solid var(--border-default)',
                    boxShadow: 'var(--shadow-sm)'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        marginBottom: '1.5rem'
                    }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            background: 'rgba(59, 130, 246, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <TrendingUp size={20} style={{ color: 'var(--accent-primary)' }} />
                        </div>
                        <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {language === 'pt' ? 'Distribuição de Notas' : 'Rating Distribution'}
                        </p>
                    </div>
                    <RatingDistribution
                        distribution={distribution}
                        totalReviews={stats.totalReviews}
                    />
                </div>
            </div>

            {/* Reviews List */}
            <div style={{
                background: 'var(--bg-card)',
                borderRadius: '16px',
                border: '1px solid var(--border-default)',
                overflow: 'hidden'
            }}>
                <div style={{
                    padding: '1.25rem 1.5rem',
                    borderBottom: '1px solid var(--border-default)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <h3 style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {t?.reviews?.recentReviews || 'Recent Reviews'}
                    </h3>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        {reviews.length} {language === 'pt' ? 'avaliações' : 'reviews'}
                    </span>
                </div>

                {reviews.length === 0 ? (
                    <div style={{
                        padding: '4rem 2rem',
                        textAlign: 'center'
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
                            {language === 'pt'
                                ? 'As avaliações dos seus clientes aparecerão aqui'
                                : 'Your client reviews will appear here'
                            }
                        </p>
                    </div>
                ) : (
                    <div>
                        {reviews.map((review, index) => (
                            <div
                                key={review.id}
                                style={{
                                    padding: '1.5rem',
                                    borderBottom: index < reviews.length - 1 ? '1px solid var(--border-default)' : 'none'
                                }}
                            >
                                {/* Review Header */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    justifyContent: 'space-between',
                                    marginBottom: '0.75rem'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{
                                            width: '44px',
                                            height: '44px',
                                            borderRadius: '50%',
                                            background: 'linear-gradient(135deg, var(--accent-primary), #60a5fa)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'white',
                                            fontWeight: 600,
                                            fontSize: '1.125rem'
                                        }}>
                                            {review.clientName?.charAt(0).toUpperCase() || 'C'}
                                        </div>
                                        <div>
                                            <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                                {review.clientName}
                                            </p>
                                            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                                                {review.serviceName} • {formatDistanceToNow(new Date(review.createdAt), {
                                                    addSuffix: true,
                                                    locale: dateLocale
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                    <StarRating rating={review.rating} size={16} readOnly />
                                </div>

                                {/* Review Comment */}
                                {review.comment && (
                                    <p style={{
                                        color: 'var(--text-secondary)',
                                        fontSize: '0.9375rem',
                                        lineHeight: 1.6,
                                        marginBottom: '1rem',
                                        padding: '1rem',
                                        background: 'var(--bg-secondary)',
                                        borderRadius: '10px',
                                        fontStyle: 'italic'
                                    }}>
                                        "{review.comment}"
                                    </p>
                                )}

                                {/* Professional Response */}
                                {review.professionalResponse ? (
                                    <div style={{
                                        padding: '1rem',
                                        background: 'color-mix(in srgb, var(--accent-primary), transparent 95%)',
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
                                                {language === 'pt' ? 'Sua resposta' : 'Your response'}
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
                                ) : respondingTo === review.id ? (
                                    /* Response Form */
                                    <div style={{
                                        padding: '1rem',
                                        background: 'var(--bg-secondary)',
                                        borderRadius: '10px'
                                    }}>
                                        <textarea
                                            value={responseText}
                                            onChange={(e) => setResponseText(e.target.value)}
                                            placeholder={language === 'pt'
                                                ? 'Escreva a sua resposta...'
                                                : 'Write your response...'
                                            }
                                            style={{
                                                width: '100%',
                                                minHeight: '80px',
                                                padding: '0.75rem',
                                                border: '1px solid var(--border-default)',
                                                borderRadius: '8px',
                                                background: 'var(--bg-card)',
                                                color: 'var(--text-primary)',
                                                fontSize: '0.875rem',
                                                resize: 'vertical',
                                                fontFamily: 'inherit'
                                            }}
                                        />
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'flex-end',
                                            gap: '0.5rem',
                                            marginTop: '0.75rem'
                                        }}>
                                            <button
                                                onClick={() => {
                                                    setRespondingTo(null);
                                                    setResponseText('');
                                                }}
                                                style={{
                                                    padding: '0.5rem 1rem',
                                                    background: 'transparent',
                                                    border: '1px solid var(--border-default)',
                                                    borderRadius: '8px',
                                                    color: 'var(--text-secondary)',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.375rem'
                                                }}
                                            >
                                                <X size={14} />
                                                {t?.common?.cancel || 'Cancel'}
                                            </button>
                                            <button
                                                onClick={() => handleRespond(review.id)}
                                                disabled={submitting || !responseText.trim()}
                                                style={{
                                                    padding: '0.5rem 1rem',
                                                    background: 'var(--accent-primary)',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    color: 'white',
                                                    fontWeight: 600,
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.375rem',
                                                    opacity: !responseText.trim() ? 0.5 : 1
                                                }}
                                            >
                                                {submitting ? (
                                                    <div className="spinner" style={{ width: '14px', height: '14px' }} />
                                                ) : (
                                                    <Send size={14} />
                                                )}
                                                {language === 'pt' ? 'Enviar' : 'Send'}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    /* Respond Button */
                                    <button
                                        onClick={() => setRespondingTo(review.id)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            padding: '0.625rem 1rem',
                                            background: 'var(--bg-elevated)',
                                            border: '1px solid var(--border-default)',
                                            borderRadius: '8px',
                                            color: 'var(--text-secondary)',
                                            fontSize: '0.8125rem',
                                            fontWeight: 500,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease'
                                        }}
                                        onMouseOver={(e) => {
                                            e.currentTarget.style.borderColor = 'var(--accent-primary)';
                                            e.currentTarget.style.color = 'var(--accent-primary)';
                                        }}
                                        onMouseOut={(e) => {
                                            e.currentTarget.style.borderColor = 'var(--border-default)';
                                            e.currentTarget.style.color = 'var(--text-secondary)';
                                        }}
                                    >
                                        <MessageCircle size={14} />
                                        {language === 'pt' ? 'Responder' : 'Respond'}
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Layout>
    );
}
