import Link from "next/link";

/** Shown when the catalog can't be loaded (for example, the database is down). */
export function BuilderUnavailable() {
  return (
    <p
      role="status"
      className="mt-6 rounded-2xl border bg-surface p-5 text-muted-foreground"
    >
      The drink builder is unavailable at the moment. Please try again in a few
      minutes, or{" "}
      <Link href="/menu" className="font-semibold text-accent underline">
        browse the menu
      </Link>
      .
    </p>
  );
}
