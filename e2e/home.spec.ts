import { expect, test } from "@playwright/test";

test("home page shows the brand name and tagline", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { level: 1, name: "Hermes Express" }),
  ).toBeVisible();
  await expect(
    page.getByText("Brewed by you. Delivered by Hermes."),
  ).toBeVisible();
  await expect(page).toHaveTitle(/Hermes Express/);
});
