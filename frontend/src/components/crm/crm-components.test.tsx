import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ar from "@/lib/i18n/locales/ar.json";
import en from "@/lib/i18n/locales/en.json";
import { SourceBadge } from "./source-badge";
import { StageChip } from "./stage-chip";
import { StatusPill } from "./status-pill";

const i18n = vi.hoisted(() => ({ locale: "en" as "en" | "ar" }));

vi.mock("@/contexts/i18n-context", () => ({
  useI18n: () => {
    const dict = i18n.locale === "ar" ? ar : en;
    return {
      locale: i18n.locale,
      dir: i18n.locale === "ar" ? "rtl" : "ltr",
      setLocale: () => {},
      t: (key: string) =>
        key
          .split(".")
          .reduce<unknown>((n, p) => (n as Record<string, unknown> | undefined)?.[p], dict) ?? key,
    };
  },
}));

describe("StatusPill", () => {
  it("renders the translated label with an icon, tinted by its tone", () => {
    i18n.locale = "en";
    render(<StatusPill kind="lead" value="qualified" />);

    const pill = screen.getByText("Qualified");
    expect(pill).toHaveAttribute("data-tone", "success");
    expect(pill).toHaveClass("tint-success", "text-success");
    const icon = pill.querySelector("svg");
    expect(icon).not.toBeNull();
    expect(icon).toHaveAttribute("aria-hidden", "true");
  });

  it("uses the Arabic label in Arabic", () => {
    i18n.locale = "ar";
    render(<StatusPill kind="priority" value="high" />);

    expect(screen.getByText("عالية")).toHaveAttribute("data-tone", "destructive");
  });

  it("mirrors directional icons in RTL (converted → arrow-right-left)", () => {
    i18n.locale = "en";
    render(<StatusPill kind="lead" value="converted" />);

    expect(screen.getByText("Converted").querySelector("svg")).toHaveClass("rtl:-scale-x-100");
  });

  it("does not mirror non-directional icons", () => {
    i18n.locale = "en";
    render(<StatusPill kind="lead" value="contacted" />);

    expect(screen.getByText("Contacted").querySelector("svg")).not.toHaveClass("rtl:-scale-x-100");
  });

  it("colors an open deal by its stage, without an icon", () => {
    i18n.locale = "en";
    render(<StatusPill kind="deal" value="open" stage="indigo" />);

    const pill = screen.getByText("Open");
    expect(pill).toHaveAttribute("data-tone", "stage-indigo");
    expect(pill.querySelector("svg")).toBeNull();
  });
});

describe("StageChip", () => {
  it("shows the stage dot and the (isolated) name", () => {
    render(<StageChip color="violet" name="Proposal sent" />);

    const name = screen.getByText("Proposal sent");
    expect(name.tagName).toBe("BDI");
    expect(name.parentElement?.querySelector(".bg-stage-violet")).not.toBeNull();
  });
});

describe("SourceBadge", () => {
  it("shows the channel glyph tinted by its token and the label", () => {
    i18n.locale = "en";
    render(<SourceBadge source="whatsapp" />);

    const badge = screen.getByText("WhatsApp");
    expect(badge.querySelector("svg")).toHaveClass("text-stage-emerald");
  });
});
