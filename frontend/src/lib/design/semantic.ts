import {
  AlarmClock,
  ArrowRightLeft,
  BadgeCheck,
  ChevronDown,
  ChevronsUp,
  CircleSlash,
  CircleX,
  Equal,
  FileInput,
  Globe,
  Mail,
  PenLine,
  PhoneOutgoing,
  Sparkles,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { FacebookGlyph } from "@/components/icons/facebook";
import { WhatsAppGlyph } from "@/components/icons/whatsapp";

/**
 * Domain value → design token + icon. The ONLY place this mapping lives
 * (design system §2.3). Components read from here; they never pick colors.
 *
 * The domain unions below mirror the backend enums that arrive in Phase 2;
 * once they exist in the OpenAPI spec, switch these to the generated types so
 * a new backend value fails `satisfies` at compile time.
 */

// ── Stage / label palette (keys stored in the DB, ADR-012) ──────────────────
export const STAGE_KEYS = [
  "slate",
  "sky",
  "teal",
  "indigo",
  "violet",
  "rose",
  "orange",
  "amber",
  "emerald",
  "lime",
] as const;
export type StageKey = (typeof STAGE_KEYS)[number];

export type Tone =
  | "primary"
  | "highlight"
  | "success"
  | "warning"
  | "info"
  | "destructive"
  | "muted"
  | `stage-${StageKey}`;

/**
 * Literal class names per tone. Tailwind only generates classes it can find
 * verbatim in source, so these must stay full strings, never `tint-${tone}`.
 * `tint` = soft background, `text` = solid text/icon, `dot` = solid fill.
 */
export const TONE_CLASSES: Record<Tone, { tint: string; text: string; dot: string }> = {
  primary: { tint: "tint-primary", text: "text-primary", dot: "bg-primary" },
  highlight: {
    tint: "bg-highlight",
    text: "text-highlight-foreground",
    dot: "bg-highlight",
  },
  success: { tint: "tint-success", text: "text-success", dot: "bg-success" },
  warning: { tint: "tint-warning", text: "text-warning", dot: "bg-warning" },
  info: { tint: "tint-info", text: "text-info", dot: "bg-info" },
  destructive: { tint: "tint-destructive", text: "text-destructive", dot: "bg-destructive" },
  muted: { tint: "bg-muted", text: "text-muted-foreground", dot: "bg-muted-foreground" },
  "stage-slate": { tint: "tint-stage-slate", text: "text-stage-slate", dot: "bg-stage-slate" },
  "stage-sky": { tint: "tint-stage-sky", text: "text-stage-sky", dot: "bg-stage-sky" },
  "stage-teal": { tint: "tint-stage-teal", text: "text-stage-teal", dot: "bg-stage-teal" },
  "stage-indigo": { tint: "tint-stage-indigo", text: "text-stage-indigo", dot: "bg-stage-indigo" },
  "stage-violet": { tint: "tint-stage-violet", text: "text-stage-violet", dot: "bg-stage-violet" },
  "stage-rose": { tint: "tint-stage-rose", text: "text-stage-rose", dot: "bg-stage-rose" },
  "stage-orange": { tint: "tint-stage-orange", text: "text-stage-orange", dot: "bg-stage-orange" },
  "stage-amber": { tint: "tint-stage-amber", text: "text-stage-amber", dot: "bg-stage-amber" },
  "stage-emerald": {
    tint: "tint-stage-emerald",
    text: "text-stage-emerald",
    dot: "bg-stage-emerald",
  },
  "stage-lime": { tint: "tint-stage-lime", text: "text-stage-lime", dot: "bg-stage-lime" },
};

export function stageTone(key: StageKey): Tone {
  return `stage-${key}`;
}

export type GlyphComponent = LucideIcon | ComponentType<SVGProps<SVGSVGElement>>;

export interface Semantic {
  /** `null` = take the tone from context (a deal that is `open` uses its stage color). */
  tone: Tone | null;
  icon: GlyphComponent | null;
  /** Mirror in RTL (arrows, chevrons, arrow-right-left); see DirIcon. */
  directional?: boolean;
}

// ── Domain values (§2.3) ────────────────────────────────────────────────────
export type LeadStatus = "new" | "contacted" | "qualified" | "unqualified" | "converted";
export type DealStatus = "open" | "won" | "lost";
export type TaskDue = "overdue" | "today" | "upcoming";
export type Priority = "high" | "medium" | "low";
export type LeadSource = "facebook" | "whatsapp" | "email" | "website" | "manual" | "import";

export const LEAD_STATUS = {
  new: { tone: "info", icon: Sparkles },
  contacted: { tone: "stage-sky", icon: PhoneOutgoing },
  qualified: { tone: "success", icon: BadgeCheck },
  unqualified: { tone: "stage-slate", icon: CircleSlash },
  converted: { tone: "primary", icon: ArrowRightLeft, directional: true },
} as const satisfies Record<LeadStatus, Semantic>;

export const DEAL_STATUS = {
  open: { tone: null, icon: null },
  won: { tone: "success", icon: Trophy },
  lost: { tone: "destructive", icon: CircleX },
} as const satisfies Record<DealStatus, Semantic>;

export const TASK_DUE = {
  overdue: { tone: "destructive", icon: AlarmClock },
  today: { tone: "highlight", icon: AlarmClock },
  upcoming: { tone: "muted", icon: AlarmClock },
} as const satisfies Record<TaskDue, Semantic>;

export const PRIORITY = {
  high: { tone: "destructive", icon: ChevronsUp },
  medium: { tone: "warning", icon: Equal },
  low: { tone: "muted", icon: ChevronDown },
} as const satisfies Record<Priority, Semantic>;

export const LEAD_SOURCE = {
  facebook: { tone: "stage-indigo", icon: FacebookGlyph },
  whatsapp: { tone: "stage-emerald", icon: WhatsAppGlyph },
  email: { tone: "stage-sky", icon: Mail },
  website: { tone: "stage-teal", icon: Globe },
  manual: { tone: "stage-slate", icon: PenLine },
  import: { tone: "stage-violet", icon: FileInput },
} as const satisfies Record<LeadSource, Semantic>;

/** Every status-like map, keyed by the `kind` StatusPill accepts. */
export const STATUS = {
  lead: LEAD_STATUS,
  deal: DEAL_STATUS,
  task: TASK_DUE,
  priority: PRIORITY,
} as const;

export type StatusKind = keyof typeof STATUS;
export type StatusValue<K extends StatusKind> = keyof (typeof STATUS)[K];

/**
 * Default pipeline stage colors (§2.3), used by the pipeline seeder and as
 * the fallback for new stages.
 */
export const DEFAULT_STAGE_COLORS = {
  new_lead: "slate",
  contacted: "sky",
  qualified: "teal",
  demo: "indigo",
  proposal_sent: "violet",
  negotiation: "amber",
  won: "emerald",
  lost: "rose",
} as const satisfies Record<string, StageKey>;
