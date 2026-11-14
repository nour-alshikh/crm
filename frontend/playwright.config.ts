import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3000);
const baseURL = `http://localhost:${PORT}`;
const isCI = Boolean(process.env.CI);

/**
 * E2E against the real Laravel API (Sail locally, compose in CI from 0.6).
 * The backend must already be running and seeded; Playwright only starts
 * Next.js. Locally it reuses a running `npm run dev`; CI tests the production
 * build, as recommended in node_modules/next/dist/docs/01-app/02-guides/testing/playwright.md.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "list",
  // A login is 2–3 API calls plus a first-visit dev compile of the next page;
  // on an HDD-backed local Docker that takes 10–15 s (default is 5 s).
  // Only failing assertions wait this long.
  expect: { timeout: 30_000 },
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: isCI
      ? `npm run build && npm run start -- --port ${PORT}`
      : `npm run dev -- --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 180_000,
  },
});
