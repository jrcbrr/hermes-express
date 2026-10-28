"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

/**
 * Switches between light and dark. The icon swaps through the `dark:` CSS
 * variant instead of JavaScript, so server and client render the same markup.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon-lg"
      aria-label="Toggle dark mode"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Sun className="size-5 dark:hidden" aria-hidden="true" />
      <Moon className="hidden size-5 dark:block" aria-hidden="true" />
    </Button>
  );
}
