import { expect, test } from "@playwright/test";

// Needs the Laravel API running with the default seed (test@example.com /
// password). CI has no backend until step 0.6 wires one up and sets E2E_BACKEND=1.
test.skip(Boolean(process.env.CI) && !process.env.E2E_BACKEND, "no backend in CI until step 0.6");

const USER = { email: "test@example.com", password: "password", name: "Test User" };

test("redirects a guest from a protected page to login", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/login\?redirect=%2Fdashboard$/);
  await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
});

test("logs in with the seeded user and lands on the dashboard", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel("Email").fill(USER.email);
  await page.getByLabel("Password").fill(USER.password);
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: `Welcome, ${USER.name}` })).toBeVisible();
});

test("shows the server error inline for wrong credentials", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel("Email").fill(USER.email);
  await page.getByLabel("Password").fill("definitely-wrong");
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page.getByText("These credentials do not match our records.")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});
