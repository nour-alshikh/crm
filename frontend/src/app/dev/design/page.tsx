import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DesignPlayground } from "./playground";

export const metadata: Metadata = { title: "Design system · CRM" };

/**
 * Living reference for docs/09-design-system.md (§12): every token and core
 * component in light + dark, LTR + RTL. Development only, 404 in production
 * builds. Moves under /[locale]/dev/design with next-intl (step 1.4).
 */
export default function DesignPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return <DesignPlayground />;
}
