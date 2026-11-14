"use client";

// Dev-only reference page: headings and sample copy are intentionally plain
// English/Arabic literals (not user-facing; 404 in production).

import { useState, type ReactNode } from "react";
import { ArrowRight, ChevronRight, LogOut, Phone, Send } from "lucide-react";
import { DirIcon } from "@/components/dir-icon";
import { SourceBadge } from "@/components/crm/source-badge";
import { StageChip } from "@/components/crm/stage-chip";
import { StatusPill } from "@/components/crm/status-pill";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DEAL_STATUS,
  LEAD_SOURCE,
  LEAD_STATUS,
  PRIORITY,
  STAGE_KEYS,
  TASK_DUE,
  type DealStatus,
  type LeadSource,
  type LeadStatus,
  type Priority,
  type TaskDue,
} from "@/lib/design/semantic";
import { cn } from "@/lib/utils";

// Literal class names so Tailwind generates them (never build them dynamically).
const SWATCHES: { group: string; items: { name: string; bg: string; fg?: string }[] }[] = [
  {
    group: "Surfaces & text",
    items: [
      { name: "background", bg: "bg-background", fg: "text-foreground" },
      { name: "card", bg: "bg-card", fg: "text-card-foreground" },
      { name: "popover", bg: "bg-popover", fg: "text-popover-foreground" },
      { name: "muted", bg: "bg-muted", fg: "text-muted-foreground" },
      { name: "accent", bg: "bg-accent", fg: "text-accent-foreground" },
      { name: "border", bg: "bg-border" },
      { name: "input", bg: "bg-input" },
    ],
  },
  {
    group: "Brand",
    items: [
      { name: "primary", bg: "bg-primary", fg: "text-primary-foreground" },
      { name: "secondary", bg: "bg-secondary", fg: "text-secondary-foreground" },
      { name: "highlight", bg: "bg-highlight", fg: "text-highlight-foreground" },
      { name: "ring", bg: "bg-ring" },
    ],
  },
  {
    group: "Semantic",
    items: [
      { name: "success", bg: "bg-success" },
      { name: "warning", bg: "bg-warning" },
      { name: "info", bg: "bg-info" },
      { name: "destructive", bg: "bg-destructive" },
    ],
  },
  {
    group: "Sidebar (ink in both themes)",
    items: [
      { name: "sidebar", bg: "bg-sidebar", fg: "text-sidebar-foreground" },
      { name: "sidebar-accent", bg: "bg-sidebar-accent", fg: "text-sidebar-accent-foreground" },
      { name: "sidebar-primary", bg: "bg-sidebar-primary", fg: "text-sidebar-primary-foreground" },
    ],
  },
  {
    group: "Charts",
    items: [
      { name: "chart-1", bg: "bg-chart-1" },
      { name: "chart-2", bg: "bg-chart-2" },
      { name: "chart-3", bg: "bg-chart-3" },
      { name: "chart-4", bg: "bg-chart-4" },
      { name: "chart-5", bg: "bg-chart-5" },
      { name: "chart-6", bg: "bg-chart-6" },
    ],
  },
  {
    group: "Stage palette (DB keys)",
    items: [
      { name: "slate", bg: "bg-stage-slate" },
      { name: "sky", bg: "bg-stage-sky" },
      { name: "teal", bg: "bg-stage-teal" },
      { name: "indigo", bg: "bg-stage-indigo" },
      { name: "violet", bg: "bg-stage-violet" },
      { name: "rose", bg: "bg-stage-rose" },
      { name: "orange", bg: "bg-stage-orange" },
      { name: "amber", bg: "bg-stage-amber" },
      { name: "emerald", bg: "bg-stage-emerald" },
      { name: "lime", bg: "bg-stage-lime" },
    ],
  },
];

const TINTS = [
  "tint-primary",
  "tint-success",
  "tint-warning",
  "tint-info",
  "tint-destructive",
  "tint-stage-teal",
  "tint-stage-violet",
  "tint-stage-amber",
];

const TYPE_SCALE = [
  { cls: "text-xs", label: "xs · 12px" },
  { cls: "text-sm", label: "sm · 13px" },
  { cls: "text-base", label: "base · 14px (default)" },
  { cls: "text-md", label: "md · 16px (reading)" },
  { cls: "text-lg", label: "lg · 18px" },
  { cls: "text-xl", label: "xl · 22px" },
  { cls: "text-2xl", label: "2xl · 28px" },
  { cls: "text-3xl", label: "3xl · 36px (KPI only)" },
];

