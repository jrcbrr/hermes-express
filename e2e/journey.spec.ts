import { loadEnvConfig } from "@next/env";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { logIn as logInWithRetry, winPerfectPour } from "./helpers";

// The whole product as one story, in both projects: desktop and mobile (375px).
loadEnvConfig(process.cwd());
const adminEmail = process.env.SEED_ADMIN_EMAIL;
const adminPassword = process.env.SEED_ADMIN_PASSWORD;
const tipasPassword = process.env.SEED_BARISTA_TIPAS_PASSWORD;
const ready = Boolean(
  process.env.DATABASE_URL && adminEmail && adminPassword && tipasPassword,
);

/** Each project edits its own item, since they share one database. */
const PRODUCTS: Record<string, { name: string; slug: string }> = {
  desktop: { name: "Ensaymada", slug: "ensaymada" },
  mobile: { name: "Pain au Chocolat", slug: "pain-au-chocolat" },
};

const POLL_TIMEOUT = 20_000;
const fakeIp = () => `198.51.100.${Math.floor(Math.random() * 250) + 1}`;
const choose = (page: Page, name: RegExp) =>
  page.locator("label", { hasText: name }).first().click();

async function logIn(
  browser: Browser,
  customer: Page,
  baseURL: string | undefined,
  path: string,
  email: string,
  password: string,
): Promise<Page> {
  const context = await browser.newContext({
    baseURL,
    viewport: customer.viewportSize(),
    extraHTTPHeaders: { "x-forwarded-for": fakeIp() },
  });
  const page = await context.newPage();
  await logInWithRetry(page, path, email, password);
  return page;
}

