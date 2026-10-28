import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Mirror the "@/*" path alias from tsconfig.json.
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/*.d.ts",
        // Generated shadcn/ui primitives: we own them but don't unit test them.
        "src/components/ui/**",
        // Database wiring and migrations need a real DB; covered by E2E later.
        "src/db/**",
        // Root HTML shell (fonts, <html>/<body>); covered by the Playwright smoke test.
        "src/app/layout.tsx",
      ],
      reporter: ["text", "html", "lcov"],
      thresholds: {
        // Overall floor for the whole app.
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
        // Business logic must be well tested (see CLAUDE.md).
        "src/lib/**": {
          lines: 90,
          functions: 90,
          branches: 90,
          statements: 90,
        },
        "src/server/**": {
          lines: 90,
          functions: 90,
          branches: 90,
          statements: 90,
        },
      },
    },
  },
});
