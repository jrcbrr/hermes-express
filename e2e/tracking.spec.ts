import { loadEnvConfig } from "@next/env";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { logIn as logInWithRetry } from "./helpers";

// Runs in both Playwright projects: desktop (1280px) and mobile (375px).
loadEnvConfig(process.cwd());
const tipasPassword = process.env.SEED_BARISTA_TIPAS_PASSWORD;
const bgcPassword = process.env.SEED_BARISTA_BGC_PASSWORD;
const ready = Boolean(process.env.DATABASE_URL && tipasPassword && bgcPassword);

/** Longer than one 10-second poll. */
const POLL_TIMEOUT = 20_000;

const fakeIp = () => `198.51.100.${Math.floor(Math.random() * 250) + 1}`;

async function logInAsBarista(
  customerPage: Page,
  browser: Browser,
  baseURL: string | undefined,
  branch: string,
  password: string,
): Promise<Page> {
  const context = await browser.newContext({
    baseURL,
    // A new context starts at the default size: stay on this project's width.
    viewport: customerPage.viewportSize(),
    extraHTTPHeaders: { "x-forwarded-for": fakeIp() },
  });
  const page = await context.newPage();
  await logInWithRetry(
    page,
    "/barista",
    `barista.${branch}@hermes-express.test`,
    password,
  );
  return page;
}

test.describe("order tracking", () => {
  // TODO: CI has no database yet, so this skips there (docs/SETUP.md, "CI database").
  test.skip(!ready, "DATABASE_URL or the barista passwords are not set");

  test("a barista advances an order and the customer sees it update", async ({
    page,
    browser,
    baseURL,
  }, testInfo) => {
    // Two accounts, many round trips to Neon, and three 10-second polls.
    test.setTimeout(240_000);
    await page.setExtraHTTPHeaders({ "x-forwarded-for": fakeIp() });

    // 1. A customer orders a pastry from Tipas, scheduled so any hour works.
    await page.goto("/menu");
    await page
      .getByRole("button", { name: "Add to cart: Butter Croissant" })
      .click();
    await expect(
      page.getByText("Butter Croissant added to your cart."),
    ).toBeAttached();

    await page.goto("/signup?next=/checkout");
    const email = `e2e-track-${testInfo.project.name}-${Date.now()}@hermes-express.test`;
    await page.getByLabel("Full name").fill("Playwright Tracker");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Mobile number").fill("0917 123 4567");
    await page
      .getByLabel("Password", { exact: true })
      .fill("brewed-by-you-123");
    await page.getByLabel("Confirm password").fill("brewed-by-you-123");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL((url) => url.pathname === "/checkout", {
      timeout: 15_000,
    });
    await page
      .locator("label", { hasText: /^Tipas/ })
      .first()
      .click();
    await page
      .locator("label", { hasText: /Schedule for later/ })
      .first()
      .click();
    await expect(page.getByLabel("Time", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: /^Pay .* \(demo\)$/ }).click();
    await expect(page).toHaveURL(/\/orders\/[0-9a-f-]{36}$/, {
      timeout: 30_000,
    });
    const orderUrl = new URL(page.url()).pathname;
    const code = (await page.getByTestId("order-code").textContent())!;
    const status = page.getByTestId("order-status");
    await expect(status).toHaveText("Received");
    await expect(page.getByTestId("receipt-number")).toBeVisible();

    // 2. Another branch's barista can't see or open it.
    const bgc = await logInAsBarista(
      page,
      browser,
      baseURL,
      "bgc",
      bgcPassword!,
    );
    await expect(
      bgc.getByRole("heading", { level: 1, name: "Barista queue" }),
    ).toBeVisible();
    // Wait for the board first: before it loads, no card would prove nothing.
    await expect(bgc.getByTestId("queue-group-received")).toBeVisible();
    await expect(
      bgc.locator(`[data-testid="queue-order"][data-code="${code}"]`),
    ).toHaveCount(0);
    // Asking for Tipas by link still returns only their own branch's orders.
    const queue = await bgc.request.get("/api/barista/queue?branch=tipas");
    expect(await queue.text()).not.toContain(code);
    const tracking = await bgc.request.get(`/api${orderUrl}/status`);
    expect(tracking.status()).toBe(404);
    await bgc.goto(orderUrl);
    await expect(bgc.getByTestId("order-tracker")).toHaveCount(0);
    await expect(
      bgc.getByText(/could not be found|not found|could not find/i),
    ).toBeVisible();
    await expect(bgc.getByTestId("order-code")).toHaveCount(0);
    await bgc.context().close();

    // 3. The Tipas barista finds it, marked as scheduled.
    const barista = await logInAsBarista(
      page,
      browser,
      baseURL,
      "tipas",
      tipasPassword!,
    );
    const card = barista.locator(
      `[data-testid="queue-order"][data-code="${code}"]`,
    );
    await expect(card).toBeVisible();
    await expect(card.getByTestId("queue-scheduled")).toBeVisible();

    // 4. Each tap reaches the customer's open page without a reload.
    await card.getByRole("button", { name: "Start brewing" }).click();
    await expect(
      barista.getByTestId("queue-group-brewing").getByText(code),
    ).toBeVisible();
    await expect(status).toHaveText("Brewing", { timeout: POLL_TIMEOUT });

    await card.getByRole("button", { name: "Mark ready for pickup" }).click();
    await expect(status).toHaveText("Ready for pickup", {
      timeout: POLL_TIMEOUT,
    });

    await card.getByRole("button", { name: "Mark completed" }).click();
    await expect(card).toHaveCount(0);
    await expect(status).toHaveText("Completed", { timeout: POLL_TIMEOUT });

    await barista.context().close();
  });

  test("a sold-out toggle reaches the menu at that branch only", async ({
    page,
    browser,
    baseURL,
  }, testInfo) => {
    // One project only: both would flip the same item in the same database.
    test.skip(testInfo.project.name !== "desktop", "Runs once");
    test.slow();

    const barista = await logInAsBarista(
      page,
      browser,
      baseURL,
      "tipas",
      tipasPassword!,
    );
    await barista.goto("/barista/stock");
    const toggle = barista.getByRole("switch", {
      name: "Ensaymada sold out",
    });
    // The first visit compiles the page on the dev server.
    await expect(toggle).toHaveAttribute("aria-checked", "false", {
      timeout: 15_000,
    });
    const setBranch = (slug: string) =>
      page
        .context()
        .addCookies([
          { name: "hx_menu_branch", value: slug, url: baseURL ?? "" },
        ]);
    const card = page.getByTestId("product-ensaymada");

    try {
      await toggle.click();
      await expect(toggle).toHaveAttribute("aria-checked", "true");
      await expect(toggle).toBeEnabled();

      await setBranch("tipas");
      await page.goto("/menu");
      await expect(card.getByText("Sold out at this branch")).toBeVisible();

      await setBranch("bgc");
      await page.goto("/menu");
      await expect(card).toBeVisible();
      await expect(card.getByText("Sold out at this branch")).toHaveCount(0);
    } finally {
      // Leave the shared dev database as it was found.
      if ((await toggle.getAttribute("aria-checked")) === "true") {
        await toggle.click();
        await expect(toggle).toHaveAttribute("aria-checked", "false");
        await expect(toggle).toBeEnabled();
      }
      await barista.context().close();
    }
  });
});
