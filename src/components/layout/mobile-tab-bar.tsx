"use client";

import { CartBadge, useCartCount } from "@/components/cart/cart-count";
import { cn } from "@/lib/utils";
import { CART_HREF, mobileTabItems } from "./nav-items";
import { NavLink } from "./nav-link";

const CENTER_INDEX = Math.floor(mobileTabItems.length / 2);

/** Phone-only bottom tab bar, like a native app. Hidden from md (768px) up. */
export function MobileTabBar() {
  const cartCount = useCartCount();

  return (
    <nav
      aria-label="Tabs"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-md grid-cols-5">
        {mobileTabItems.map(({ href, label, icon: Icon }, index) => {
          const isCenter = index === CENTER_INDEX;
          return (
            <li key={href} className="flex">
              <NavLink
                href={href}
                className={(active) =>
                  cn(
                    "flex flex-1 flex-col items-center justify-center gap-1 rounded-md text-xs font-medium",
                    active ? "text-foreground" : "text-muted-foreground",
                  )
                }
              >
                {(active) => (
                  <>
                    {isCenter ? (
                      <span
                        data-testid="build-tab-button"
                        className="-mt-8 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background"
                      >
                        <Icon className="size-6" aria-hidden="true" />
                      </span>
                    ) : (
                      <span className="relative">
                        <Icon
                          className={cn("size-5", active && "text-primary")}
                          aria-hidden="true"
                        />
                        {href === CART_HREF ? (
                          <CartBadge
                            count={cartCount}
                            className="-top-2 -right-3"
                          />
                        ) : null}
                      </span>
                    )}
                    <span>
                      {label}
                      {href === CART_HREF && cartCount > 0 ? (
                        <span className="sr-only">
                          , {cartCount} {cartCount === 1 ? "item" : "items"}
                        </span>
                      ) : null}
                    </span>
                  </>
                )}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
