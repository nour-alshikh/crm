import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Design system §12: every color comes from a token in globals.css. A color
// literal in a component bypasses dark mode and the contrast checks.
// Matches hex (#abc, #aabbcc, #aabbccdd) and oklch()/oklab()/rgb[a]()/hsl[a]().
const COLOR_LITERAL = "/#[0-9a-fA-F]{3,8}(?![0-9a-zA-Z_-])|(oklch|oklab|rgba?|hsla?)[(]/";
const colorLiteralMessage =
  "No color literals in components: use a design token (bg-primary, text-success, tint-stage-teal, …). See docs/09-design-system.md §12.";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/**/*.test.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        { selector: `Literal[value=${COLOR_LITERAL}]`, message: colorLiteralMessage },
        { selector: `TemplateElement[value.raw=${COLOR_LITERAL}]`, message: colorLiteralMessage },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
