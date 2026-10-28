"use client";

import { ChevronDown, UserRound } from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logOut } from "@/server/auth/actions";
import { accountMenuLinks, SIGN_IN_HREF, SIGN_UP_HREF } from "./nav-items";

export type AccountMenuUser = { name: string; email: string; role: string };

/** Header account area: log in / sign up, or the signed-in user's menu. */
export function AccountMenu({ user }: { user: AccountMenuUser | null }) {
  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href={SIGN_IN_HREF}
          className={buttonVariants({
            variant: "ghost",
            size: "lg",
            className: "px-3",
          })}
        >
          Log in
        </Link>
        <Link
          href={SIGN_UP_HREF}
          className={buttonVariants({ size: "lg", className: "px-4" })}
        >
          Sign up
        </Link>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" size="lg" className="gap-2 px-3" />}
      >
        <UserRound className="size-4" aria-hidden="true" />
        <span className="max-w-32 truncate">{user.name}</span>
        <ChevronDown className="size-4" aria-hidden="true" />
        <span className="sr-only">Open account menu</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="truncate">
            {user.email}
          </DropdownMenuLabel>
          {accountMenuLinks(user.role).map(({ href, label }) => (
            <DropdownMenuItem key={href} render={<Link href={href} />}>
              {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <form action={logOut}>
          <DropdownMenuItem
            nativeButton
            render={<button type="submit" className="w-full" />}
          >
            Log out
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
