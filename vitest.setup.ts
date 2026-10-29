// Adds DOM matchers such as toBeInTheDocument() to Vitest's expect.
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Server-only tests (e.g. PDF rendering) opt into `@vitest-environment node`,
// where there is no window: the browser stubs below are for jsdom only.
const hasDom = typeof window !== "undefined";

// jsdom has no matchMedia. next-themes uses it to read the system theme, so
// provide a stub that reports "light, no preference" by default.
if (hasDom) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

// Unmount rendered components and reset browser state between tests so they
// don't leak into each other.
afterEach(() => {
  if (!hasDom) return;
  cleanup();
  window.localStorage.clear();
  document.documentElement.className = "";
  document.documentElement.removeAttribute("style");
});
