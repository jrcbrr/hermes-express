"use client";

import { cn } from "@/lib/utils";
import { desktopNavItems } from "./nav-items";
import { NavLink } from "./nav-link";

export function DesktopNav() {
  return (
    <nav aria-label="Main" className="hidden md:block">
      <ul className="flex items-center gap-1">
        {desktopNavItems.map(({ href, label }) => (
          <li key={href}>
            <NavLink
              href={href}
              className={(active) =>
                cn(
                  "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  active &&
                    "text-foreground underline decoration-primary decoration-2 underline-offset-8",
                )
              }
            >
              {() => label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
