"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { MoonIcon, SunIcon } from "lucide-react";
import { useI18n } from "@/contexts/i18n-context";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const { t } = useI18n();
  // resolvedTheme is undefined until mounted (it depends on localStorage /
  // the OS preference) — render a stable icon for that first frame instead
  // of flashing sun→moon once it resolves.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // Distinguishes the server-rendered pass (always "not mounted") from
    // the client one, where resolvedTheme is actually known — the standard
    // next-themes pattern for avoiding a hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={t("nav.theme")}
      title={t("nav.theme")}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}
    </Button>
  );
}
