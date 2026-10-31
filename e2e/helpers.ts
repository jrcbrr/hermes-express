import { expect, type Page } from "@playwright/test";

/** A hold that starts near this fill level lands inside the margin. */
const RELEASE_AT_PERCENT = 68;

const waitForGoldLine = (page: Page) =>
  page.waitForFunction(
    (at) =>
      Number(
        document
          .querySelector('[aria-label="Cup fill level"]')
          ?.getAttribute("aria-valuenow"),
      ) >= at,
    RELEASE_AT_PERCENT,
    { polling: "raf" },
  );

/** Holds Space until the gold line. */
export async function pourWithKeyboard(page: Page) {
  await page.getByRole("button", { name: "Hold to pour" }).focus();
  await page.keyboard.down("Space");
  await waitForGoldLine(page);
  await page.keyboard.up("Space");
}

/** Holds a real touch on the button until the gold line (Chromium only). */
export async function pourWithTouch(page: Page) {
  const box = await page
    .getByRole("button", { name: "Hold to pour" })
    .boundingBox();
  const point = { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 };
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [point],
  });
  await waitForGoldLine(page);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await cdp.detach();
}

/** Pours the project's way, trying again if a slow machine overshoots. */
export async function winPerfectPour(page: Page, projectName: string) {
  await expect(async () => {
    await (projectName === "mobile"
      ? pourWithTouch(page)
      : pourWithKeyboard(page));
    await expect(page.getByText("A perfect pour.")).toBeVisible({
      timeout: 2_000,
    });
  }).toPass({ timeout: 60_000 });
}

/**
 * Logs in, waiting out the limit of 5 attempts a minute per email: the tests run
 * in parallel and share the staff accounts.
 */
export async function logIn(
  page: Page,
  path: string,
  email: string,
  password: string,
) {
  await expect(async () => {
    await page.goto(`/login?next=${path}`);
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Log in" }).click();
    // Compare the path: the login URL also ends in the path (its ?next=).
    await expect(page).toHaveURL((url) => url.pathname === path, {
      timeout: 15_000,
    });
  }).toPass({ timeout: 120_000, intervals: [20_000] });
}
