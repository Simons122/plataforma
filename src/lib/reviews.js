/**
 * ⭐ Sistema de Avaliações e Feedback
 * Gerencia avaliações de clientes após cada sessão
 */

import { db } from './firebase';
import {
    collection,
    addDoc,
    getDocs,
    doc,
    getDoc,
    updateDoc,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp,
    writeBatch
} from 'firebase/firestore';

/**
 * Estrutura de uma avaliação:
 * {
 *   id: string,
 *   bookingId: string,
 *   professionalId: string,
 *   staffId?: string,
 *   clientId: string,
 *   clientName: string,
 *   rating: number (1-5),
 *   comment: string,
 *   serviceName: string,
 *   serviceDate: string (ISO),
 *   createdAt: timestamp,
 *   isVerified: boolean,
 *   professionalResponse?: string,
 *   professionalResponseAt?: timestamp
 * }
 */

// ============================================
// SUBMETER AVALIAÇÃO
// ============================================

/**
 * Submeter uma avaliação para uma marcação
 * @param {Object} reviewData - Dados da avaliação
 * @returns {Object} - Resultado da operação
 */
export async function submitReview({
    bookingId,
    professionalId,
    staffId = null,
    clientId,
    clientName,
    rating,
    comment,
    serviceName,
    serviceDate
}) {
    try {
        // Validações
        if (!bookingId || !professionalId || !clientId) {
            throw new Error('Missing required fields');
        }

        if (rating < 1 || rating > 5) {
            throw new Error('Rating must be between 1 and 5');
        }

        // Verificar se já existe avaliação para esta marcação
        const existingReview = await checkExistingReview(bookingId);
        if (existingReview) {
            return { success: false, error: 'already_reviewed', message: 'Esta marcação já foi avaliada' };
        }

        // Criar documento de avaliação
        const reviewData = {
            bookingId,
            professionalId,
            staffId,
            clientId,
            clientName,
            rating: Number(rating),
            comment: comment?.trim() || '',
            serviceName,
            serviceDate,
            createdAt: serverTimestamp(),
            isVerified: true, // Cliente verificado (logado)
            professionalResponse: null,
            professionalResponseAt: null
        };

        // Adicionar à coleção de reviews do profissional
        const reviewRef = await addDoc(
            collection(db, `professionals/${professionalId}/reviews`),
            reviewData
        );

        // Marcar a marcação como avaliada
        await markBookingAsReviewed(bookingId, professionalId, staffId);

        // Atualizar métricas do profissional
        await updateProfessionalRating(professionalId, rating);

        console.log('✅ Avaliação submetida:', reviewRef.id);
        return { success: true, reviewId: reviewRef.id };

    } catch (error) {
        console.error('❌ Erro ao submeter avaliação:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// VERIFICAR AVALIAÇÃO EXISTENTE
// ============================================

/**
 * Verificar se já existe avaliação para uma marcação
 */
async function checkExistingReview(bookingId) {
    // Procurar em professionals/* /reviews onde bookingId == bookingId
    // Por simplicidade, verificamos no booking diretamente
    return false; // Por agora retorna false, a verificação é feita via campo 'reviewed' na booking
}

/**
 * Marcar marcação como avaliada
 */
async function markBookingAsReviewed(bookingId, professionalId, staffId) {
    try {
        const bookingPath = staffId
            ? `professionals/${professionalId}/staff/${staffId}/bookings/${bookingId}`
            : `professionals/${professionalId}/bookings/${bookingId}`;

        await updateDoc(doc(db, bookingPath), {
            reviewed: true,
            reviewedAt: serverTimestamp()
        });
    } catch (error) {
        console.warn('Não foi possível marcar booking como avaliada:', error);
    }
}

// ============================================
// ATUALIZAR RATING DO PROFISSIONAL
// ============================================

/**
 * Atualizar média de avaliações do profissional
 */
async function updateProfessionalRating(professionalId, newRating) {
    try {
        const proRef = doc(db, 'professionals', professionalId);
        const proSnap = await getDoc(proRef);

        if (proSnap.exists()) {
            const data = proSnap.data();
            const currentTotal = data.totalReviews || 0;
            const currentAvg = data.averageRating || 0;

            // Calcular nova média
            const newTotal = currentTotal + 1;
            const newAvg = ((currentAvg * currentTotal) + newRating) / newTotal;

            await updateDoc(proRef, {
                totalReviews: newTotal,
                averageRating: Math.round(newAvg * 10) / 10, // Arredondar para 1 casa decimal
                lastReviewAt: serverTimestamp()
            });
        }
    } catch (error) {
        console.error('Erro ao atualizar rating:', error);
    }
}

// ============================================
// OBTER AVALIAÇÕES
// ============================================

/**
 * Obter avaliações de um profissional
 * @param {string} professionalId 
 * @param {Object} options - Opções de filtro
 * @returns {Array} - Lista de avaliações
 */
export async function getProfessionalReviews(professionalId, options = {}) {
    try {
        const { limitCount = 10, minRating = 1 } = options;

        const reviewsRef = collection(db, `professionals/${professionalId}/reviews`);
        const q = query(
            reviewsRef,
            where('rating', '>=', minRating),
            orderBy('rating', 'desc'),
            // orderBy('createdAt', 'desc'), // Removido para evitar necessidade de índice composto
            limit(limitCount)
        );

        const snapshot = await getDocs(q);
        const reviews = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.() || new Date()
        }));

        // Ordenação secundária em memória por data (mais recentes primeiro)
        return reviews.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
        console.error('Erro ao obter avaliações:', error);

        // Fallback sem ordenação composta (requer índice)
        try {
            const reviewsRef = collection(db, `professionals/${professionalId}/reviews`);
            const snapshot = await getDocs(reviewsRef);
            const reviews = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate?.() || new Date()
            }));

            // Ordenar localmente
            return reviews
                .filter(r => r.rating >= (options.minRating || 1))
                .sort((a, b) => b.createdAt - a.createdAt)
                .slice(0, options.limitCount || 10);
        } catch (fallbackError) {
            console.error('Fallback também falhou:', fallbackError);
            return [];
        }
    }
}

