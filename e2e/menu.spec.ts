import { loadEnvConfig } from "@next/env";
import { expect, test } from "@playwright/test";

// Runs in both Playwright projects: desktop (1280px) and mobile (375px).
loadEnvConfig(process.cwd());
const hasDatabase = Boolean(process.env.DATABASE_URL);

test("menu page renders without sideways scrolling", async ({ page }) => {
  await page.goto("/menu");
  await expect(
    page.getByRole("heading", { level: 1, name: "Menu" }),
  ).toBeVisible();
  await expect(
    page.getByRole("group", { name: "Showing availability at" }),
  ).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBe(0);
});

test.describe("with a seeded database", () => {
  // TODO(before Stage 5): CI has no database yet, so this skips there.
  test.skip(!hasDatabase, "DATABASE_URL is not set");

  test("shows every section with real prices and builder links", async ({
    page,
  }) => {
    await page.goto("/menu");
    for (const name of ["Signature Drinks", "Pastries", "Snacks"]) {
      await expect(page.getByRole("region", { name })).toBeVisible();
    }
    const olympus = page.getByTestId("product-olympus-latte");
    await expect(olympus).toContainText("₱175");
    await expect(
      olympus.getByRole("link", { name: "Customize Olympus Latte" }),
    ).toHaveAttribute("href", "/build?drink=olympus-latte");
    await expect(
      olympus.getByRole("button", { name: "Add Olympus Latte to cart" }),
    ).toBeDisabled();
  });

  test("sold-out labels follow the chosen branch, which is remembered", async ({
    page,
  }) => {
    await page.goto("/menu");
    const roll = page.getByTestId("product-cinnamon-roll");

    await page.getByRole("button", { name: "BGC" }).click();
    await expect(page.getByRole("button", { name: "BGC" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(roll).toContainText("Sold out at this branch");

    await page.reload();
    await expect(page.getByRole("button", { name: "BGC" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await page.getByRole("button", { name: "Tipas" }).click();
    await expect(page.getByRole("button", { name: "Tipas" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(roll).not.toContainText("Sold out");
  });

  test("landing page features the signature drinks", async ({ page }) => {
    await page.goto("/");
    const featured = page.getByRole("region", { name: "Featured drinks" });
    await expect(
      featured.getByRole("heading", { level: 3, name: "Olympus Latte" }),
    ).toBeVisible();
    await expect(
      featured.getByRole("link", { name: "Customize Olympus Latte" }),
    ).toHaveAttribute("href", "/build?drink=olympus-latte");
  });
});
