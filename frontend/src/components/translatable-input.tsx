"use client";

import { useState } from "react";
import type { Locale } from "@/types/generated";
import {
  locales as allLocales,
  localeMeta,
  dirFor,
  defaultLocale as configDefaultLocale,
} from "@/lib/i18n/config";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export type TranslatableValue = Partial<Record<Locale, string>>;

interface TranslatableInputProps {
  value: TranslatableValue;
  onChange: (value: TranslatableValue) => void;
  /** Which locale tabs to show — defaults to every locale the app supports. */
  locales?: readonly Locale[];
  /** The one locale that's required; its tab is marked and validated elsewhere. */
  defaultLocale?: Locale;
  errors?: Partial<Record<Locale, string>>;
  placeholder?: Partial<Record<Locale, string>>;
  disabled?: boolean;
  id?: string;
}

/**
 * A tab strip of one text input per locale, all mounted at once (switching
 * tabs just toggles visibility, so nothing is lost), backed by a single
 * `{ locale: string }` value — see docs/i18n.md. `dir` on each input
 * follows that locale's own writing direction regardless of the page's.
 */
export function TranslatableInput({
  value,
  onChange,
  locales = allLocales,
  defaultLocale = configDefaultLocale,
  errors,
  placeholder,
  disabled,
  id,
}: TranslatableInputProps) {
  const [activeLocale, setActiveLocale] = useState<Locale>(defaultLocale);

  function setValue(locale: Locale, text: string) {
    onChange({ ...value, [locale]: text });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div role="tablist" className="flex gap-1 border-b border-border">
        {locales.map((locale) => {
          const isActive = locale === activeLocale;
          const isMissing = !value[locale]?.trim();

          return (
            <button
              key={locale}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveLocale(locale)}
              className={cn(
                "-mb-px flex items-center gap-1 border-b-2 px-2 py-1 text-xs font-medium transition-colors",
                isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {localeMeta[locale].label}
              {locale === defaultLocale && <span className="text-destructive">*</span>}
              {isMissing && (
                <span
                  className="size-1.5 rounded-full bg-destructive"
                  role="img"
                  aria-label="Missing translation"
                />
              )}
            </button>
          );
        })}
      </div>

      {locales.map((locale) => (
        <div key={locale} className={cn(locale !== activeLocale && "hidden")}>
          <Input
            id={locale === activeLocale ? id : undefined}
            dir={dirFor(locale)}
            value={value[locale] ?? ""}
            onChange={(event) => setValue(locale, event.target.value)}
            placeholder={placeholder?.[locale]}
            disabled={disabled}
            aria-invalid={!!errors?.[locale]}
          />
          {errors?.[locale] && <p className="mt-1 text-xs text-destructive">{errors[locale]}</p>}
        </div>
      ))}
    </div>
  );
}
