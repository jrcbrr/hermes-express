import AxeBuilder from "@axe-core/playwright";
import { loadEnvConfig } from "@next/env";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { logIn as logInWithRetry } from "./helpers";

// Automated WCAG A/AA checks, in both projects and both themes. Axe finds about
// a third of real issues; it does not replace keyboard and screen reader checks.
loadEnvConfig(process.cwd());
const adminEmail = process.env.SEED_ADMIN_EMAIL;
const adminPassword = process.env.SEED_ADMIN_PASSWORD;
const tipasPassword = process.env.SEED_BARISTA_TIPAS_PASSWORD;
const hasDatabase = Boolean(process.env.DATABASE_URL);
const hasStaff = Boolean(
  hasDatabase && adminEmail && adminPassword && tipasPassword,
);

const fakeIp = () => `198.51.100.${Math.floor(Math.random() * 250) + 1}`;
const THEMES = ["light", "dark"] as const;

async function expectNoViolations(page: Page) {
  await page.waitForLoadState("networkidle");
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const summary = violations.map(
    (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
  );
  expect(summary).toEqual([]);
}

for (const colorScheme of THEMES) {
  test.describe(`accessibility in the ${colorScheme} theme`, () => {
    test.use({ colorScheme });

    for (const path of ["/", "/menu", "/login", "/signup", "/credits"]) {
      test(`${path} has no violations`, async ({ page }) => {
        await page.goto(path);
        await expectNoViolations(page);
      });
    }

    test("the 404 page has no violations", async ({ page }) => {
      const response = await page.goto("/no-such-page");
      expect(response?.status()).toBe(404);
      await expect(
        page.getByRole("heading", { name: "We could not find that page" }),
      ).toBeVisible();
      await expectNoViolations(page);
    });

    test("every builder step has no violations", async ({ page }) => {
      test.skip(!hasDatabase, "DATABASE_URL is not set");
      test.setTimeout(180_000);
      await page.goto("/build?from=olympus-latte");
      await expectNoViolations(page);
      const next = page.getByRole("button", { name: /^Next/ });
      await next.click();
      await page.getByRole("button", { name: "Try the Perfect Pour" }).click();
      await expect(page.getByTestId("perfect-pour")).toBeVisible();
      await expectNoViolations(page);
      for (let step = 0; step < 4; step++) {
        await next.click();
        await expectNoViolations(page);
      }
    });

    test("customer pages have no violations", async ({ page }, testInfo) => {
      test.skip(!hasDatabase, "DATABASE_URL is not set");
      test.setTimeout(240_000);
      await page.setExtraHTTPHeaders({ "x-forwarded-for": fakeIp() });
      await page.goto("/menu");
      await page
        .getByRole("button", { name: "Add to cart: Butter Croissant" })
        .click();
      await expect(
        page.getByText("Butter Croissant added to your cart."),
      ).toBeAttached();
      await page.goto("/signup?next=/checkout");
      await page.waitForLoadState("networkidle");
      await page.getByLabel("Full name").fill("Playwright Access");
      await page
        .getByLabel("Email", { exact: true })
        .fill(
          `e2e-a11y-${colorScheme}-${testInfo.project.name}-${Date.now()}@hermes-express.test`,
        );
      await page.getByLabel("Mobile number").fill("0917 123 4567");
      await page
        .getByLabel("Password", { exact: true })
        .fill("brewed-by-you-123");
      await page.getByLabel("Confirm password").fill("brewed-by-you-123");
      await page.getByRole("button", { name: "Create account" }).click();
      await expect(page).toHaveURL((url) => url.pathname === "/checkout", {
        timeout: 15_000,
      });
      await expectNoViolations(page);

      await page.goto("/cart");
      await expectNoViolations(page);

      await page.goto("/checkout");
      await page.waitForLoadState("networkidle");
      await page
        .locator("label", { hasText: /Schedule for later/ })
        .first()
        .click();
      await page.getByRole("button", { name: /^Pay .* \(demo\)$/ }).click();
      await expect(page).toHaveURL(/\/orders\/[0-9a-f-]{36}$/, {
        timeout: 30_000,
      });
      await expect(page.getByTestId("order-tracker")).toBeVisible();
      await expectNoViolations(page);

      for (const path of [
        "/orders",
        "/receipts",
        "/favorites",
        "/rewards",
        "/profile",
      ]) {
        await page.goto(path);
        await expectNoViolations(page);
      }
    });

    test("staff pages have no violations", async ({ browser, baseURL }) => {
      test.skip(!hasStaff, "the seed logins are not set");
      test.setTimeout(240_000);
      const open = (
        b: Browser,
        path: string,
        email: string,
        password: string,
      ) => logIn(b, baseURL, colorScheme, path, email, password);

      const barista = await open(
        browser,
        "/barista",
        "barista.tipas@hermes-express.test",
        tipasPassword!,
      );
      await expectNoViolations(barista);
      await barista.goto("/barista/stock");
      await expectNoViolations(barista);
      await barista.context().close();

      const admin = await open(browser, "/admin", adminEmail!, adminPassword!);
      await expect(
        admin.getByRole("region", { name: "Revenue by day" }),
      ).toBeVisible({ timeout: 20_000 });
      await expectNoViolations(admin);
      for (const path of [
        "/admin/orders",
        "/admin/menu",
        "/admin/ingredients",
        "/admin/promos",
        "/admin/customers",
      ]) {
        await admin.goto(path);
        await expectNoViolations(admin);
      }
      await admin.context().close();
    });
  });
}

async function logIn(
  browser: Browser,
  baseURL: string | undefined,
  colorScheme: (typeof THEMES)[number],
  path: string,
  email: string,
  password: string,
): Promise<Page> {
  const context = await browser.newContext({
    baseURL,
    colorScheme,
    extraHTTPHeaders: { "x-forwarded-for": fakeIp() },
  });
  const page = await context.newPage();
  await logInWithRetry(page, path, email, password);
  return page;
}
