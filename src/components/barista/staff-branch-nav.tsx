import Link from "next/link";
import { cn } from "@/lib/utils";
import type { StaffBranches } from "@/server/barista/branch";

/** Moves between Queue and Stock and, for admins, between branches. */
export function StaffBranchNav({
  branches,
  page,
}: {
  branches: StaffBranches;
  page: "/barista" | "/barista/stock";
}) {
  const { current, switchable } = branches;
  const withBranch = (path: string, slug: string) =>
    switchable.length > 0 ? `${path}?branch=${slug}` : path;
  const linkClass =
    "font-medium text-accent underline-offset-4 hover:underline";

  return (
    <nav aria-label="Staff" className="mt-3 flex flex-col gap-2 text-sm">
      <p>
        {page === "/barista" ? (
          <Link
            href={withBranch("/barista/stock", current.slug)}
            className={linkClass}
          >
            Manage sold-out items
          </Link>
        ) : (
          <Link
            href={withBranch("/barista", current.slug)}
            className={linkClass}
          >
            Back to the queue
          </Link>
        )}
      </p>
      {switchable.length > 0 ? (
        <ul className="flex flex-wrap gap-3">
          {switchable.map((b) => (
            <li key={b.id}>
              <Link
                href={withBranch(page, b.slug)}
                aria-current={b.id === current.id ? "page" : undefined}
                className={cn(
                  linkClass,
                  b.id === current.id && "font-bold underline",
                )}
              >
                {b.name}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </nav>
  );
}
