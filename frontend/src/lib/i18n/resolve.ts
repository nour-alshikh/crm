import type { Locale } from "@/types/locale";
import type { TranslatableText } from "@/types/post";
import { defaultLocale } from "./config";

/**
 * Resolves a { en, ar } translation object to a single display string for
 * the given locale, falling back to the default locale — mirrors the
 * backend's `HasTranslations::translate()` (see docs/i18n.md).
 */
export function resolveTranslation(value: TranslatableText, locale: Locale): string {
  return value[locale] || value[defaultLocale] || "";
}
