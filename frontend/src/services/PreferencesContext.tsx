import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type ThemeMode = 'light' | 'dark';
export type Language = 'ru' | 'en';

interface PreferencesContextValue {
  theme: ThemeMode;
  language: Language;
  toggleTheme: () => void;
  toggleLanguage: () => void;
  setLanguage: (language: Language) => void;
}

const PreferencesContext = createContext<PreferencesContextValue | undefined>(undefined);

const readPreference = <T extends string>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;
  const value = window.localStorage.getItem(key) as T | null;
  return value ?? fallback;
};

export const PreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeMode>(() => readPreference<ThemeMode>('doclink-theme', 'light'));
  const [language, setLanguage] = useState<Language>(() => readPreference<Language>('doclink-language', 'ru'));

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    window.localStorage.setItem('doclink-theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('lang', language);
    window.localStorage.setItem('doclink-language', language);
  }, [language]);

  const value = useMemo<PreferencesContextValue>(
    () => ({
      theme,
      language,
      toggleTheme: () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light')),
      toggleLanguage: () => setLanguage((prev) => (prev === 'ru' ? 'en' : 'ru')),
      setLanguage,
    }),
    [theme, language],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
};

export const usePreferences = (): PreferencesContextValue => {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within PreferencesProvider');
  }
  return context;
};


