"use client";

import { useI18n } from "@/contexts/i18n-context";
import { LEAD_SOURCE, TONE_CLASSES, type LeadSource } from "@/lib/design/semantic";
import { cn } from "@/lib/utils";

/** Lead source: channel glyph (tinted by its token) + translated label. */
export function SourceBadge({ source, className }: { source: LeadSource; className?: string }) {
  const { t } = useI18n();
  const { tone, icon: Icon } = LEAD_SOURCE[source];

  return (
    <span
      data-slot="source-badge"
      className={cn(
        "inline-flex h-6 items-center gap-1.5 text-xs font-medium whitespace-nowrap text-foreground",
        className,
      )}
    >
      <Icon aria-hidden="true" className={cn("size-4 shrink-0", TONE_CLASSES[tone].text)} />
      {t(`source.${source}`)}
    </span>
  );
}
