/**
 * 🛡️ BOOKLYO SECURITY CENTER
 * ==========================
 * Central de Segurança Máxima - Integra todos os módulos de proteção
 * 
 * Inclui:
 * - Firebase App Check (anti-bot)
 * - Rate Limiting (anti-brute-force)
 * - Audit Logging (compliance RGPD)
 * - Encriptação de dados sensíveis
 * - Sanitização de inputs
 * - Validação de sessões
 */

// Importar todos os módulos de segurança
import { initializeSecurityAppCheck, getAppCheckToken, secureFetch } from './appCheck';
import {
    logAuditEvent,
    logLoginSuccess,
    logLoginFailed,
    logSuspiciousActivity,
    logBookingCreated,
    logRoleChange,
    AUDIT_EVENTS,
    SEVERITY
} from './auditLog';
import {
    checkRateLimit,
    recordAttempt,
    clearAttempts,
    withRateLimit
} from './rateLimiter';
import {
    encryptData,
    decryptData,
    maskEmail,
    maskPhone,
    validatePasswordStrength,
    generateSecureToken
} from './encryption';
import security, {
    sanitizeText,
    sanitizeEmail,
    sanitizePhone,
    sanitizePrice,
    sanitizeDuration,
    sanitizeUrl,
    escapeHtml,
    isSuspicious,
    generateSecureId
} from './security';

// Estado global de segurança
let securityInitialized = false;

/**
 * 🚀 Inicializa todos os sistemas de segurança
 * Chamar no arranque da app (App.jsx ou main.jsx)
 */
export async function initializeSecuritySystems() {
    if (securityInitialized) {
        console.log('🛡️ Sistemas de segurança já inicializados');
        return;
    }

    console.log('🛡️ A inicializar sistemas de segurança...');

    try {
        // 1. Firebase App Check
        initializeSecurityAppCheck();

        // 2. Configurar headers de segurança (para CSP)
        setupSecurityHeaders();

        // 3. Configurar deteção de ameaças
        setupThreatDetection();

        securityInitialized = true;
        console.log('✅ Todos os sistemas de segurança ativos!');

        return true;
    } catch (error) {
        console.error('❌ Erro ao inicializar segurança:', error);
        return false;
    }
}

/**
 * Configura headers de segurança via meta tags
 * NOTA: CSP desativado temporariamente - interferia com Google Auth popup
 */
function setupSecurityHeaders() {
    if (typeof document === 'undefined') return;

    // CSP DESATIVADO - Causava bloqueio do popup do Google Auth
    // O Vercel já configura CSP adequado via headers no vercel.json
    // Deixar comentado para referência futura
    /*
    const cspMeta = document.createElement('meta');
    cspMeta.httpEquiv = 'Content-Security-Policy';
    cspMeta.content = [...].join('; ');
    const existingCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (!existingCSP) {
        document.head.appendChild(cspMeta);
    }
    */

    // X-Content-Type-Options - Este pode ficar ativo, não interfere
    const xctMeta = document.createElement('meta');
    xctMeta.httpEquiv = 'X-Content-Type-Options';
    xctMeta.content = 'nosniff';
    document.head.appendChild(xctMeta);
}

/**
 * Configura deteção de ameaças em tempo real
 */
function setupThreatDetection() {
    if (typeof window === 'undefined') return;

    // Detetar DevTools abertos (anti-debugging básico)
    let devToolsOpen = false;
    const threshold = 160;

    const checkDevTools = () => {
        const widthThreshold = window.outerWidth - window.innerWidth > threshold;
        const heightThreshold = window.outerHeight - window.innerHeight > threshold;

        if (widthThreshold || heightThreshold) {
            if (!devToolsOpen) {
                devToolsOpen = true;
                // Apenas log, não bloquear (pode ser desenvolvimento legítimo)
                if (!import.meta.env.DEV) {
                    logAuditEvent('security.devtools.opened', {}, SEVERITY.WARNING);
                }
            }
        } else {
            devToolsOpen = false;
        }
    };

    // Verificar periodicamente
    setInterval(checkDevTools, 1000);

    // Detetar tentativas de copy/paste em campos sensíveis (opcional)
    document.addEventListener('paste', (e) => {
        const target = e.target;
        if (target.type === 'password') {
            // Prevenir paste em campos de password (segurança adicional)
            // Comentado por default pois pode afetar UX
            // e.preventDefault();
        }
    });

    // Proteger contra clickjacking
    if (window.top !== window.self) {
        // Estamos num iframe - potencial clickjacking
        logSuspiciousActivity('Tentativa de iframe detectada', {
            parentUrl: document.referrer
        });
    }
}

// ============================================
// WRAPPER DE LOGIN SEGURO
// ============================================

/**
 * Wrapper seguro para login com todas as proteções
 * @param {Function} loginFn - Função de login do Firebase
 * @param {string} email - Email do utilizador
 * @param {string} password - Password
 */
