"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { isActivePath, mobileTabItems } from "./nav-items";

const CENTER_INDEX = Math.floor(mobileTabItems.length / 2);

/** Phone-only bottom tab bar, like a native app. Hidden from md (768px) up. */
export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Tabs"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-md grid-cols-5">
        {mobileTabItems.map(({ href, label, icon: Icon }, index) => {
          const active = isActivePath(pathname, href);
          const isCenter = index === CENTER_INDEX;
          return (
            <li key={href} className="flex">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-1 rounded-md text-xs font-medium",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {isCenter ? (
                  <span
                    data-testid="build-tab-button"
                    className="-mt-8 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background"
                  >
                    <Icon className="size-6" aria-hidden="true" />
                  </span>
                ) : (
                  <Icon
                    className={cn("size-5", active && "text-primary")}
                    aria-hidden="true"
                  />
                )}
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