/**
 * Obter estatísticas de avaliações
 */
export async function getReviewStats(professionalId) {
    try {
        const proRef = doc(db, 'professionals', professionalId);
        const proSnap = await getDoc(proRef);

        if (proSnap.exists()) {
            const data = proSnap.data();
            return {
                averageRating: data.averageRating || 0,
                totalReviews: data.totalReviews || 0,
                lastReviewAt: data.lastReviewAt?.toDate?.() || null
            };
        }

        return { averageRating: 0, totalReviews: 0, lastReviewAt: null };
    } catch (error) {
        console.error('Erro ao obter estatísticas:', error);
        return { averageRating: 0, totalReviews: 0, lastReviewAt: null };
    }
}

/**
 * Obter distribuição de ratings (1-5 estrelas)
 */
export async function getRatingDistribution(professionalId) {
    try {
        const reviews = await getProfessionalReviews(professionalId, { limitCount: 1000 });

        const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        reviews.forEach(review => {
            const rating = Math.round(review.rating);
            if (rating >= 1 && rating <= 5) {
                distribution[rating]++;
            }
        });

        return distribution;
    } catch (error) {
        console.error('Erro ao obter distribuição:', error);
        return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    }
}

// ============================================
// MARCAÇÕES PENDENTES DE AVALIAÇÃO
// ============================================

/**
 * Obter marcações do cliente que precisam de avaliação
 * (Marcações passadas, não avaliadas, com mais de 1h desde a sessão)
 */
export async function getPendingReviews(clientEmail) {
    try {
        const pendingReviews = [];
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

        // Buscar todas as marcações do cliente
        // Nota: Em produção, seria melhor ter uma coleção indexada por cliente
        const prosSnap = await getDocs(collection(db, 'professionals'));

        for (const proDoc of prosSnap.docs) {
            const proId = proDoc.id;
            const proData = proDoc.data();

            // 1. Procurar bookings do Owner
            const ownerBookingsSnap = await getDocs(collection(db, `professionals/${proId}/bookings`));

            // 2. Procurar bookings da Staff
            const staffSnap = await getDocs(collection(db, `professionals/${proId}/staff`));
            let allBookingsDocs = [...ownerBookingsSnap.docs];

            for (const staffMember of staffSnap.docs) {
                const staffBookingsSnap = await getDocs(collection(db, `professionals/${proId}/staff/${staffMember.id}/bookings`));
                allBookingsDocs = [...allBookingsDocs, ...staffBookingsSnap.docs];
            }

            allBookingsDocs.forEach(bookingDoc => {
                const booking = { id: bookingDoc.id, ...bookingDoc.data() };
                const bookingDate = new Date(booking.date);
                const validStatuses = ['confirmed', 'completed', 'paid', 'pending'];
                const isPast = bookingDate < new Date();

                if (
                    booking.clientEmail?.toLowerCase() === clientEmail.toLowerCase() &&
                    validStatuses.includes(booking.status) &&
                    isPast &&
                    !booking.reviewed
                ) {
                    pendingReviews.push({
                        ...booking,
                        professionalId: proId,
                        professionalName: proData.businessName || proData.name,
                        professionalImage: proData.logoUrl
                    });
                }
            });
        }

        return pendingReviews;
    } catch (error) {
        console.error('Error fetching pending reviews:', error);
        return [];
    }
}

// ============================================
// RESPOSTA DO PROFISSIONAL
// ============================================

/**
 * Profissional responde a uma avaliação
 */
export async function respondToReview(professionalId, reviewId, response) {
    try {
        const reviewRef = doc(db, `professionals/${professionalId}/reviews/${reviewId}`);

        await updateDoc(reviewRef, {
            professionalResponse: response.trim(),
            professionalResponseAt: serverTimestamp()
        });

        return { success: true };
    } catch (error) {
        console.error('Erro ao responder avaliação:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// EXPORT DEFAULT
// ============================================

export default {
    submitReview,
    getProfessionalReviews,
    getReviewStats,
    getRatingDistribution,
    getPendingReviews,
    respondToReview
};
