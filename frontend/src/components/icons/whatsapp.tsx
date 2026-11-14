import type { SVGProps } from "react";

/**
 * Monochrome WhatsApp channel glyph (design system §6): a chat bubble with a
 * handset, tinted by `currentColor`, in lucide's stroke style. Not the brand
 * logo (full-color logos belong in Settings → Integrations only).
 */
export function WhatsAppGlyph(props: SVGProps<SVGSVGElement>) {
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
      <path d="M3.5 20.5 4.8 16.4A8.5 8.5 0 1 1 7.6 19.2Z" />
      <path d="M9.2 8.6c.2-.4.6-.5.9-.3l.9.9c.2.2.2.6 0 .8l-.5.5a5.5 5.5 0 0 0 2.9 2.9l.5-.5c.2-.2.6-.2.8 0l.9.9c.2.3.1.7-.3.9-1 .6-2.2.5-3.2-.1a8 8 0 0 1-2.9-2.9c-.6-1-.7-2.2-.1-3.1Z" />
    </svg>
  );
}
