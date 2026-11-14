import { stageTone, TONE_CLASSES, type StageKey } from "@/lib/design/semantic";
import { cn } from "@/lib/utils";

/**
 * Pipeline stage: color dot + name. `name` is already in the current locale
 * (lookups expose `name`); `color` is the stage's palette key from the DB.
 */
export function StageChip({
  color,
  name,
  className,
}: {
  color: StageKey;
  name: string;
  className?: string;
}) {
  return (
    <span
      data-slot="stage-chip"
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full border px-2 text-xs font-medium whitespace-nowrap text-foreground",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn("size-2 shrink-0 rounded-full", TONE_CLASSES[stageTone(color)].dot)}
      />
      <bdi>{name}</bdi>
    </span>
  );
}
