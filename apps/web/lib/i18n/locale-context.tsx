"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { type Locale, parseLocale } from "@drop/shared";
import { translations, type TranslationKey } from "./translations";

const LOCALE_KEY = "drop_locale";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ko");

  useEffect(() => {
    const stored = parseLocale(localStorage.getItem(LOCALE_KEY));
    setLocaleState(stored);
    document.documentElement.lang = stored;
  }, []);

  function setLocale(next: Locale) {
    setLocaleState(next);
    localStorage.setItem(LOCALE_KEY, next);
    document.documentElement.lang = next;
  }

  function t(key: TranslationKey): string {
    return translations[key][locale];
  }

  return <LocaleContext.Provider value={{ locale, setLocale, t }}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
