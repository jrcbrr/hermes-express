import { expect, test } from "@playwright/test";

// Runs in both Playwright projects: desktop (1280px) and mobile (375px).

const sections = [
  "How it works",
  "Featured drinks",
  "Craft it, layer by layer",
  "Earn points with every cup",
  "Visit a branch",
];

test("landing page renders every section without sideways scrolling", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Hermes Express/);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Brewed by you. Delivered by Hermes.",
    }),
  ).toBeVisible();
  await expect(page.getByTestId("hero-cup")).toBeVisible();
  for (const name of sections) {
    await expect(page.getByRole("region", { name })).toBeVisible();
  }
  await expect(page.getByRole("contentinfo")).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBe(0);
});

test("shows the right navigation for the screen size", async ({
  page,
  isMobile,
}) => {
  await page.goto("/");
  const mainNav = page.getByRole("navigation", { name: "Main" });
  const tabBar = page.getByRole("navigation", { name: "Tabs" });

  if (isMobile) {
    await expect(tabBar).toBeVisible();
    await expect(mainNav).toBeHidden();
    await expect(tabBar.getByTestId("build-tab-button")).toBeVisible();
  } else {
    await expect(mainNav).toBeVisible();
    await expect(tabBar).toBeHidden();
    await expect(page.getByRole("link", { name: "Log in" })).toBeVisible();
  }
});

test("theme toggle switches to dark mode and remembers it", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  // Wait for hydration so the click reaches React.
  await page.goto("/", { waitUntil: "networkidle" });
  const html = page.locator("html");
  await expect(html).not.toHaveClass(/dark/);

  await page.getByRole("button", { name: "Toggle dark mode" }).click();
  await expect(html).toHaveClass(/dark/);

  await page.reload();
  await expect(html).toHaveClass(/dark/);
});

test("sound mute is remembered after a reload", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  const toggle = page.getByRole("button", { name: "Mute sounds" });
  await expect(toggle).toHaveAttribute("aria-pressed", "false");

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");

  await page.reload();
  await expect(
    page.getByRole("button", { name: "Mute sounds" }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("cup animations stop when the visitor prefers reduced motion", async ({
  page,
}) => {
  const countAnimations = () =>
    page
      .getByTestId("hero-cup")
      .evaluate((svg) => svg.getAnimations({ subtree: true }).length);

  await page.goto("/");
  expect(await countAnimations()).toBeGreaterThan(0);

  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await countAnimations()).toBe(0);
});
