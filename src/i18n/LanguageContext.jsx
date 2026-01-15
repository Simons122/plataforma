/**
 * 🌍 Language Context
 * Gerencia o idioma da aplicação (PT/EN)
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translations } from './translations';

const LanguageContext = createContext();

// Detectar idioma do navegador
const detectBrowserLanguage = () => {
    const browserLang = navigator.language || navigator.userLanguage;
    // Prioriza português para pt, pt-PT, pt-BR
    if (browserLang.startsWith('pt')) return 'pt';
    // Default para inglês
    return 'en';
};

// Obter idioma guardado ou detectar do browser
const getInitialLanguage = () => {
    const saved = localStorage.getItem('app_language');
    if (saved && ['pt', 'en'].includes(saved)) {
        return saved;
    }
    return detectBrowserLanguage();
};

export function LanguageProvider({ children }) {
    const [language, setLanguage] = useState(getInitialLanguage);
    const [t, setT] = useState(translations[getInitialLanguage()]);

    // Atualizar traduções quando o idioma muda
    useEffect(() => {
        setT(translations[language]);
        localStorage.setItem('app_language', language);
        // Atualizar atributo lang do HTML para SEO/acessibilidade
        document.documentElement.lang = language;
    }, [language]);

    // Função para alternar idioma
    const toggleLanguage = useCallback(() => {
        setLanguage(prev => prev === 'pt' ? 'en' : 'pt');
    }, []);

    // Função para definir idioma específico
    const setLang = useCallback((lang) => {
        if (['pt', 'en'].includes(lang)) {
            setLanguage(lang);
        }
    }, []);

    // Função de tradução com suporte a paths aninhados (e.g., "nav.dashboard")
    const translate = useCallback((path, fallback = '') => {
        const keys = path.split('.');
        let result = t;

        for (const key of keys) {
            if (result && typeof result === 'object' && key in result) {
                result = result[key];
            } else {
                // Se não encontrar, tenta no idioma alternativo
                const altLang = language === 'pt' ? 'en' : 'pt';
                let altResult = translations[altLang];
                for (const k of keys) {
                    if (altResult && typeof altResult === 'object' && k in altResult) {
                        altResult = altResult[k];
                    } else {
                        return fallback || path;
                    }
                }
                return typeof altResult === 'string' ? altResult : fallback || path;
            }
        }

        return typeof result === 'string' ? result : fallback || path;
    }, [t, language]);

    const value = {
        language,
        setLanguage: setLang,
        toggleLanguage,
        translations: t, // Objeto de traduções completo
        t: translate,    // Agora 't' é a função, como esperado em i18n
        translate,       // Manter para compatibilidade
        isPortuguese: language === 'pt',
        isEnglish: language === 'en',
    };

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
}

// Hook para usar o contexto
export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};

// Hook simplificado para traduções
export const useTranslation = () => {
    const { t, translate, language } = useLanguage();
    return { t, translate, language };
};

export default LanguageContext;
