"use client";

import { useI18n } from "@/contexts/i18n-context";
import { locales, localeMeta } from "@/lib/i18n/config";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("nav.language")}
        className="rounded-lg px-2 py-1 text-sm hover:bg-muted"
      >
        {localeMeta[locale].label}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        {locales.map((code) => (
          <DropdownMenuItem key={code} onClick={() => setLocale(code)}>
            {localeMeta[code].label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
