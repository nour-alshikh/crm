"use client";

import { DirIcon } from "@/components/dir-icon";
import { useI18n } from "@/contexts/i18n-context";
import {
  STATUS,
  stageTone,
  TONE_CLASSES,
  type Semantic,
  type StageKey,
  type StatusKind,
  type StatusValue,
} from "@/lib/design/semantic";
import { cn } from "@/lib/utils";

type StatusPillProps<K extends StatusKind> = {
  kind: K;
  value: StatusValue<K>;
  /** For values whose color comes from context, e.g. an `open` deal → its stage. */
  stage?: StageKey;
  className?: string;
};

/**
 * Status as tint background + solid text + icon. Never color-only: the label
 * is always rendered (design system §2 rules, §8).
 */
export function StatusPill<K extends StatusKind>({
  kind,
  value,
  stage,
  className,
}: StatusPillProps<K>) {
  const { t } = useI18n();
  const semantic = (STATUS[kind] as Record<string, Semantic>)[value as string];
  const tone = semantic.tone ?? stageTone(stage ?? "slate");
  const classes = TONE_CLASSES[tone];
  const Icon = semantic.icon;

  return (
    <span
      data-slot="status-pill"
      data-tone={tone}
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-full px-2 text-xs font-medium whitespace-nowrap",
        classes.tint,
        classes.text,
        className,
      )}
    >
      {Icon &&
        (semantic.directional ? (
          <DirIcon icon={Icon} className="size-3.5 shrink-0" strokeWidth={1.75} />
        ) : (
          <Icon aria-hidden="true" className="size-3.5 shrink-0" strokeWidth={1.75} />
        ))}
      {t(`status.${kind}.${String(value)}`)}
    </span>
  );
}
