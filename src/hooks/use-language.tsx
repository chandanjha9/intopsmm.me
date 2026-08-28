import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  translate,
  type LanguageCode,
} from "@/lib/i18n/languages";

type LanguageContextValue = {
  language: LanguageCode;
  setLanguage: (code: LanguageCode) => void;
  t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(DEFAULT_LANGUAGE);

  useEffect(() => {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY) as LanguageCode | null;
    if (stored) setLanguageState(stored);
  }, []);

  const setLanguage = useCallback((code: LanguageCode) => {
    setLanguageState(code);
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({ language, setLanguage, t: (key: string) => translate(language, key) }),
    [language, setLanguage]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (ctx) return ctx;
  return {
    language: DEFAULT_LANGUAGE,
    setLanguage: () => {},
    t: (key: string) => translate(DEFAULT_LANGUAGE, key),
  };
}
