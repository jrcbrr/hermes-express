/** Shown when the catalog can't be loaded (for example, the database is down). */
export function MenuUnavailable() {
  return (
    <p
      role="status"
      className="mt-6 rounded-2xl border bg-surface p-5 text-muted-foreground"
    >
      Our menu is unavailable at the moment. Please try again in a few minutes.
    </p>
  );
}
