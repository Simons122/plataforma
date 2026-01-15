/**
 * Encriptação de Dados Sensíveis
 * Usa Web Crypto API para encriptação AES-256-GCM
 */

// Chave de encriptação (em produção, usar variável de ambiente)
const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'booklyo-default-key-change-this';

/**
 * Gera uma chave de encriptação a partir de uma string
 */
async function getKey(keyString) {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(keyString);

    // Criar hash SHA-256 da chave
    const hashBuffer = await crypto.subtle.digest('SHA-256', keyData);

    // Importar como chave AES
    return crypto.subtle.importKey(
        'raw',
        hashBuffer,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

/**
 * Encripta dados sensíveis
 * @param {string} data - Dados a encriptar
 * @returns {Promise<string>} Dados encriptados em Base64
 */
export async function encryptData(data) {
    if (!data || typeof data !== 'string') {
        throw new Error('Dados inválidos para encriptação');
    }

    try {
        const key = await getKey(ENCRYPTION_KEY);
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(data);

        // Gerar IV aleatório (12 bytes para AES-GCM)
        const iv = crypto.getRandomValues(new Uint8Array(12));

        // Encriptar
        const encryptedBuffer = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            key,
            dataBuffer
        );

        // Combinar IV + dados encriptados
        const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
        combined.set(iv);
        combined.set(new Uint8Array(encryptedBuffer), iv.length);

        // Converter para Base64
        return btoa(String.fromCharCode(...combined));
    } catch (error) {
        console.error('❌ Erro ao encriptar:', error);
        throw new Error('Falha na encriptação');
    }
}

/**
 * Desencripta dados
 * @param {string} encryptedData - Dados encriptados em Base64
 * @returns {Promise<string>} Dados originais
 */
export async function decryptData(encryptedData) {
    if (!encryptedData || typeof encryptedData !== 'string') {
        throw new Error('Dados encriptados inválidos');
    }

    try {
        const key = await getKey(ENCRYPTION_KEY);

        // Converter de Base64
        const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));

        // Extrair IV (primeiros 12 bytes)
        const iv = combined.slice(0, 12);
        const encryptedBuffer = combined.slice(12);

        // Desencriptar
        const decryptedBuffer = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            key,
            encryptedBuffer
        );

        const decoder = new TextDecoder();
        return decoder.decode(decryptedBuffer);
    } catch (error) {
        console.error('❌ Erro ao desencriptar:', error);
        throw new Error('Falha na desencriptação');
    }
}

/**
 * Hash de password usando SHA-256 (para verificações, não armazenamento)
 * NOTA: O Firebase Auth já faz hash de passwords de forma segura
 */
export async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Gera token seguro
 * @param {number} length - Tamanho do token
 * @returns {string} Token aleatório
 */
export function generateSecureToken(length = 32) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Mascara dados sensíveis para display
 * Ex: email@domain.com -> e***l@d***n.com
 */
export function maskEmail(email) {
    if (!email || typeof email !== 'string') return '';
    const [local, domain] = email.split('@');
    if (!domain) return email;

    const maskString = (str) => {
        if (str.length <= 2) return str[0] + '*';
        return str[0] + '*'.repeat(Math.min(str.length - 2, 3)) + str[str.length - 1];
    };

    const [domainName, tld] = domain.split('.');
    return `${maskString(local)}@${maskString(domainName)}.${tld || 'com'}`;
}

/**
 * Mascara número de telefone
 * Ex: +351912345678 -> +351***5678
 */
export function maskPhone(phone) {
    if (!phone || typeof phone !== 'string') return '';
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 4) return phone;

    const prefix = phone.startsWith('+') ? phone.substring(0, 4) : '';
    const suffix = digits.slice(-4);
    return `${prefix}***${suffix}`;
}

/**
 * Valida força de password
 * @returns {object} { valid: boolean, score: number, issues: string[] }
 */
export function validatePasswordStrength(password) {
    const issues = [];
    let score = 0;

    if (!password || password.length < 8) {
        issues.push('Mínimo 8 caracteres');
    } else {
        score += 1;
    }

    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;

    if (!/[A-Z]/.test(password)) {
        issues.push('Incluir letra maiúscula');
    } else {
        score += 1;
    }

    if (!/[a-z]/.test(password)) {
        issues.push('Incluir letra minúscula');
    } else {
        score += 1;
    }

    if (!/[0-9]/.test(password)) {
        issues.push('Incluir número');
    } else {
        score += 1;
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        issues.push('Incluir caractere especial');
    } else {
        score += 1;
    }

    // Verificar padrões comuns
    const commonPatterns = ['password', '123456', 'qwerty', 'admin', 'letmein'];
    if (commonPatterns.some(p => password.toLowerCase().includes(p))) {
        issues.push('Evitar padrões comuns');
        score = Math.max(0, score - 2);
    }

    return {
        valid: issues.length === 0 && score >= 5,
        score: Math.min(score, 7),
        maxScore: 7,
        issues,
        strength: score <= 2 ? 'fraca' : score <= 4 ? 'média' : score <= 5 ? 'boa' : 'forte'
    };
}

export default {
    encryptData,
    decryptData,
    hashPassword,
    generateSecureToken,
    maskEmail,
    maskPhone,
    validatePasswordStrength
};
