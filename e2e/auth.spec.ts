import { loadEnvConfig } from "@next/env";
import { expect, test } from "@playwright/test";

// Runs in both Playwright projects: desktop (1280px) and mobile (375px).
loadEnvConfig(process.cwd());
const hasDatabase = Boolean(process.env.DATABASE_URL);

/** Matches the page path exactly (ignores the query string). */
const onPath = (path: string) => (url: URL) => url.pathname === path;

test("protected pages send signed-out visitors to log in", async ({ page }) => {
  await page.goto("/profile");
  await expect(page).toHaveURL(/\/login\?next=%2Fprofile$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Welcome back" }),
  ).toBeVisible();
});

test("sign-up form explains invalid input", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("Mobile number").fill("12345");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText(/valid Philippine mobile number/)).toBeVisible();
  await expect(page.getByText(/Please enter your name/)).toBeVisible();
});

test.describe("with a database", () => {
  // TODO(before Stage 5): CI has no database yet, so this skips there.
  // See docs/SETUP.md, "CI database".
  test.skip(!hasDatabase, "DATABASE_URL is not set");

  test("sign up → log out → log in", async ({ page }, testInfo) => {
    // Several server round trips to Neon plus password hashing; give it room.
    test.slow();
    // Locally every request shares one rate-limit bucket (no client IP), so
    // many back-to-back runs could hit the per-IP limit. A unique test IP
    // keeps each run separate. (On Vercel the platform sets this header.)
    await page.setExtraHTTPHeaders({
      "x-forwarded-for": `198.51.100.${Math.floor(Math.random() * 250) + 1}`,
    });
    const email = `e2e-${testInfo.project.name}-${Date.now()}@hermes-express.test`;
    const password = "brewed-by-you-123";

    await page.goto("/signup?next=/profile");
    await page.getByLabel("Full name").fill("Playwright Tester");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Mobile number").fill("0917 123 4567");
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByLabel("Confirm password").fill(password);
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page).toHaveURL(onPath("/profile"), { timeout: 15_000 });
    await expect(page.getByText(email)).toBeVisible();
    await expect(page.getByLabel("Mobile number")).toHaveValue("+639171234567");

    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL(onPath("/"), { timeout: 15_000 });
    await page.goto("/profile");
    await expect(page).toHaveURL(/\/login\?next=%2Fprofile$/);

    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: /incorrect/ }),
    ).toHaveText("The email or password you entered is incorrect.");

    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL(onPath("/profile"), { timeout: 15_000 });
    await expect(page.getByText(email)).toBeVisible();

    // Account menu links lead to real pages, not "not found".
    await page.goto("/orders");
    await expect(
      page.getByRole("heading", { level: 1, name: "Your orders" }),
    ).toBeVisible();
    await expect(page.getByText(/coming soon/)).toBeVisible();
  });
});
