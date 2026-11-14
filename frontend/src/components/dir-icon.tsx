import type { ComponentType, SVGProps } from "react";
import { cn } from "@/lib/utils";

type IconComponent = ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;

/**
 * Renders a directional icon (arrow, chevron, log-out, reply, send,
 * arrow-right-left) mirrored in RTL, so "forward" points toward the reading
 * direction. Non-directional icons (phone, check, clock) must NOT use this.
 * Design system §6.
 *
 *   <DirIcon icon={ChevronRight} className="size-4" />
 */
export function DirIcon({
  icon: Icon,
  className,
  ...props
}: { icon: IconComponent } & SVGProps<SVGSVGElement>) {
  return <Icon aria-hidden="true" {...props} className={cn("rtl:-scale-x-100", className)} />;
}
