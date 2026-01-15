/**
 * Sistema de Audit Logging - Regista Todas as Operações Críticas
 * Essencial para compliance RGPD e segurança máxima
 */
import { collection, addDoc, serverTimestamp, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db, auth } from './firebase';

// Tipos de eventos de auditoria
export const AUDIT_EVENTS = {
    // Autenticação
    LOGIN_SUCCESS: 'auth.login.success',
    LOGIN_FAILED: 'auth.login.failed',
    LOGOUT: 'auth.logout',
    PASSWORD_RESET: 'auth.password.reset',
    PASSWORD_CHANGED: 'auth.password.changed',

    // Profissionais
    PROFESSIONAL_CREATED: 'professional.created',
    PROFESSIONAL_UPDATED: 'professional.updated',
    PROFESSIONAL_DELETED: 'professional.deleted',
    PROFESSIONAL_PAYMENT_UPDATED: 'professional.payment.updated',

    // Serviços
    SERVICE_CREATED: 'service.created',
    SERVICE_UPDATED: 'service.updated',
    SERVICE_DELETED: 'service.deleted',

    // Marcações
    BOOKING_CREATED: 'booking.created',
    BOOKING_UPDATED: 'booking.updated',
    BOOKING_CANCELLED: 'booking.cancelled',

    // Staff
    STAFF_CREATED: 'staff.created',
    STAFF_UPDATED: 'staff.updated',
    STAFF_DELETED: 'staff.deleted',

    // Admin
    ADMIN_ROLE_CHANGED: 'admin.role.changed',
    ADMIN_SETTINGS_CHANGED: 'admin.settings.changed',
    ADMIN_USER_BLOCKED: 'admin.user.blocked',

    // Segurança
    SECURITY_SUSPICIOUS_ACTIVITY: 'security.suspicious',
    SECURITY_RATE_LIMIT_HIT: 'security.ratelimit',
    SECURITY_INVALID_ACCESS: 'security.invalid.access',

    // Dados
    DATA_EXPORT: 'data.export',
    DATA_DELETE_REQUEST: 'data.delete.request'
};

// Níveis de severidade
export const SEVERITY = {
    INFO: 'info',
    WARNING: 'warning',
    ERROR: 'error',
    CRITICAL: 'critical'
};

/**
 * Regista um evento de auditoria
 * @param {string} eventType - Tipo de evento (use AUDIT_EVENTS)
 * @param {object} data - Dados adicionais do evento
 * @param {string} severity - Nível de severidade
 */
export async function logAuditEvent(eventType, data = {}, severity = SEVERITY.INFO) {
    try {
        const currentUser = auth.currentUser;

        const auditEntry = {
            eventType,
            severity,
            timestamp: serverTimestamp(),
            clientTimestamp: new Date().toISOString(),
            userId: currentUser?.uid || 'anonymous',
            userEmail: currentUser?.email || 'unknown',
            data: sanitizeAuditData(data),
            metadata: {
                userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
                language: typeof navigator !== 'undefined' ? navigator.language : 'pt-PT',
                platform: typeof navigator !== 'undefined' ? navigator.platform : 'server',
                screenSize: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'N/A',
                url: typeof window !== 'undefined' ? window.location.href : 'N/A',
                referrer: typeof document !== 'undefined' ? document.referrer : 'N/A'
            }
        };

        await addDoc(collection(db, 'audit_logs'), auditEntry);

        // Log local para debugging
        if (import.meta.env.DEV) {
            console.log(`📋 [AUDIT] ${eventType}:`, auditEntry);
        }

        // Alertar para eventos críticos
        if (severity === SEVERITY.CRITICAL) {
            console.error(`🚨 [CRITICAL AUDIT EVENT] ${eventType}:`, data);
            // Aqui poderia enviar email/SMS para admin
        }

        return true;
    } catch (error) {
        console.error('❌ Erro ao registar evento de auditoria:', error);
        return false;
    }
}

/**
 * Sanitiza dados para não guardar informação sensível
 */
function sanitizeAuditData(data) {
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'creditCard', 'cvv'];
    const sanitized = { ...data };

    for (const field of sensitiveFields) {
        if (sanitized[field]) {
            sanitized[field] = '[REDACTED]';
        }
    }

    // Truncar strings muito longas
    for (const key in sanitized) {
        if (typeof sanitized[key] === 'string' && sanitized[key].length > 500) {
            sanitized[key] = sanitized[key].substring(0, 500) + '...[truncated]';
        }
    }

    return sanitized;
}

/**
 * Obtém logs de auditoria (apenas para admins)
 */
export async function getAuditLogs(filters = {}, maxResults = 50) {
    try {
        let q = query(
            collection(db, 'audit_logs'),
            orderBy('timestamp', 'desc'),
            limit(maxResults)
        );

        if (filters.userId) {
            q = query(q, where('userId', '==', filters.userId));
        }

        if (filters.eventType) {
            q = query(q, where('eventType', '==', filters.eventType));
        }

        if (filters.severity) {
            q = query(q, where('severity', '==', filters.severity));
        }

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('❌ Erro ao obter logs de auditoria:', error);
        return [];
    }
}

/**
 * Regista login com sucesso
 */
export async function logLoginSuccess(userId, email) {
    return logAuditEvent(AUDIT_EVENTS.LOGIN_SUCCESS, { userId, email }, SEVERITY.INFO);
}

/**
 * Regista tentativa de login falhada
 */
export async function logLoginFailed(email, reason) {
    return logAuditEvent(AUDIT_EVENTS.LOGIN_FAILED, { email, reason }, SEVERITY.WARNING);
}

/**
 * Regista atividade suspeita
 */
export async function logSuspiciousActivity(description, data = {}) {
    return logAuditEvent(AUDIT_EVENTS.SECURITY_SUSPICIOUS_ACTIVITY, { description, ...data }, SEVERITY.CRITICAL);
}

/**
 * Regista alteração de dados de profissional
 */
export async function logProfessionalUpdate(professionalId, changes) {
    return logAuditEvent(AUDIT_EVENTS.PROFESSIONAL_UPDATED, { professionalId, changes }, SEVERITY.INFO);
}

/**
 * Regista criação de marcação
 */
export async function logBookingCreated(bookingId, professionalId, clientInfo) {
    return logAuditEvent(AUDIT_EVENTS.BOOKING_CREATED, {
        bookingId,
        professionalId,
        clientName: clientInfo.name
    }, SEVERITY.INFO);
}

/**
 * Regista alteração de role de admin
 */
export async function logRoleChange(targetUserId, oldRole, newRole, changedBy) {
    return logAuditEvent(AUDIT_EVENTS.ADMIN_ROLE_CHANGED, {
        targetUserId,
        oldRole,
        newRole,
        changedBy
    }, SEVERITY.WARNING);
}

export default {
    AUDIT_EVENTS,
    SEVERITY,
    logAuditEvent,
    getAuditLogs,
    logLoginSuccess,
    logLoginFailed,
    logSuspiciousActivity,
    logProfessionalUpdate,
    logBookingCreated,
    logRoleChange
};
