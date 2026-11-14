import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import ar from "@/lib/i18n/locales/ar.json";
import en from "@/lib/i18n/locales/en.json";
import {
  DEFAULT_STAGE_COLORS,
  LEAD_SOURCE,
  STAGE_KEYS,
  STATUS,
  TONE_CLASSES,
  type Semantic,
  type Tone,
} from "@/lib/design/semantic";

const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

function lookup(dict: unknown, key: string): unknown {
  return key
    .split(".")
    .reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], dict);
}

/** The CSS variable a tone's color comes from (highlight/muted map to their own tokens). */
function cssVarFor(tone: Tone): string {
  return `--color-${tone}`;
}

describe("design tokens ↔ globals.css", () => {
  it.each(STAGE_KEYS)("stage key %s has a light + dark value and a Tailwind color", (key) => {
    expect(css).toContain(`--stage-${key}:`);
    expect(css).toContain(`--color-stage-${key}: var(--stage-${key})`);
    // Defined at least twice: :root/.light and .dark (+ the prefers-color-scheme mirror).
    expect(css.match(new RegExp(`--stage-${key}:`, "g"))?.length).toBeGreaterThanOrEqual(3);
  });

  it.each(Object.keys(TONE_CLASSES) as Tone[])("tone %s is a real theme color", (tone) => {
    const token = tone === "muted" ? "--color-muted-foreground" : cssVarFor(tone);
    expect(css).toContain(`${token}:`);
  });

  it("dark mode mirror stays in sync with .dark", () => {
    const block = (selector: string) => {
      const start = css.indexOf(selector);
      return css.slice(start, css.indexOf("}", start));
    };
    const names = (text: string) => [...text.matchAll(/(--[a-z0-9-]+):/g)].map((m) => m[1]).sort();

    expect(names(block(":root:not(.light) {"))).toEqual(names(block(".dark {")));
  });
});

describe("semantic map (design system §2.3)", () => {
  const entries = Object.entries(STATUS).flatMap(([kind, map]) =>
    Object.entries(map as Record<string, Semantic>).map(
      ([value, semantic]) => [kind, value, semantic] as const,
    ),
  );

  it.each(entries)("%s.%s maps to a known tone and has an icon", (kind, value, semantic) => {
    if (semantic.tone !== null) expect(TONE_CLASSES).toHaveProperty(semantic.tone);
    // Only an open deal takes its color (and no icon) from its stage.
    if (!(kind === "deal" && value === "open")) {
      expect(semantic.tone).not.toBeNull();
      expect(semantic.icon).toBeTruthy();
    }
  });

  it.each(entries)("%s.%s has an English and an Arabic label", (kind, value) => {
    expect(lookup(en, `status.${kind}.${value}`)).toEqual(expect.any(String));
    expect(lookup(ar, `status.${kind}.${value}`)).toEqual(expect.any(String));
  });

  it.each(Object.entries(LEAD_SOURCE))("source %s has a tone, glyph and labels", (source, s) => {
    expect(TONE_CLASSES).toHaveProperty(s.tone);
    expect(s.icon).toBeTruthy();
    expect(lookup(en, `source.${source}`)).toEqual(expect.any(String));
    expect(lookup(ar, `source.${source}`)).toEqual(expect.any(String));
  });

  it("only the converted lead status (arrow-right-left) is directional", () => {
    const directional = entries.filter(([, , s]) => s.directional).map(([k, v]) => `${k}.${v}`);
    expect(directional).toEqual(["lead.converted"]);
  });

  it("default pipeline stages use palette keys", () => {
    for (const key of Object.values(DEFAULT_STAGE_COLORS)) expect(STAGE_KEYS).toContain(key);
  });

  it("tone classes are literal strings Tailwind can find (no interpolation leftovers)", () => {
    for (const classes of Object.values(TONE_CLASSES)) {
      for (const cls of Object.values(classes)) expect(cls).toMatch(/^[a-z][a-z0-9-]+$/);
    }
  });
});
