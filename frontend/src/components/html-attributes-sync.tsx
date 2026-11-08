"use client";

import { useEffect } from "react";
import { useI18n } from "@/contexts/i18n-context";
import { dirFor } from "@/lib/i18n/config";

/**
 * `<html lang>`/`dir` need to react to the locale switch, but the root
 * layout is a server component and can't hold that state itself — this
 * mirrors how `next-themes` applies `.dark` to `<html>` client-side after
 * mount (see `ThemeProvider`). Renders nothing.
 */
export function HtmlAttributesSync() {
  const { locale } = useI18n();

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dirFor(locale);
  }, [locale]);

  return null;
}
