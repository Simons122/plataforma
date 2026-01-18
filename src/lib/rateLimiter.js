/**
 * Rate Limiter - Proteção contra Ataques de Força Bruta
 * Previne spam, DDoS e tentativas de login em massa
 */

// Armazena contagens de tentativas por IP/ação
const rateLimitStore = new Map();

// Configurações de rate limiting
const RATE_LIMITS = {
    // Login: 5 tentativas por 15 minutos
    login: {
        maxAttempts: 5,
        windowMs: 15 * 60 * 1000, // 15 minutos
        blockDurationMs: 30 * 60 * 1000 // Bloqueado por 30 minutos
    },
    // Registo: 3 tentativas por hora
    register: {
        maxAttempts: 3,
        windowMs: 60 * 60 * 1000, // 1 hora
        blockDurationMs: 60 * 60 * 1000 // Bloqueado por 1 hora
    },
    // Reset de password: 3 tentativas por hora
    passwordReset: {
        maxAttempts: 3,
        windowMs: 60 * 60 * 1000,
        blockDurationMs: 60 * 60 * 1000
    },
    // Criação de bookings: 10 por hora
    booking: {
        maxAttempts: 10,
        windowMs: 60 * 60 * 1000,
        blockDurationMs: 30 * 60 * 1000
    },
    // Chamadas API gerais: 100 por minuto
    api: {
        maxAttempts: 100,
        windowMs: 60 * 1000,
        blockDurationMs: 5 * 60 * 1000
    },
    // Uploads: 5 por hora
    upload: {
        maxAttempts: 5,
        windowMs: 60 * 60 * 1000,
        blockDurationMs: 60 * 60 * 1000
    }
};

/**
 * Gera uma chave única para rate limiting
 */
function generateKey(action, identifier) {
    return `${action}:${identifier}`;
}

/**
 * Obtém o identificador do utilizador (email, IP simulado, ou user ID)
 */
function getIdentifier(email = null, userId = null) {
    if (userId) return userId;
    if (email) return email.toLowerCase();
    // Em produção, usar IP real do request
    return 'anonymous_' + (typeof window !== 'undefined' ? window.location.hostname : 'server');
}

/**
 * Verifica se uma ação está bloqueada por rate limiting
 * @param {string} action - Tipo de ação (login, register, etc)
 * @param {string} identifier - Email ou ID do utilizador
 * @returns {object} { allowed: boolean, retryAfter: number, message: string }
 */
export function checkRateLimit(action, identifier) {
    const config = RATE_LIMITS[action] || RATE_LIMITS.api;
    const key = generateKey(action, identifier);
    const now = Date.now();

    const entry = rateLimitStore.get(key);

    // Sem registo anterior - permitir
    if (!entry) {
        return { allowed: true, remaining: config.maxAttempts - 1 };
    }

    // Verificar se está bloqueado
    if (entry.blockedUntil && now < entry.blockedUntil) {
        const retryAfter = Math.ceil((entry.blockedUntil - now) / 1000);
        return {
            allowed: false,
            retryAfter,
            message: `Demasiadas tentativas. Tente novamente em ${formatTime(retryAfter)}.`
        };
    }

    // Limpar bloqueio expirado
    if (entry.blockedUntil && now >= entry.blockedUntil) {
        rateLimitStore.delete(key);
        return { allowed: true, remaining: config.maxAttempts - 1 };
    }

    // Verificar janela de tempo
    const windowStart = now - config.windowMs;
    entry.attempts = entry.attempts.filter(timestamp => timestamp > windowStart);

    // Verificar limite
    if (entry.attempts.length >= config.maxAttempts) {
        // Bloquear
        entry.blockedUntil = now + config.blockDurationMs;
        rateLimitStore.set(key, entry);

        const retryAfter = Math.ceil(config.blockDurationMs / 1000);
        return {
            allowed: false,
            retryAfter,
            message: `Demasiadas tentativas. Tente novamente em ${formatTime(retryAfter)}.`
        };
    }

    return {
        allowed: true,
        remaining: config.maxAttempts - entry.attempts.length - 1
    };
}

/**
 * Regista uma tentativa de ação
 * @param {string} action - Tipo de ação
 * @param {string} identifier - Email ou ID do utilizador
 */
export function recordAttempt(action, identifier) {
    const key = generateKey(action, identifier);
    const now = Date.now();

    const entry = rateLimitStore.get(key) || { attempts: [], blockedUntil: null };
    entry.attempts.push(now);
    rateLimitStore.set(key, entry);
}

/**
 * Limpa tentativas após sucesso (ex: login bem sucedido)
 * @param {string} action - Tipo de ação
 * @param {string} identifier - Email ou ID do utilizador
 */
export function clearAttempts(action, identifier) {
    const key = generateKey(action, identifier);
    rateLimitStore.delete(key);
}

/**
 * Formata tempo em formato legível
 */
function formatTime(seconds) {
    if (seconds < 60) return `${seconds} segundos`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minutos`;
    const hours = Math.floor(minutes / 60);
    return `${hours} hora${hours > 1 ? 's' : ''}`;
}

/**
 * Middleware/wrapper para verificar rate limit antes de ação
 * @param {string} action - Tipo de ação
 * @param {string} identifier - Email ou ID
 * @param {Function} callback - Função a executar se permitido
 */
export async function withRateLimit(action, identifier, callback) {
    const check = checkRateLimit(action, identifier);

    if (!check.allowed) {
        throw new Error(check.message);
    }

    recordAttempt(action, identifier);

    try {
        const result = await callback();
        // Sucesso - limpar tentativas para ações como login
        if (['login', 'passwordReset'].includes(action)) {
            clearAttempts(action, identifier);
        }
        return result;
    } catch (error) {
        // Manter as tentativas registadas em caso de erro
        throw error;
    }
}

/**
 * Hook React para rate limiting
 */
export function useRateLimit(action) {
    const checkLimit = (identifier) => checkRateLimit(action, identifier);
    const record = (identifier) => recordAttempt(action, identifier);
    const clear = (identifier) => clearAttempts(action, identifier);

    return { checkLimit, record, clear };
}

/**
 * Obtém estatísticas de rate limiting (para admin)
 */
export function getRateLimitStats() {
    const stats = {
        totalEntries: rateLimitStore.size,
        blockedUsers: 0,
        byAction: {}
    };

    const now = Date.now();

    for (const [key, entry] of rateLimitStore.entries()) {
        const [action] = key.split(':');

        if (!stats.byAction[action]) {
            stats.byAction[action] = { total: 0, blocked: 0 };
        }

        stats.byAction[action].total++;

        if (entry.blockedUntil && now < entry.blockedUntil) {
            stats.blockedUsers++;
            stats.byAction[action].blocked++;
        }
    }

    return stats;
}

export default {
    checkRateLimit,
    recordAttempt,
    clearAttempts,
    withRateLimit,
    useRateLimit,
    getRateLimitStats,
    RATE_LIMITS
};
