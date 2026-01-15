/**
 * Firebase App Check - Proteção Máxima contra Apps Não Autorizadas
 * Bloqueia acesso de bots, scripts e aplicações maliciosas
 */
import { initializeAppCheck, ReCaptchaV3Provider, getToken } from 'firebase/app-check';
import { getApp } from 'firebase/app';

// Estado do App Check
let appCheckInstance = null;
let isInitialized = false;

/**
 * Inicializa o Firebase App Check com reCAPTCHA v3
 * IMPORTANTE: Configure a chave em VITE_RECAPTCHA_SITE_KEY
 */
export function initializeSecurityAppCheck() {
    if (isInitialized) {
        console.log('🛡️ App Check já inicializado');
        return appCheckInstance;
    }

    try {
        const app = getApp();
        const recaptchaKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

        if (!recaptchaKey) {
            console.warn('⚠️ VITE_RECAPTCHA_SITE_KEY não configurada - App Check desativado');
            console.warn('📋 Para ativar, adicione a chave do reCAPTCHA v3 ao .env');
            return null;
        }

        // Ativar modo debug em desenvolvimento
        if (import.meta.env.DEV) {
            self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
        }

        appCheckInstance = initializeAppCheck(app, {
            provider: new ReCaptchaV3Provider(recaptchaKey),
            isTokenAutoRefreshEnabled: true
        });

        isInitialized = true;
        console.log('🛡️ App Check inicializado com sucesso!');

        return appCheckInstance;
    } catch (error) {
        console.error('❌ Erro ao inicializar App Check:', error);
        return null;
    }
}

/**
 * Obtém token de App Check para chamadas API
 * Use este token em headers de autenticação extra
 */
export async function getAppCheckToken() {
    if (!appCheckInstance) {
        console.warn('⚠️ App Check não inicializado');
        return null;
    }

    try {
        const tokenResult = await getToken(appCheckInstance, false);
        return tokenResult.token;
    } catch (error) {
        console.error('❌ Erro ao obter token App Check:', error);
        return null;
    }
}

/**
 * Decorator para chamadas fetch com App Check
 * Adiciona automaticamente o token de segurança
 */
export async function secureFetch(url, options = {}) {
    const appCheckToken = await getAppCheckToken();

    const headers = {
        ...options.headers,
        'Content-Type': 'application/json',
    };

    // Adiciona token App Check se disponível
    if (appCheckToken) {
        headers['X-Firebase-AppCheck'] = appCheckToken;
    }

    return fetch(url, {
        ...options,
        headers
    });
}

export default {
    initializeSecurityAppCheck,
    getAppCheckToken,
    secureFetch
};
