import {
  Award,
  Coffee,
  CupSoda,
  House,
  Receipt,
  ShoppingBag,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { hasRole } from "@/lib/roles";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

/**
 * Desktop top bar links (docs/PLAN.md §4). Cart and account sit on the right.
 * Phones keep five bottom tabs; Receipts is reached from Profile instead.
 */
export const desktopNavItems: readonly NavItem[] = [
  { href: "/", label: "Home", icon: House },
  { href: "/menu", label: "Menu", icon: Coffee },
  { href: "/build", label: "Build Your Drink", icon: CupSoda },
  { href: "/rewards", label: "Rewards", icon: Award },
  { href: "/receipts", label: "Receipts", icon: Receipt },
];

/** Mobile bottom tabs. The middle one (Build) is the raised gold button. */
export const mobileTabItems: readonly NavItem[] = [
  { href: "/", label: "Home", icon: House },
  { href: "/menu", label: "Menu", icon: Coffee },
  { href: "/build", label: "Build", icon: CupSoda },
  { href: "/cart", label: "Cart", icon: ShoppingBag },
  { href: "/profile", label: "Profile", icon: UserRound },
];

export const CART_HREF = "/cart";
export const SIGN_IN_HREF = "/login";
export const SIGN_UP_HREF = "/signup";

export type AccountLink = { href: string; label: string };

/** Links in the signed-in account menu. Staff areas only show for their roles. */
export function accountMenuLinks(
  role: string | null | undefined,
): AccountLink[] {
  const links: AccountLink[] = [
    { href: "/profile", label: "Profile" },
    { href: "/orders", label: "Orders" },
    { href: "/favorites", label: "Favorites" },
    { href: "/receipts", label: "Receipts" },
    { href: "/rewards", label: "Rewards" },
  ];
  if (hasRole(role, ["barista", "admin"])) {
    links.push({ href: "/barista", label: "Barista" });
  }
  if (hasRole(role, ["admin"])) links.push({ href: "/admin", label: "Admin" });
  return links;
}

/** True when `href` is the current page or a parent section of it. */
export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
