import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/brand/logo";
import { SoundToggle } from "@/components/sound/sound-toggle";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { AccountSlot } from "./account-slot";
import { DesktopNav } from "./desktop-nav";
import { CART_HREF } from "./nav-items";

/**
 * Top bar. Desktop: logo, main links, cart, sound, theme, account menu.
 * Mobile: a slim bar with logo, sound and theme (the rest is in the tab bar).
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 md:h-16 md:px-6">
        <Logo />
        <DesktopNav />
        <div className="flex items-center gap-1">
          {/* Desktop-only items sit in hidden wrappers: the button styles set
              their own display, which would override `hidden` on the link. */}
          <div className="hidden md:flex">
            <Link
              href={CART_HREF}
              aria-label="Cart"
              className={buttonVariants({ variant: "ghost", size: "icon-lg" })}
            >
              <ShoppingBag className="size-5" aria-hidden="true" />
            </Link>
          </div>
          <SoundToggle />
          <ThemeToggle />
          {/* On phones, account links live on the Profile tab instead. */}
          <div className="ml-2 hidden md:flex">
            {/* The session is read per request; until it arrives, an empty
                placeholder keeps the header from shifting. */}
            <Suspense
              fallback={<div className="h-10 w-40" aria-hidden="true" />}
            >
              <AccountSlot />
            </Suspense>
          </div>
        </div>
      </div>
    </header>
  );
}
