import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;
// A dedicated port so E2E never reuses some other app running on the default 3000.
const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  // Refuses to run against the production database (see the file for why).
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: true,
  // Fail the CI build if someone leaves test.only in the code.
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: isCI ? [["html", { open: "never" }], ["github"]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  // Every page must work on desktop and on a 375px-wide phone (see CLAUDE.md).
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"], viewport: { width: 375, height: 812 } },
    },
  ],
  webServer: {
    // CI tests the production build; locally the dev server is faster to iterate on.
    command: isCI
      ? `npm run start -- --port ${PORT}`
      : `npm run dev -- --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