test.describe("the full journey", () => {
  // TODO: CI has no database yet, so this skips there (docs/SETUP.md, "CI database").
  test.skip(!ready, "DATABASE_URL or the seed logins are not set");

  test("sign up, build, promo with points, track, barista, admin edit", async ({
    page,
    browser,
    baseURL,
  }, testInfo) => {
    test.setTimeout(420_000);
    await page.setExtraHTTPHeaders({ "x-forwarded-for": fakeIp() });

    // 1. A new customer signs up.
    const email = `e2e-journey-${testInfo.project.name}-${Date.now()}@hermes-express.test`;
    await page.goto("/signup");
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Full name").fill("Playwright Journey");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Mobile number").fill("0917 123 4567");
    await page
      .getByLabel("Password", { exact: true })
      .fill("brewed-by-you-123");
    await page.getByLabel("Confirm password").fill("brewed-by-you-123");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).not.toHaveURL(/signup/, { timeout: 15_000 });

    // 2. An admin grants them points to spend.
    const admin = await logIn(
      browser,
      page,
      baseURL,
      "/admin",
      adminEmail!,
      adminPassword!,
    );
    await admin.goto(`/admin/customers?q=${encodeURIComponent(email)}`);
    await admin.getByRole("link", { name: "Playwright Journey" }).click();
    await admin.getByLabel("Points to add or remove").fill("200");
    await admin.getByLabel("Reason").fill("E2E journey");
    await admin.getByRole("button", { name: "Adjust points" }).click();
    await expect(admin.getByTestId("points-balance")).toHaveText("200", {
      timeout: 15_000,
    });

    // 3. They build a ₱130 latte, winning the mini-game on the way.
    await page.goto("/build");
    await page.waitForLoadState("networkidle");
    const next = page.getByRole("button", { name: /^Next/ });
    await next.click();
    await choose(page, /^Latte/);
    await page.getByRole("button", { name: "Try the Perfect Pour" }).click();
    await winPerfectPour(page, testInfo.project.name);
    await expect(
      page.getByText("You have earned the Perfect Pour badge."),
    ).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Close" }).click();
    await next.click();
    await choose(page, /^Whole/);
    await next.click();
    await next.click();
    await next.click();
    await page.getByRole("button", { name: "Add to cart" }).click();
    await expect(page.getByText("Added to your cart.")).toBeVisible();

    // 4. Adds a ₱175 signature, the one the points will pay for.
    await page.goto("/menu");
    await page
      .getByRole("button", { name: "Add to cart: Olympus Latte" })
      .click();
    await expect(
      page.getByText("Olympus Latte added to your cart."),
    ).toBeAttached();

    // 5. Checkout: 150 points free the signature, then 10% off the ₱130 left.
    await page.goto("/checkout");
    await page.waitForLoadState("networkidle");
    await page
      .locator("label", { hasText: /^Tipas/ })
      .first()
      .click();
    await page
      .locator("label", { hasText: /Schedule for later/ })
      .first()
      .click();
    await page
      .getByLabel(/Use your points/)
      .selectOption({ label: "Olympus Latte: 150 points for ₱175 off" });
    await page.getByLabel("Promo code").fill("HERMES10");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByTestId("checkout-total")).toHaveText("₱117");
    await page.getByRole("button", { name: "Pay ₱117 (demo)" }).click();
    await expect(page).toHaveURL(/\/orders\/[0-9a-f-]{36}$/, {
      timeout: 30_000,
    });
    const code = (await page.getByTestId("order-code").textContent())!;
    const status = page.getByTestId("order-status");
    await expect(status).toHaveText("Received");

    // 6. The barista moves it along; the customer's open tracker follows.
    const barista = await logIn(
      browser,
      page,
      baseURL,
      "/barista",
      "barista.tipas@hermes-express.test",
      tipasPassword!,
    );
    const card = barista.locator(
      `[data-testid="queue-order"][data-code="${code}"]`,
    );
    await card.getByRole("button", { name: "Start brewing" }).click();
    await expect(status).toHaveText("Brewing", { timeout: POLL_TIMEOUT });
    await card.getByRole("button", { name: "Mark ready for pickup" }).click();
    await expect(status).toHaveText("Ready for pickup", {
      timeout: POLL_TIMEOUT,
    });
    await card.getByRole("button", { name: "Mark completed" }).click();
    await expect(status).toHaveText("Completed", { timeout: POLL_TIMEOUT });
    await barista.context().close();

    // 7. Rewards: 200 − 150 + 11 earned on the ₱117 paid, plus the new badge.
    await page.goto("/rewards");
    await expect(page.getByTestId("points-balance")).toHaveText("61 points");
    await expect(page.getByText("Perfect Pour (earned)")).toBeAttached();

    // 8. The dashboard counts the sale, and an admin edit reaches the menu.
    await admin.goto("/admin");
    await expect(
      admin.getByRole("region", { name: "Revenue by day" }),
    ).toBeVisible();
    await expect(
      admin
        .getByRole("region", { name: "Top items" })
        .locator("td", { hasText: "Custom drinks" }),
    ).toBeAttached({ timeout: 15_000 });

    const product = PRODUCTS[testInfo.project.name]!;
    await admin.goto("/admin/menu");
    const href = await admin
      .getByRole("link", { name: product.name, exact: true })
      .getAttribute("href");
    const editPath = `/admin/menu/${href!.split("/").at(-1)!}`;
    const setPrice = async (price: string) => {
      await admin.goto(editPath);
      await admin.waitForLoadState("networkidle");
      await admin.getByLabel("Price in pesos").fill(price);
      await admin.getByRole("button", { name: "Save changes" }).click();
      await expect(admin.getByText("Your changes are saved.")).toBeVisible({
        timeout: 15_000,
      });
    };
    await admin.goto(editPath);
    const original = await admin.getByLabel("Price in pesos").inputValue();
    const changed = original === "321" ? "322" : "321";
    try {
      await setPrice(changed);
      await page.goto("/menu");
      await expect(page.getByTestId(`product-${product.slug}`)).toContainText(
        `₱${changed}`,
      );
    } finally {
      await setPrice(original);
    }
    await admin.context().close();
  });
});
