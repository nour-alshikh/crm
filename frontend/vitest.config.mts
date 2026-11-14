import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

// Setup follows node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md,
// minus @vitejs/plugin-react: Vite's built-in transform already compiles TSX
// with the automatic runtime, and plugin-react 6 drags in a Babel 8 peer that
// conflicts with shadcn's Babel 7.
//
// Run through `npm run test` (scripts/vitest.mjs), not bare `npx vitest`:
// the launcher fixes a Windows drive-letter casing issue.
export default defineConfig({
  plugins: [tsconfigPaths()],
  oxc: {
    jsx: { runtime: "automatic" },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    css: false,
    restoreMocks: true,
    unstubEnvs: true,
  },
});
