import type { SVGProps } from "react";

/**
 * Monochrome Facebook channel glyph (design system §6): a simplified "f"
 * mark tinted by `currentColor`, used for the lead source only. Not the
 * full-color brand logo (that belongs in Settings → Integrations only).
 */
export function FacebookGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path d="M15.5 8.5h-1.75A1.75 1.75 0 0 0 12 10.25V21" />
      <path d="M9.5 13.5h5" />
    </svg>
  );
}