export async function secureLogin(loginFn, email, password) {
    const sanitizedEmail = sanitizeEmail(email);

    // 1. Verificar rate limit
    const rateCheck = checkRateLimit('login', sanitizedEmail);
    if (!rateCheck.allowed) {
        await logLoginFailed(sanitizedEmail, 'rate_limit');
        throw new Error(rateCheck.message);
    }

    // 2. Registar tentativa
    recordAttempt('login', sanitizedEmail);

    // 3. Verificar padrões suspeitos
    if (isSuspicious(email) || isSuspicious(password)) {
        await logSuspiciousActivity('Login com padrões suspeitos', { email: sanitizedEmail });
        throw new Error('Dados inválidos detectados');
    }

    try {
        // 4. Executar login
        const result = await loginFn(sanitizedEmail, password);

        // 5. Sucesso - limpar rate limit e registar
        clearAttempts('login', sanitizedEmail);
        await logLoginSuccess(result.user.uid, sanitizedEmail);

        return result;
    } catch (error) {
        // 6. Falha - registar
        await logLoginFailed(sanitizedEmail, error.code || error.message);
        throw error;
    }
}

/**
 * Wrapper seguro para registo
 */
export async function secureRegister(registerFn, email, password, additionalData = {}) {
    const sanitizedEmail = sanitizeEmail(email);

    // 1. Verificar rate limit
    const rateCheck = checkRateLimit('register', sanitizedEmail);
    if (!rateCheck.allowed) {
        throw new Error(rateCheck.message);
    }

    // 2. Validar força da password
    const passwordCheck = validatePasswordStrength(password);
    if (!passwordCheck.valid) {
        throw new Error(`Password fraca: ${passwordCheck.issues.join(', ')}`);
    }

    // 3. Verificar padrões suspeitos
    if (isSuspicious(email) || isSuspicious(JSON.stringify(additionalData))) {
        await logSuspiciousActivity('Registo com padrões suspeitos', { email: sanitizedEmail });
        throw new Error('Dados inválidos detectados');
    }

    recordAttempt('register', sanitizedEmail);

    try {
        const result = await registerFn(sanitizedEmail, password);

        await logAuditEvent(
            AUDIT_EVENTS.PROFESSIONAL_CREATED,
            { userId: result.user.uid, email: sanitizedEmail },
            SEVERITY.INFO
        );

        return result;
    } catch (error) {
        await logAuditEvent(
            'auth.register.failed',
            { email: sanitizedEmail, error: error.code },
            SEVERITY.WARNING
        );
        throw error;
    }
}

/**
 * Wrapper seguro para criação de booking
 */
export async function secureCreateBooking(createFn, bookingData) {
    const clientEmail = sanitizeEmail(bookingData.clientEmail);

    // Rate limit por email do cliente
    const rateCheck = checkRateLimit('booking', clientEmail);
    if (!rateCheck.allowed) {
        throw new Error(rateCheck.message);
    }

    // Sanitizar todos os campos
    const sanitizedData = {
        ...bookingData,
        clientName: sanitizeText(bookingData.clientName, 100),
        clientEmail: clientEmail,
        clientPhone: sanitizePhone(bookingData.clientPhone),
        notes: sanitizeText(bookingData.notes || '', 500)
    };

    // Verificar suspeitas
    if (isSuspicious(JSON.stringify(sanitizedData))) {
        await logSuspiciousActivity('Booking com dados suspeitos', sanitizedData);
        throw new Error('Dados inválidos');
    }

    recordAttempt('booking', clientEmail);

    const result = await createFn(sanitizedData);

    await logBookingCreated(result.id, bookingData.professionalId, {
        name: sanitizedData.clientName
    });

    return result;
}

// ============================================
// EXPORTS
// ============================================

export {
    // App Check
    getAppCheckToken,
    secureFetch,

    // Audit
    logAuditEvent,
    logSuspiciousActivity,
    logRoleChange,
    AUDIT_EVENTS,
    SEVERITY,

    // Rate Limiting
    checkRateLimit,
    withRateLimit,

    // Encryption
    encryptData,
    decryptData,
    maskEmail,
    maskPhone,
    validatePasswordStrength,
    generateSecureToken,

    // Sanitization
    sanitizeText,
    sanitizeEmail,
    sanitizePhone,
    sanitizePrice,
    sanitizeDuration,
    sanitizeUrl,
    escapeHtml,
    isSuspicious,
    generateSecureId
};

export default {
    initialize: initializeSecuritySystems,
    login: secureLogin,
    register: secureRegister,
    createBooking: secureCreateBooking,

    // Módulos
    audit: { logAuditEvent, logSuspiciousActivity, AUDIT_EVENTS, SEVERITY },
    rateLimit: { checkRateLimit, withRateLimit },
    crypto: { encryptData, decryptData, maskEmail, maskPhone },
    sanitize: { sanitizeText, sanitizeEmail, sanitizePhone, escapeHtml, isSuspicious }
};
