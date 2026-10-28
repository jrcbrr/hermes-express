import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "./theme-provider";
import { ThemeToggle } from "./theme-toggle";

function renderToggle() {
  return render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  );
}

function mockSystemDark(isDark: boolean) {
  vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
    matches: isDark && query === "(prefers-color-scheme: dark)",
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

afterEach(() => {
  mockSystemDark(false);
});

describe("ThemeToggle", () => {
  it("has an accessible name", () => {
    renderToggle();
    expect(
      screen.getByRole("button", { name: "Toggle dark mode" }),
    ).toBeInTheDocument();
  });

  it("follows the system theme by default", () => {
    mockSystemDark(true);
    renderToggle();
    expect(document.documentElement).toHaveClass("dark");
    expect(window.localStorage.getItem("theme")).toBeNull();
  });

  it("switches between light and dark and remembers the choice", () => {
    renderToggle();
    const button = screen.getByRole("button", { name: "Toggle dark mode" });
    expect(document.documentElement).not.toHaveClass("dark");

    fireEvent.click(button);
    expect(document.documentElement).toHaveClass("dark");
    expect(window.localStorage.getItem("theme")).toBe("dark");

    fireEvent.click(button);
    expect(document.documentElement).not.toHaveClass("dark");
    expect(window.localStorage.getItem("theme")).toBe("light");
  });
});
