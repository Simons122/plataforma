/**
 * Security Utilities for Booklyo
 * Prevents XSS, SQL Injection, and other common attacks
 */

// HTML entities to escape
const htmlEntities = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
};

/**
 * Escapa caracteres HTML perigosos para prevenir XSS
 * @param {string} str - String a sanitizar
 * @returns {string} String segura
 */
export function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[&<>"'`=/]/g, char => htmlEntities[char]);
}

/**
 * Remove todas as tags HTML de uma string
 * @param {string} str - String a limpar
 * @returns {string} String sem HTML
 */
export function stripHtml(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/<[^>]*>/g, '').trim();
}

/**
 * Sanitiza input de texto (nome, descrição, etc)
 * Remove HTML e limita tamanho
 * @param {string} input - Input do utilizador
 * @param {number} maxLength - Tamanho máximo permitido
 * @returns {string} Input sanitizado
 */
export function sanitizeText(input, maxLength = 255) {
    if (typeof input !== 'string') return '';

    // Remove HTML
    let clean = stripHtml(input);

    // Remove caracteres de controlo
    clean = clean.replace(/[\x00-\x1F\x7F]/g, '');

    // Limita tamanho
    clean = clean.substring(0, maxLength);

    // Trim whitespace
    return clean.trim();
}

/**
 * Sanitiza email
 * @param {string} email - Email a validar
 * @returns {string} Email sanitizado ou string vazia se inválido
 */
export function sanitizeEmail(email) {
    if (typeof email !== 'string') return '';

    const clean = email.toLowerCase().trim();

    // Validação básica de formato
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clean)) return '';

    // Limite de tamanho (RFC 5321)
    if (clean.length > 254) return '';

    return clean;
}

/**
 * Sanitiza número de telefone
 * @param {string} phone - Telefone a sanitizar
 * @returns {string} Telefone apenas com dígitos e +
 */
export function sanitizePhone(phone) {
    if (typeof phone !== 'string') return '';

    // Mantém apenas dígitos, + e espaços
    let clean = phone.replace(/[^\d\s+]/g, '');

    // Limite de tamanho
    return clean.substring(0, 20).trim();
}

/**
 * Sanitiza preço
 * @param {number|string} price - Preço a validar
 * @returns {number} Preço válido ou 0
 */
export function sanitizePrice(price) {
    const num = parseFloat(price);
    if (isNaN(num) || num < 0) return 0;
    if (num > 99999) return 99999;
    return Math.round(num * 100) / 100; // 2 casas decimais
}

/**
 * Sanitiza duração (minutos)
 * @param {number|string} duration - Duração a validar
 * @returns {number} Duração válida (5-480 min)
 */
export function sanitizeDuration(duration) {
    const num = parseInt(duration, 10);
    if (isNaN(num) || num < 5) return 30; // default 30 min
    if (num > 480) return 480; // max 8 horas
    return num;
}

/**
 * Valida e sanitiza URL
 * @param {string} url - URL a validar
 * @returns {string} URL segura ou string vazia
 */
export function sanitizeUrl(url) {
    if (typeof url !== 'string') return '';

    try {
        const parsed = new URL(url);
        // Apenas permitir http e https
        if (!['http:', 'https:'].includes(parsed.protocol)) return '';
        return parsed.href;
    } catch {
        return '';
    }
}

/**
 * Gera um ID seguro aleatório
 * @param {number} length - Tamanho do ID
 * @returns {string} ID aleatório
 */
export function generateSecureId(length = 16) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const randomValues = new Uint32Array(length);
    crypto.getRandomValues(randomValues);
    for (let i = 0; i < length; i++) {
        result += chars[randomValues[i] % chars.length];
    }
    return result;
}

/**
 * Verifica se uma string contém padrões suspeitos (SQL injection, etc)
 * @param {string} str - String a verificar
 * @returns {boolean} true se suspeito
 */
export function isSuspicious(str) {
    if (typeof str !== 'string') return false;

    const patterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE)\b)/i,
        /<script/i,
        /javascript:/i,
        /on\w+\s*=/i, // onclick=, onerror=, etc
        /data:/i,
        /vbscript:/i
    ];

    return patterns.some(pattern => pattern.test(str));
}

export default {
    escapeHtml,
    stripHtml,
    sanitizeText,
    sanitizeEmail,
    sanitizePhone,
    sanitizePrice,
    sanitizeDuration,
    sanitizeUrl,
    generateSecureId,
    isSuspicious
};
