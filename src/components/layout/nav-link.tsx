"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { isActivePath } from "./nav-items";

type NavLinkProps = {
  href: string;
  className: (active: boolean) => string;
  children: (active: boolean) => ReactNode;
};

/**
 * A navigation link that marks the current page. Reading the URL happens
 * only here, inside <Suspense>: on pages with a dynamic part such as
 * /orders/[id], the URL is unknown while Next.js prerenders the shared
 * layout, so the link first renders as "not current" and updates on load.
 */
export function NavLink(props: NavLinkProps) {
  return (
    <Suspense fallback={<PlainNavLink {...props} active={false} />}>
      <CurrentNavLink {...props} />
    </Suspense>
  );
}

function CurrentNavLink(props: NavLinkProps) {
  const pathname = usePathname();
  return (
    <PlainNavLink {...props} active={isActivePath(pathname, props.href)} />
  );
}

function PlainNavLink({
  href,
  className,
  children,
  active,
}: NavLinkProps & { active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={className(active)}
    >
      {children(active)}
    </Link>
  );
}
