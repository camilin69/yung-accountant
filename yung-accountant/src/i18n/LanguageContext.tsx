import React, { createContext, useContext, useState, useCallback } from 'react';
import { type Language, translations, interpolate } from './translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'es-CO',
  setLanguage: () => {},
  t: (key: string) => key,
});

const STORAGE_KEY = 'yung-accountant-lang';

function detectLanguage(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'en-US' || stored === 'es-CO') return stored;
  } catch {}
  // Detect from browser
  if (typeof navigator !== 'undefined' && navigator.language?.startsWith('es')) {
    return 'es-CO';
  }
  return 'en-US';
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(detectLanguage);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try { localStorage.setItem(STORAGE_KEY, lang); } catch {}
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const value = translations[language]?.[key];
      if (!value) {
        // Fallback to English, then to the key itself
        const fallback = translations['en-US']?.[key];
        return interpolate(fallback || key, vars);
      }
      return interpolate(value, vars);
    },
    [language],
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useTranslation() {
  return useContext(LanguageContext);
}

export type { Language };
