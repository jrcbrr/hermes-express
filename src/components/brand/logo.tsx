import Link from "next/link";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/config/site";
import { LogoMark } from "./logo-mark";

/** The mark plus the "Hermes Express" wordmark, linking to the home page. */
export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "inline-flex items-center gap-2 rounded-md font-heading text-lg font-extrabold tracking-tight whitespace-nowrap",
        className,
      )}
    >
      <LogoMark className="size-8 text-primary" />
      <span>{siteConfig.name}</span>
    </Link>
  );
}
