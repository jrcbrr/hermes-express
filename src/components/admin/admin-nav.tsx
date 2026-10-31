"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/menu", label: "Menu" },
  { href: "/admin/ingredients", label: "Ingredients" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/promos", label: "Promos" },
] as const;

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="flex flex-col gap-1">
      {LINKS.map(({ href, label }) => {
        const current =
          href === "/admin"
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={current ? "page" : undefined}
              className={cn(
                "block rounded-lg px-3 py-2.5 font-medium hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                current && "bg-surface-muted font-bold",
              )}
            >
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * A sidebar from the md breakpoint up, and a drawer below it. The drawer is a
 * native <dialog>: the browser traps focus, closes on Esc and returns focus.
 */
export function AdminNav() {
  const drawer = useRef<HTMLDialogElement>(null);
  const close = () => drawer.current?.close();

  return (
    <>
      <nav aria-label="Admin" className="hidden w-52 shrink-0 md:block">
        <NavLinks />
      </nav>

      <div className="md:hidden">
        <button
          type="button"
          onClick={() => drawer.current?.showModal()}
          className="inline-flex h-11 items-center gap-2 rounded-lg border bg-surface px-3 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <Menu aria-hidden="true" className="size-5" />
          Admin menu
        </button>
        <dialog
          ref={drawer}
          aria-label="Admin menu"
          // A click on the backdrop lands on the dialog itself.
          onClick={(event) => {
            if (event.target === event.currentTarget) close();
          }}
          className="m-0 h-full max-h-none w-72 max-w-[85vw] border-r bg-surface p-0 text-foreground backdrop:bg-foreground/40"
        >
          <div className="flex flex-col gap-4 p-4">
            <div className="flex items-center justify-between">
              <p className="font-heading text-lg font-extrabold">Admin</p>
              <button
                type="button"
                onClick={close}
                aria-label="Close admin menu"
                className="inline-flex size-11 items-center justify-center rounded-lg hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </div>
            <nav aria-label="Admin">
              <NavLinks onNavigate={close} />
            </nav>
          </div>
        </dialog>
      </div>
    </>
  );
}
