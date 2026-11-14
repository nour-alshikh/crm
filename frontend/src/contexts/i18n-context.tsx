"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Locale } from "@/types/locale";
import { api } from "@/lib/api/client";
import { useAuth } from "@/contexts/auth-context";
import { defaultLocale, isLocale, LOCALE_STORAGE_KEY } from "@/lib/i18n/config";
import en from "@/lib/i18n/locales/en.json";
import ar from "@/lib/i18n/locales/ar.json";

type Dictionary = typeof en;
const dictionaries: Record<Locale, Dictionary> = { en, ar };

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

function readInitialLocale(): Locale {
  if (typeof window === "undefined") return defaultLocale;
  const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  return isLocale(stored) ? stored : defaultLocale;
}

function lookup(dictionary: Dictionary, key: string): string | undefined {
  return key
    .split(".")
    .reduce<unknown>(
      (node, segment) =>
        node && typeof node === "object" ? (node as Record<string, unknown>)[segment] : undefined,
      dictionary,
    ) as string | undefined;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readInitialLocale);
  const { user } = useAuth();

  // First load only: an authenticated user's saved preference wins over
  // whatever was (or wasn't) in localStorage on this device.
  useEffect(() => {
    if (!user?.locale) return;
    if (window.localStorage.getItem(LOCALE_STORAGE_KEY)) return;
    if (isLocale(user.locale)) {
      // Syncing from an external source (the auth query, which resolves
      // async after mount) — not a value derivable during render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocaleState(user.locale);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const setLocale = useCallback(
    (next: Locale) => {
      setLocaleState(next);
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next);

      if (user) {
        api.PATCH("/user/locale", { body: { locale: next } }).catch(() => {
          // Best-effort — the UI already switched, and this is just the
          // server-side persisted preference for next login.
        });
      }
    },
    [user],
  );

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const template =
        lookup(dictionaries[locale], key) ?? lookup(dictionaries[defaultLocale], key) ?? key;

      if (!vars) return template;

      return Object.entries(vars).reduce(
        (result, [name, value]) => result.replaceAll(`{${name}}`, String(value)),
        template,
      );
    },
    [locale],
  );

  return <I18nContext.Provider value={{ locale, setLocale, t }}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }

  return context;
}
