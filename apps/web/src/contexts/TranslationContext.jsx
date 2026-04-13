import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { translations } from '@/lib/translations.js';

const TranslationContext = createContext();
const SUPPORTED_LANGUAGES = ['DE', 'EN'];

export const useTranslation = () => useContext(TranslationContext);

export const TranslationProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    const savedLanguage = localStorage.getItem('language');
    return SUPPORTED_LANGUAGES.includes(savedLanguage) ? savedLanguage : 'DE';
  });

  useEffect(() => {
    console.log('🔄 useEffect triggered in TranslationContext (Save LocalStorage)', { language });
    localStorage.setItem('language', language);
    document.documentElement.lang = language === 'EN' ? 'en' : 'de';
  }, [language]);

  const changeLanguage = useCallback((nextLanguage) => {
    setLanguage(SUPPORTED_LANGUAGES.includes(nextLanguage) ? nextLanguage : 'DE');
  }, []);

  const t = useCallback((key, params = {}) => {
    const template = translations[language]?.[key] || translations.DE[key] || key;
    return Object.entries(params).reduce(
      (value, [paramKey, paramValue]) => value.replaceAll(`{{${paramKey}}}`, paramValue),
      template
    );
  }, [language]);

  return (
    <TranslationContext.Provider value={{ language, setLanguage: changeLanguage, t, supportedLanguages: SUPPORTED_LANGUAGES }}>
      {children}
    </TranslationContext.Provider>
  );
};
