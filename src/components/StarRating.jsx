/**
 * ⭐ Star Rating Component
 * Componente interativo de classificação por estrelas
 */

import React, { useState } from 'react';
import { Star } from 'lucide-react';

export default function StarRating({
    rating = 0,
    maxRating = 5,
    size = 24,
    readOnly = false,
    onChange = () => { },
    showLabel = false,
    color = '#fbbf24', // Amarelo/Dourado
    emptyColor = 'var(--border-default)'
}) {
    const [hoverRating, setHoverRating] = useState(0);

    const labels = {
        1: { pt: 'Fraco', en: 'Poor' },
        2: { pt: 'Razoável', en: 'Fair' },
        3: { pt: 'Bom', en: 'Good' },
        4: { pt: 'Muito Bom', en: 'Very Good' },
        5: { pt: 'Excelente', en: 'Excellent' }
    };

    const handleClick = (value) => {
        if (!readOnly) {
            onChange(value);
        }
    };

    const handleMouseEnter = (value) => {
        if (!readOnly) {
            setHoverRating(value);
        }
    };

    const handleMouseLeave = () => {
        if (!readOnly) {
            setHoverRating(0);
        }
    };

    const displayRating = hoverRating || rating;
    const lang = document.documentElement.lang === 'en' ? 'en' : 'pt';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <div
                style={{
                    display: 'flex',
                    gap: '4px',
                    cursor: readOnly ? 'default' : 'pointer'
                }}
                onMouseLeave={handleMouseLeave}
            >
                {[...Array(maxRating)].map((_, index) => {
                    const starValue = index + 1;
                    const isFilled = starValue <= displayRating;

                    return (
                        <button
                            key={index}
                            onClick={() => handleClick(starValue)}
                            onMouseEnter={() => handleMouseEnter(starValue)}
                            disabled={readOnly}
                            style={{
                                background: 'none',
                                border: 'none',
                                padding: '2px',
                                cursor: readOnly ? 'default' : 'pointer',
                                transition: 'transform 0.15s ease',
                                transform: (hoverRating === starValue && !readOnly) ? 'scale(1.2)' : 'scale(1)'
                            }}
                            aria-label={`${starValue} ${starValue === 1 ? 'star' : 'stars'}`}
                        >
                            <Star
                                size={size}
                                fill={isFilled ? color : 'none'}
                                stroke={isFilled ? color : emptyColor}
                                strokeWidth={1.5}
                                style={{
                                    transition: 'all 0.15s ease',
                                    filter: isFilled ? 'drop-shadow(0 1px 2px rgba(251, 191, 36, 0.3))' : 'none'
                                }}
                            />
                        </button>
                    );
                })}
            </div>

            {showLabel && displayRating > 0 && (
                <span style={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: color,
                    transition: 'all 0.15s ease'
                }}>
                    {labels[Math.round(displayRating)]?.[lang] || ''}
                </span>
            )}
        </div>
    );
}

/**
 * Versão compacta para exibição inline
 */
export function StarRatingInline({
    rating = 0,
    size = 16,
    showValue = true,
    totalReviews = null
}) {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem'
        }}>
            <Star
                size={size}
                fill="#fbbf24"
                stroke="#fbbf24"
                strokeWidth={1.5}
            />
            {showValue && (
                <span style={{
                    fontSize: `${size * 0.0625}rem`,
                    fontWeight: 600,
                    color: 'var(--text-primary)'
                }}>
                    {rating.toFixed(1)}
                </span>
            )}
            {totalReviews !== null && (
                <span style={{
                    fontSize: `${size * 0.05}rem`,
                    color: 'var(--text-muted)'
                }}>
                    ({totalReviews})
                </span>
            )}
        </div>
    );
}

/**
 * Versão para exibir distribuição de ratings
 */
export function RatingDistribution({ distribution = {}, totalReviews = 0 }) {
    const maxCount = Math.max(...Object.values(distribution), 1);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[5, 4, 3, 2, 1].map((stars) => {
                const count = distribution[stars] || 0;
                const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;

                return (
                    <div
                        key={stars}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem'
                        }}
                    >
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            width: '50px'
                        }}>
                            <span style={{
                                fontSize: '0.8125rem',
                                fontWeight: 500,
                                color: 'var(--text-secondary)',
                                width: '12px'
                            }}>
                                {stars}
                            </span>
                            <Star size={12} fill="#fbbf24" stroke="#fbbf24" />
                        </div>
                        <div style={{
                            flex: 1,
                            height: '8px',
                            background: 'var(--bg-elevated)',
                            borderRadius: '4px',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                width: `${percentage}%`,
                                height: '100%',
                                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                                borderRadius: '4px',
                                transition: 'width 0.5s ease'
                            }} />
                        </div>
                        <span style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-muted)',
                            width: '30px',
                            textAlign: 'right'
                        }}>
                            {count}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}
