import Link from "next/link";
import type { ReactNode } from "react";

/** A native select or similar control, matching the app's inputs. */
export const controlClass =
  "h-11 w-full rounded-lg border border-input bg-surface px-2.5 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent md:text-sm";

export const linkClass =
  "font-medium text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export function AdminHeading({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="font-heading text-3xl font-extrabold tracking-tight">
        {title}
      </h1>
      {action}
    </div>
  );
}

/** Previous and Next links that keep the current filters. */
export function Pager({
  path,
  params,
  page,
  hasMore,
}: {
  path: string;
  params: Record<string, string | null>;
  page: number;
  hasMore: boolean;
}) {
  const href = (target: number) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) query.set(key, value);
    }
    if (target > 1) query.set("page", String(target));
    const text = query.toString();
    return text ? `${path}?${text}` : path;
  };
  if (page === 1 && !hasMore) return null;
  return (
    <nav aria-label="Pages" className="mt-6 flex justify-between gap-4 text-sm">
      {page > 1 ? (
        <Link href={href(page - 1)} className={linkClass}>
          Previous page
        </Link>
      ) : (
        <span />
      )}
      {hasMore ? (
        <Link href={href(page + 1)} className={linkClass}>
          Next page
        </Link>
      ) : null}
    </nav>
  );
}
