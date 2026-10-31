import { loadEnvConfig } from "@next/env";
import { expect, test, type Page } from "@playwright/test";
import { logIn as logInWithRetry } from "./helpers";

// Runs in both Playwright projects: desktop (1280px) and mobile (375px).
loadEnvConfig(process.cwd());
const adminEmail = process.env.SEED_ADMIN_EMAIL;
const adminPassword = process.env.SEED_ADMIN_PASSWORD;
const ready = Boolean(process.env.DATABASE_URL && adminEmail && adminPassword);

const fakeIp = () => `198.51.100.${Math.floor(Math.random() * 250) + 1}`;
const onPath = (path: string) => (url: URL) => url.pathname === path;

async function addFromMenu(page: Page, name: string) {
  await page.goto("/menu");
  await page.getByRole("button", { name: `Add to cart: ${name}` }).click();
  await expect(page.getByText(`${name} added to your cart.`)).toBeAttached();
}

/** Places the cart at the first time slot, so the test works at any hour. */
async function placeOrder(page: Page, button: string): Promise<string> {
  await page
    .locator("label", { hasText: /Schedule for later/ })
    .first()
    .click();
  await page.getByRole("button", { name: button }).click();
  await expect(page).toHaveURL(/\/orders\/[0-9a-f-]{36}$/, { timeout: 20_000 });
  return (await page.getByTestId("order-code").textContent())!;
}

/**
 * Moves an order through statuses on /admin/orders. Retries from a fresh page,
 * because a change made before the page has hydrated goes nowhere.
 */
async function setStatuses(admin: Page, code: string, statuses: string[]) {
  for (const status of statuses) {
    await expect(async () => {
      await admin.goto("/admin/orders");
      const row = admin.getByRole("listitem").filter({ hasText: code });
      await expect(row).toBeVisible();
      const select = admin.getByLabel(`Status of order ${code}`);
      // A final order shows plain text instead of a select.
      if ((await select.count()) === 0) return;
      const current = select.locator("option").first();
      if ((await current.textContent()) === status) return;
      await select.selectOption({ label: status }, { timeout: 5_000 });
      await expect(row).toContainText(status);
      await expect(current).toHaveText(status, { timeout: 8_000 });
    }).toPass({ timeout: 60_000 });
  }
}

test.describe("rewards", () => {
  // TODO: CI has no database yet, so this skips there (docs/SETUP.md, "CI database").
  test.skip(!ready, "DATABASE_URL or the seed admin login is not set");

  test("points, ratings, badges, a free drink and favorites", async ({
    page,
    browser,
    baseURL,
  }, testInfo) => {
    test.setTimeout(300_000);
    await page.setExtraHTTPHeaders({ "x-forwarded-for": fakeIp() });

    const adminContext = await browser.newContext({
      baseURL,
      viewport: page.viewportSize(),
      extraHTTPHeaders: { "x-forwarded-for": fakeIp() },
    });
    const admin = await adminContext.newPage();
    await logInWithRetry(admin, "/admin", adminEmail!, adminPassword!);

    // 1. A new customer orders a ₱95 croissant, worth 9 points.
    await addFromMenu(page, "Butter Croissant");
    const email = `e2e-rewards-${testInfo.project.name}-${Date.now()}@hermes-express.test`;
    await page.goto("/signup?next=/checkout");
    // Typing into a page that is still hydrating can be lost.
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Full name").fill("Playwright Rewards");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Mobile number").fill("0917 123 4567");
    await page
      .getByLabel("Password", { exact: true })
      .fill("brewed-by-you-123");
    await page.getByLabel("Confirm password").fill("brewed-by-you-123");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(onPath("/checkout"), { timeout: 15_000 });
    await page.waitForLoadState("networkidle");
    const first = await placeOrder(page, "Pay ₱95 (demo)");
    const firstUrl = page.url();

    // 2. No points until the order is Completed.
    await page.goto("/rewards");
    await expect(page.getByTestId("points-balance")).toHaveText("0 points");
    await expect(page.getByText("First Sip (earned)")).toBeAttached();

    await setStatuses(admin, first, [
      "Brewing",
      "Ready for pickup",
      "Completed",
    ]);
    await page.reload();
    await expect(page.getByTestId("points-balance")).toHaveText("9 points");
    await expect(page.getByText("Earned from an order")).toBeVisible();

    // 3. The customer rates the item, once.
    await page.goto(firstUrl);
    await page.locator("label", { hasText: "5 stars" }).first().click();
    await page.getByLabel("Comment (optional)").fill("Lovely and flaky.");
    await page
      .getByRole("button", { name: "Submit rating for Butter Croissant" })
      .click();
    await expect(page.getByText(/you rated this 5 stars/)).toBeVisible({
      timeout: 15_000,
    });

    // 4. An admin adds points, which appear in the history with the reason.
    await admin.goto(`/admin/customers?q=${encodeURIComponent(email)}`);
    await admin.getByRole("link", { name: "Playwright Rewards" }).click();
    await admin.getByLabel("Points to add or remove").fill("200");
    await admin.getByLabel("Reason").fill("E2E goodwill");
    await admin.getByRole("button", { name: "Adjust points" }).click();
    await expect(admin.getByTestId("points-balance")).toHaveText("209", {
      timeout: 15_000,
    });
    await page.goto("/rewards");
    await expect(page.getByTestId("points-balance")).toHaveText("209 points");
    await expect(page.getByText("E2E goodwill")).toBeVisible();

    // 5. The points buy a free Olympus Latte: 150 points for ₱175.
    await addFromMenu(page, "Olympus Latte");
    await page.goto("/checkout");
    await page.waitForLoadState("networkidle");
    await page
      .getByLabel(/Use your points/)
      .selectOption({ label: "Olympus Latte: 150 points for ₱175 off" });
    await expect(page.getByTestId("checkout-total")).toHaveText("₱0");
    const free = await placeOrder(page, "Pay ₱0 (demo)");
    await expect(page.getByText("Discount (150 points)")).toBeVisible();
    await page.goto("/rewards");
    await expect(page.getByTestId("points-balance")).toHaveText("59 points");

    // 6. Cancelling the order returns the points.
    await setStatuses(admin, free, ["Cancelled"]);
    await page.reload();
    await expect(page.getByTestId("points-balance")).toHaveText("209 points");
    await expect(
      page.getByText("Returned from a cancelled order"),
    ).toBeVisible();

    // 7. Order history can reorder at current prices.
    await page.goto("/orders");
    await page.getByRole("button", { name: `Reorder ${first}` }).click();
    await expect(page.getByText(/Added to your cart/)).toBeVisible();

    // 8. A built drink is saved, added from favorites, then removed.
    await page.goto("/build?from=olympus-latte");
    const next = page.getByRole("button", { name: /^Next/ });
    for (let step = 0; step < 5; step++) await next.click();
    await page.getByRole("button", { name: "Save to favorites" }).click();
    await expect(page.getByText("Saved to your favorites.")).toBeVisible({
      timeout: 15_000,
    });
    await page.goto("/favorites");
    await expect(
      page.getByRole("heading", { name: "Custom Latte" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Add to cart: Custom Latte" })
      .click();
    await expect(page.getByText(/Added to your cart/)).toBeVisible();
    await page
      .getByRole("button", { name: "Remove Custom Latte from favorites" })
      .click();
    await expect(page.getByText("No saved drinks yet.")).toBeVisible({
      timeout: 15_000,
    });
  });
});