const BUTTON_VARIANTS = [
  "default",
  "secondary",
  "outline",
  "ghost",
  "destructive",
  "highlight",
  "link",
] as const;

const STAGE_NAMES: Record<(typeof STAGE_KEYS)[number], string> = {
  slate: "New lead",
  sky: "Contacted",
  teal: "Qualified",
  indigo: "Demo",
  violet: "Proposal sent",
  rose: "Lost",
  orange: "On hold",
  amber: "Negotiation",
  emerald: "Won",
  lime: "Renewal",
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

function Specimen() {
  return (
    <div className="flex flex-col gap-8">
      <Section title="Color tokens">
        {SWATCHES.map(({ group, items }) => (
          <div key={group} className="flex flex-col gap-1.5">
            <p className="text-xs text-muted-foreground">{group}</p>
            <div className="flex flex-wrap gap-2">
              {items.map((s) => (
                <div
                  key={s.name}
                  className={cn(
                    "flex h-14 w-28 items-end rounded-lg border p-1.5 text-xs",
                    s.bg,
                    s.fg ?? "text-foreground",
                  )}
                >
                  <span className={cn(!s.fg && "rounded bg-card/80 px-1")}>{s.name}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          {TINTS.map((tint) => (
            <span key={tint} className={cn("rounded-md px-2 py-1 text-xs", tint)}>
              {tint}
            </span>
          ))}
        </div>
      </Section>

      <Section title="Typography: IBM Plex Sans + Plex Sans Arabic + Plex Mono">
        <div className="flex flex-col gap-1">
          {TYPE_SCALE.map(({ cls, label }) => (
            <p key={cls} className={cn(cls, "truncate")}>
              <span className="text-muted-foreground">{label}</span> · Pipeline شركة Acme
            </p>
          ))}
        </div>
        <p className="text-md">
          مرحبًا بك في نظام إدارة علاقات العملاء. تمت إضافة <bdi>Acme Corp</bdi> إلى الصفقات.
        </p>
        <p className="font-mono text-sm" dir="ltr">
          +966 50 123 4567 · LEAD-01HZX9 · 1,234,567.89
        </p>
        <p className="text-sm text-muted-foreground">
          Weights: <span className="font-normal">400</span> ·{" "}
          <span className="font-medium">500</span> · <span className="font-semibold">600</span> ·{" "}
          <span className="font-bold">700</span>
        </p>
      </Section>

      <Section title="Buttons: default 36px · sm 32px · lg 40px · highlight = one hero action">
        {(["sm", "default", "lg"] as const).map((size) => (
          <div key={size} className="flex flex-wrap items-center gap-2">
            {BUTTON_VARIANTS.map((variant) => (
              <Button key={variant} variant={variant} size={size}>
                {variant}
              </Button>
            ))}
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-2">
          <Button>
            Next <DirIcon icon={ArrowRight} data-icon="inline-end" />
          </Button>
          <Button variant="highlight">Convert lead</Button>
          <Button variant="outline" disabled>
            Disabled
          </Button>
        </div>
      </Section>

      <Section title="Inputs">
        <div className="flex max-w-md flex-col gap-2">
          <Input placeholder="Company name" />
          <Input placeholder="Invalid" aria-invalid defaultValue="not-an-email" />
          <Input placeholder="Disabled" disabled />
        </div>
      </Section>

      <Section title="Status pills (tint + text + icon, never color-only)">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(LEAD_STATUS) as LeadStatus[]).map((v) => (
            <StatusPill key={v} kind="lead" value={v} />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(DEAL_STATUS) as DealStatus[]).map((v) => (
            <StatusPill key={v} kind="deal" value={v} stage="indigo" />
          ))}
          {(Object.keys(TASK_DUE) as TaskDue[]).map((v) => (
            <StatusPill key={v} kind="task" value={v} />
          ))}
          {(Object.keys(PRIORITY) as Priority[]).map((v) => (
            <StatusPill key={v} kind="priority" value={v} />
          ))}
        </div>
      </Section>

      <Section title="Stage chips">
        <div className="flex flex-wrap gap-2">
          {STAGE_KEYS.map((key) => (
            <StageChip key={key} color={key} name={STAGE_NAMES[key]} />
          ))}
          <StageChip color="emerald" name="تم الربح" />
        </div>
      </Section>

      <Section title="Source badges">
        <div className="flex flex-wrap gap-4">
          {(Object.keys(LEAD_SOURCE) as LeadSource[]).map((s) => (
            <SourceBadge key={s} source={s} />
          ))}
        </div>
      </Section>

      <Section title="Badges">
        <div className="flex flex-wrap gap-2">
          <Badge>default</Badge>
          <Badge variant="secondary">secondary</Badge>
          <Badge variant="outline">outline</Badge>
          <Badge variant="destructive">destructive</Badge>
        </div>
      </Section>

      <Section title="Directional icons (DirIcon mirrors in RTL; phone never flips)">
        <div className="flex items-center gap-4 text-foreground">
          <DirIcon icon={ArrowRight} className="size-5" />
          <DirIcon icon={ChevronRight} className="size-5" />
          <DirIcon icon={LogOut} className="size-5" />
          <DirIcon icon={Send} className="size-5" />
          <Phone aria-hidden="true" className="size-5" />
        </div>
      </Section>

      <Section title="Sidebar sample">
        <nav className="flex w-56 flex-col gap-1 rounded-xl bg-sidebar p-2 text-sm text-sidebar-foreground">
          <span className="relative rounded-md bg-sidebar-accent px-3 py-1.5 text-sidebar-accent-foreground before:absolute before:inset-y-1 before:start-0 before:w-[3px] before:rounded-full before:bg-sidebar-primary">
            Dashboard
          </span>
          <span className="flex items-center justify-between px-3 py-1.5">
            Leads <span className="rounded-full bg-sidebar-accent px-1.5 text-xs">12</span>
          </span>
          <span className="flex items-center justify-between px-3 py-1.5">
            Inbox <span aria-label="unread" className="size-2 rounded-full bg-highlight" />
          </span>
        </nav>
      </Section>

      <Section title="Table (40px rows, tabular numbers)">
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Deal</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead className="text-end">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>
                  <bdi>شركة الأفق</bdi>
                </TableCell>
                <TableCell>
                  <StageChip color="violet" name="Proposal sent" />
                </TableCell>
                <TableCell className="text-end" dir="ltr">
                  SAR 125,000.00
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Acme Corp</TableCell>
                <TableCell>
                  <StatusPill kind="deal" value="won" />
                </TableCell>
                <TableCell className="text-end" dir="ltr">
                  USD 9,800.50
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </Section>

      <Section title="Elevation & radius">
        <div className="flex flex-wrap gap-4">
          <div className="h-16 w-32 rounded-xl border bg-card p-2 text-xs">level 0 · border</div>
          <div className="h-16 w-32 rounded-xl bg-popover p-2 text-xs shadow-sm">
            level 1 · shadow-sm
          </div>
          <div className="h-16 w-32 rounded-2xl bg-popover p-2 text-xs shadow-lg">
            level 2 · shadow-lg
          </div>
        </div>
      </Section>
    </div>
  );
}

export function DesignPlayground() {
  const [dir, setDir] = useState<"ltr" | "rtl">("ltr");

  return (
    <main className="flex flex-1 flex-col gap-4 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Design system · Tide &amp; Saffron</h1>
          <p className="text-sm text-muted-foreground">
            docs/09-design-system.md · light and dark side by side. Tokens are exact in both panels;
            the few `dark:` utility variants follow the app theme, so also check with the theme
            toggle.
          </p>
        </div>
        <div className="flex gap-1" role="group" aria-label="Direction">
          <Button
            size="sm"
            variant={dir === "ltr" ? "default" : "outline"}
            onClick={() => setDir("ltr")}
          >
            LTR · English
          </Button>
          <Button
            size="sm"
            variant={dir === "rtl" ? "default" : "outline"}
            onClick={() => setDir("rtl")}
          >
            RTL · العربية
          </Button>
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-2">
        {(["light", "dark"] as const).map((theme) => (
          <div
            key={theme}
            dir={dir}
            lang={dir === "rtl" ? "ar" : "en"}
            className={cn(
              "rounded-2xl border bg-background p-5 text-foreground",
              theme === "dark" ? "dark" : "light",
            )}
          >
            <p className="mb-4 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {theme}
            </p>
            <Specimen />
          </div>
        ))}
      </div>
    </main>
  );
}
