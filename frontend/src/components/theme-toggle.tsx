"use client";

import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
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
  const buttonRef = useRef<HTMLButtonElement>(null);

  function toggle() {
    const next = isDark ? "light" : "dark";
    const button = buttonRef.current;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!button || reduceMotion || !document.startViewTransition) {
      setTheme(next);
      return;
    }

    // Reveal the new theme as a circle growing out of this button.
    const { left, top, width, height } = button.getBoundingClientRect();
    const x = left + width / 2;
    const y = top + height / 2;
    const radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );

    const transition = document.startViewTransition(() => {
      flushSync(() => setTheme(next));
      // next-themes applies the class in an effect; set it here too so the
      // "new" snapshot is guaranteed to be taken in the new theme.
      const root = document.documentElement;
      root.classList.remove("light", "dark");
      root.classList.add(next);
      root.style.colorScheme = next;
    });

    transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`],
        },
        {
          duration: 500,
          easing: "ease-in-out",
          pseudoElement: "::view-transition-new(root)",
        },
      );
    });
  }

  return (
    <Button
      ref={buttonRef}
      type="button"
      variant="ghost"
      size="icon"
      aria-label={t("nav.theme")}
      title={t("nav.theme")}
      onClick={toggle}
    >
      {isDark ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}
    </Button>
  );
}
