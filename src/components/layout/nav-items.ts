import {
  Award,
  Coffee,
  CupSoda,
  House,
  ShoppingBag,
  UserRound,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

/** Desktop top bar links (docs/PLAN.md §4). Cart and account sit on the right. */
export const desktopNavItems: readonly NavItem[] = [
  { href: "/", label: "Home", icon: House },
  { href: "/menu", label: "Menu", icon: Coffee },
  { href: "/build", label: "Build Your Drink", icon: CupSoda },
  { href: "/rewards", label: "Rewards", icon: Award },
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

/** True when `href` is the current page or a parent section of it. */
export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
