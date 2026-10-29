import { loadEnvConfig } from "@next/env";
import { expect, test, type Page } from "@playwright/test";

// Runs in both Playwright projects: desktop (1280px) and mobile (375px).
loadEnvConfig(process.cwd());
const hasDatabase = Boolean(process.env.DATABASE_URL);

/** Options are visually hidden inputs inside cards; customers tap the card. */
const choose = (page: Page, name: RegExp) =>
  page.locator("label", { hasText: name }).first().click();
const next = (page: Page) => page.getByRole("button", { name: /^Next/ });
const onPath = (path: string) => (url: URL) => url.pathname === path;

test("the cart page opens for guests", async ({ page }) => {
  await page.goto("/cart");
  await expect(
    page.getByRole("heading", { level: 1, name: "Your cart" }),
  ).toBeVisible();
});

test("checkout asks signed-out visitors to log in", async ({ page }) => {
  await page.goto("/checkout");
  await expect(page).toHaveURL(/\/login\?next=%2Fcheckout$/);
});

test.describe("with a seeded database", () => {
  // TODO: CI has no database yet, so this skips there (docs/SETUP.md, "CI database").
  test.skip(!hasDatabase, "DATABASE_URL is not set");

  // Without a database the cart can't load the menu, so it shows
  // "Our menu is unavailable" instead of the empty-cart message.
  test("an empty cart invites the customer to the menu", async ({ page }) => {
    await page.goto("/cart");
    await expect(page.getByText("Your cart is empty.")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "View the menu" }),
    ).toHaveAttribute("href", "/menu");
  });

  test("build → cart → checkout → order created", async ({
    page,
  }, testInfo) => {
    // Sign-up, several server round trips to Neon and the demo payment pause.
    test.slow();
    await page.setExtraHTTPHeaders({
      "x-forwarded-for": `198.51.100.${Math.floor(Math.random() * 250) + 1}`,
    });

    // 1. Build a drink as a guest and add two cups.
    await page.goto("/build");
    await page.waitForLoadState("networkidle");
    await next(page).click();
    await choose(page, /^Latte/);
    await next(page).click();
    await choose(page, /^Oat milk/);
    await next(page).click();
    await next(page).click();
    await next(page).click();
    await expect(page.locator("#builder-step-heading")).toHaveText("Review");
    await page.getByRole("button", { name: "Add a cup" }).click();
    await page.getByRole("button", { name: "Add to cart" }).click();
    await expect(page.getByText("Added to your cart.")).toBeVisible();

    // 2. Add a pastry from the menu.
    await page.goto("/menu");
    await page
      .getByRole("button", { name: "Add Butter Croissant to cart" })
      .click();
    await expect(
      page.getByText("Butter Croissant added to your cart."),
    ).toBeAttached();

    // 3. The cart lists both, with the drink's price worked out again.
    await page.goto("/cart");
    const items = page.getByTestId("cart-item");
    await expect(items).toHaveCount(2);
    await expect(items.first()).toContainText("Custom Latte");
    // Latte ₱130 + oat ₱30 = ₱160, two cups; croissant ₱95.
    await expect(page.getByTestId("cart-subtotal")).toHaveText("₱415");

    // 4. Checkout needs an account: sign up, and the guest cart comes along.
    await page.getByRole("link", { name: "Proceed to checkout" }).click();
    await expect(page).toHaveURL(/\/login\?next=%2Fcheckout$/);
    await page.goto("/signup?next=/checkout");
    const email = `e2e-order-${testInfo.project.name}-${Date.now()}@hermes-express.test`;
    await page.getByLabel("Full name").fill("Playwright Orderer");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Mobile number").fill("0917 123 4567");
    await page
      .getByLabel("Password", { exact: true })
      .fill("brewed-by-you-123");
    await page.getByLabel("Confirm password").fill("brewed-by-you-123");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(onPath("/checkout"), { timeout: 15_000 });

    // 5. Pickup at the first scheduled time (works at any hour), demo GCash.
    await expect(page.getByLabel("Mobile number")).toHaveValue("0917 123 4567");
    await expect(page.getByLabel("Email for your receipt")).toHaveValue(email);
    await expect(
      page.getByText(/No real payment is made, and no card/),
    ).toBeVisible();
    await choose(page, /Schedule for later/);
    await expect(page.getByLabel("Time", { exact: true })).toBeVisible();
    await page
      .getByLabel("Note for the barista (optional)")
      .fill("Please write Playwright on the cup.");
    await expect(page.getByTestId("checkout-total")).toHaveText("₱415");
    await page.getByRole("button", { name: "Pay ₱415 (demo)" }).click();
    await expect(
      page.getByText("Processing your payment with GCash (Demo)…"),
    ).toBeVisible();

    // 6. The order page shows the new order.
    await expect(page).toHaveURL(/\/orders\/[0-9a-f-]{36}$/, {
      timeout: 20_000,
    });
    await expect(page.getByTestId("order-code")).toHaveText(/^HX-[2-9A-Z]{4}$/);
    await expect(page.getByTestId("order-status")).toHaveText("Received");
    await expect(page.getByText("2 × Custom Latte")).toBeVisible();
    await expect(page.getByText("1 × Butter Croissant")).toBeVisible();
    await expect(page.getByText(/No real payment was made/)).toBeVisible();

    // 7. The cart is empty again.
    await page.goto("/cart");
    await expect(page.getByText("Your cart is empty.")).toBeVisible();
  });
});
