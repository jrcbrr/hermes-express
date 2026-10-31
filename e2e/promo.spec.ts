import { loadEnvConfig } from "@next/env";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { logIn as logInWithRetry } from "./helpers";

// Runs in both Playwright projects: desktop (1280px) and mobile (375px).
loadEnvConfig(process.cwd());
const adminEmail = process.env.SEED_ADMIN_EMAIL;
const adminPassword = process.env.SEED_ADMIN_PASSWORD;
const ready = Boolean(process.env.DATABASE_URL && adminEmail && adminPassword);

const fakeIp = () => `198.51.100.${Math.floor(Math.random() * 250) + 1}`;

async function adminPage(
  customer: Page,
  browser: Browser,
  baseURL: string | undefined,
): Promise<Page> {
  const context = await browser.newContext({
    baseURL,
    viewport: customer.viewportSize(),
    extraHTTPHeaders: { "x-forwarded-for": fakeIp() },
  });
  const page = await context.newPage();
  await logInWithRetry(page, "/admin/promos", adminEmail!, adminPassword!);
  return page;
}

test.describe("promo codes", () => {
  // TODO: CI has no database yet, so this skips there (docs/SETUP.md, "CI database").
  test.skip(!ready, "DATABASE_URL or the seed admin login is not set");

  test("an admin's new code works at checkout with cash, until it is switched off", async ({
    page,
    browser,
    baseURL,
  }, testInfo) => {
    test.setTimeout(180_000);
    await page.setExtraHTTPHeaders({ "x-forwarded-for": fakeIp() });
    const code =
      `E2E${testInfo.project.name.slice(0, 1)}${Date.now().toString(36)}`.toUpperCase();

    // 1. An admin creates a ₱10 code.
    const admin = await adminPage(page, browser, baseURL);
    await admin.getByRole("link", { name: "Add a code" }).click();
    await admin.getByLabel("Code", { exact: true }).fill(code);
    await admin.getByLabel("Type").selectOption("fixed");
    await admin.getByLabel("Amount off in pesos").fill("10");
    await admin.getByRole("button", { name: "Create code" }).click();
    await expect(admin.getByRole("link", { name: code })).toBeVisible({
      timeout: 15_000,
    });

    // 2. A customer reaches checkout with a croissant (₱95).
    await page.goto("/menu");
    await page
      .getByRole("button", { name: "Add to cart: Butter Croissant" })
      .click();
    await expect(
      page.getByText("Butter Croissant added to your cart."),
    ).toBeAttached();
    await page.goto("/signup?next=/checkout");
    // Typing into a page that is still hydrating can be lost.
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Full name").fill("Playwright Promo");
    await page
      .getByLabel("Email", { exact: true })
      .fill(`e2e-promo-${code.toLowerCase()}@hermes-express.test`);
    await page.getByLabel("Mobile number").fill("0917 123 4567");
    await page
      .getByLabel("Password", { exact: true })
      .fill("brewed-by-you-123");
    await page.getByLabel("Confirm password").fill("brewed-by-you-123");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL((url) => url.pathname === "/checkout", {
      timeout: 15_000,
    });
    await page.waitForLoadState("networkidle");

    // 3. A wrong code is refused; the real one takes ₱10 off.
    await page.getByLabel("Promo code").fill("NOSUCHCODE");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByText("We could not find this code.")).toBeVisible();
    await page.getByLabel("Promo code").fill(code.toLowerCase());
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByTestId("discount")).toHaveText("−₱10");
    await expect(page.getByTestId("checkout-total")).toHaveText("₱85");

    // 4. Pays by cash at pickup, at the first time slot (works at any hour).
    await page
      .locator("label", { hasText: /Schedule for later/ })
      .first()
      .click();
    await page
      .locator("label", { hasText: /Cash at Pickup/ })
      .first()
      .click();
    await page.getByRole("button", { name: "Place order · ₱85" }).click();
    await expect(page).toHaveURL(/\/orders\/[0-9a-f-]{36}$/, {
      timeout: 20_000,
    });
    await expect(
      page.getByText("Cash at Pickup · Pay at the counter"),
    ).toBeVisible();
    await expect(
      page.getByText(`Discount (${code})`, { exact: true }),
    ).toBeVisible();

    // 5. The admin sees the use and switches the code off.
    await admin.reload();
    const row = admin.getByRole("listitem").filter({ hasText: code });
    await expect(row).toContainText("Used 1");
    await admin.getByRole("button", { name: `Switch off: ${code}` }).click();
    await expect(row).toContainText("Off", { timeout: 15_000 });

    // 6. The next customer attempt is refused.
    await page.goto("/menu");
    await page
      .getByRole("button", { name: "Add to cart: Butter Croissant" })
      .click();
    await expect(
      page.getByText("Butter Croissant added to your cart."),
    ).toBeAttached();
    await page.goto("/checkout");
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Promo code").fill(code);
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByText("We could not find this code.")).toBeVisible();
  });
});
