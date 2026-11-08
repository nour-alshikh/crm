import type { Locale } from "@/types/generated";

export const locales = ["en", "ar"] as const satisfies readonly Locale[];

export const defaultLocale: Locale = "en";

export const LOCALE_STORAGE_KEY = "locale";

export const localeMeta: Record<Locale, { label: string; dir: "ltr" | "rtl" }> = {
  en: { label: "English", dir: "ltr" },
  ar: { label: "العربية", dir: "rtl" },
};

export function isLocale(value: string | null | undefined): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}

export function dirFor(locale: Locale): "ltr" | "rtl" {
  return localeMeta[locale].dir;
}
