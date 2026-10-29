import { loadEnvConfig } from "@next/env";
import { expect, test, type Page } from "@playwright/test";

// Runs in both Playwright projects: desktop (1280px) and mobile (375px).
loadEnvConfig(process.cwd());
const hasDatabase = Boolean(process.env.DATABASE_URL);

/** Options are visually hidden inputs inside cards; customers tap the card. */
const choose = (page: Page, name: RegExp) =>
  page.locator("label", { hasText: name }).first().click();
const price = (page: Page) => page.getByTestId("live-price");
const next = (page: Page) => page.getByRole("button", { name: /^Next/ });

test("builder page renders without sideways scrolling", async ({ page }) => {
  await page.goto("/build");
  await expect(
    page.getByRole("heading", { level: 1, name: "Build your drink" }),
  ).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBe(0);
});

test.describe("with a seeded database", () => {
  // TODO(before Stage 5): CI has no database yet, so this skips there.
  test.skip(!hasDatabase, "DATABASE_URL is not set");

  test("builds a drink step by step with a live price and undo", async ({
    page,
  }) => {
    await page.goto("/build");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("#builder-step-heading")).toHaveText("Cup");

    // Keyboard: arrow keys move between sizes.
    await page.getByRole("radio", { name: /12oz/ }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("radio", { name: /16oz/ })).toBeChecked();
    await choose(page, /^Iced/);
    await expect(page.getByRole("slider", { name: "Ice" })).toBeVisible();

    await next(page).click();
    await expect(next(page)).toBeDisabled();
    await choose(page, /^Latte/);
    await expect(price(page)).toHaveText("₱150");

    await next(page).click();
    await choose(page, /^Oat milk/);
    await expect(price(page)).toHaveText("₱180");

    await next(page).click();
    await choose(page, /^Vanilla/);
    await expect(price(page)).toHaveText("₱200");

    await next(page).click();
    await choose(page, /^Cold Foam/);
    await expect(price(page)).toHaveText("₱230");
    await expect(page.getByTestId("topping-cold-foam")).toBeVisible();

    await page.getByRole("button", { name: "Undo" }).click();
    await expect(price(page)).toHaveText("₱200");

    await next(page).click();
    await expect(page.locator("#builder-step-heading")).toHaveText("Review");
    await page.getByLabel("Name your drink (optional)").fill("Monday Fuel");
    await page.getByRole("button", { name: /Show price details/ }).click();
    const breakdown = page.getByRole("list", { name: "Price breakdown" });
    await expect(breakdown).toContainText("Oat milk");
    await expect(breakdown).toContainText("Vanilla");
    await expect(
      page.getByRole("button", { name: "Add to cart" }),
    ).toBeDisabled();
  });

  test("opens a signature drink at its menu price", async ({ page }) => {
    await page.goto("/build?from=olympus-latte");
    await expect(page.getByText("Customizing")).toContainText("Olympus Latte");
    await expect(price(page)).toHaveText("₱175");
  });

  test("shows the finished drink without animation for reduced motion", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/build?from=olympus-latte");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("button", { name: "Mix again" })).toHaveCount(
      0,
    );
    await page.getByRole("button", { name: /^Milk/ }).click();
    await choose(page, /^Whole milk/);
    await expect(page.getByTestId("builder-cup")).toHaveAttribute(
      "data-phase",
      "mixed",
    );
    await expect(page.getByTestId("pour-stream")).toHaveCount(0);
  });

  test("the menu's Customize link opens the builder", async ({ page }) => {
    await page.goto("/menu");
    await page.getByRole("link", { name: "Customize Winged Mocha" }).click();
    await expect(page).toHaveURL(/\/build\?from=winged-mocha/);
    await expect(price(page)).toHaveText("₱185");
  });

  test("keeps Back and Next above the tab bar on phones", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "phone layout only");
    await page.goto("/build");
    const nav = await page.getByRole("button", { name: "Back" }).boundingBox();
    const tabs = await page
      .getByRole("navigation", { name: "Tabs" })
      .boundingBox();
    expect(nav).not.toBeNull();
    expect(tabs).not.toBeNull();
    expect(nav!.y + nav!.height).toBeLessThanOrEqual(tabs!.y);
  });
});
