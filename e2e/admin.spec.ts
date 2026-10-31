import { loadEnvConfig } from "@next/env";
import { expect, test, type Page } from "@playwright/test";

// Runs in both Playwright projects: desktop (1280px) and mobile (375px).
loadEnvConfig(process.cwd());
const adminEmail = process.env.SEED_ADMIN_EMAIL;
const adminPassword = process.env.SEED_ADMIN_PASSWORD;
const ready = Boolean(process.env.DATABASE_URL && adminEmail && adminPassword);

const fakeIp = () => `198.51.100.${Math.floor(Math.random() * 250) + 1}`;

/** The two projects run at once on one database, so each edits its own item. */
const PRODUCTS: Record<string, { name: string; slug: string }> = {
  desktop: { name: "Banana Bread", slug: "banana-bread" },
  mobile: { name: "Blueberry Muffin", slug: "blueberry-muffin" },
};

async function logInAsAdmin(page: Page) {
  await page.goto("/login?next=/admin");
  await page.getByLabel("Email").fill(adminEmail!);
  await page.getByLabel("Password").fill(adminPassword!);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL((url) => url.pathname === "/admin", {
    timeout: 15_000,
  });
}

async function setPrice(page: Page, productId: string, price: string) {
  await page.goto(`/admin/menu/${productId}`);
  const field = page.getByLabel("Price in pesos");
  await expect(field).toBeVisible();
  await field.fill(price);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Your changes are saved.")).toBeVisible({
    timeout: 15_000,
  });
}

test.describe("admin", () => {
  // TODO: CI has no database yet, so this skips there (docs/SETUP.md, "CI database").
  test.skip(!ready, "DATABASE_URL or the seed admin login is not set");

  test("an admin changes a price and the menu shows it", async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);
    await page.setExtraHTTPHeaders({ "x-forwarded-for": fakeIp() });
    const product = PRODUCTS[testInfo.project.name]!;

    await logInAsAdmin(page);
    await page.goto("/admin/menu");
    const link = page.getByRole("link", { name: product.name, exact: true });
    const href = await link.getAttribute("href");
    const productId = href!.split("/").at(-1)!;

    await page.goto(`/admin/menu/${productId}`);
    const original = await page.getByLabel("Price in pesos").inputValue();
    // A price the seed never uses, and different on a retry after a crash.
    const changed = original === "321" ? "322" : "321";

    try {
      await setPrice(page, productId, changed);
      await page.goto("/menu");
      await expect(page.getByTestId(`product-${product.slug}`)).toContainText(
        `₱${changed}`,
      );
    } finally {
      await setPrice(page, productId, original);
    }
    await page.goto("/menu");
    await expect(page.getByTestId(`product-${product.slug}`)).toContainText(
      `₱${original}`,
    );
  });

  test("the admin area works from its navigation", async ({ page }) => {
    test.setTimeout(120_000);
    await page.setExtraHTTPHeaders({ "x-forwarded-for": fakeIp() });
    await logInAsAdmin(page);
    await expect(
      page.getByRole("region", { name: "All branches" }),
    ).toBeVisible();

    const drawerButton = page.getByRole("button", { name: "Admin menu" });
    if (await drawerButton.isVisible()) await drawerButton.click();
    await page
      .getByRole("navigation", { name: "Admin" })
      .getByRole("link", { name: "Customers" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Customers" }),
    ).toBeVisible();
  });

  test("a customer is turned away from the admin area", async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);
    await page.setExtraHTTPHeaders({ "x-forwarded-for": fakeIp() });
    const email = `e2e-noadmin-${testInfo.project.name}-${Date.now()}@hermes-express.test`;
    await page.goto("/signup");
    await page.getByLabel("Full name").fill("Playwright Customer");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Mobile number").fill("0917 123 4567");
    await page
      .getByLabel("Password", { exact: true })
      .fill("brewed-by-you-123");
    await page.getByLabel("Confirm password").fill("brewed-by-you-123");
    await page.getByRole("button", { name: /sign up|create/i }).click();
    await expect(page).not.toHaveURL(/signup/, { timeout: 15_000 });

    await page.goto("/admin/customers");
    await expect(page).toHaveURL((url) => url.pathname === "/");
    await expect(page.getByRole("heading", { name: "Customers" })).toHaveCount(
      0,
    );
  });
});
