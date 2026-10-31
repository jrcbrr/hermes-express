import { Skeleton } from "@/components/ui/skeleton";

/** The loading state for a route: a heading and a list or grid of cards. */
export function PageSkeleton({
  cards = 6,
  layout = "grid",
}: {
  cards?: number;
  layout?: "grid" | "list";
}) {
  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <p role="status" className="sr-only">
        Loading…
      </p>
      <Skeleton className="h-9 w-56" />
      <Skeleton className="mt-3 h-4 w-72 max-w-full" />
      <div
        className={
          layout === "grid"
            ? "mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            : "mt-8 flex flex-col gap-4"
        }
      >
        {Array.from({ length: cards }, (_, index) => (
          <Skeleton
            key={index}
            className={
              layout === "grid" ? "h-56 rounded-2xl" : "h-24 rounded-2xl"
            }
          />
        ))}
      </div>
    </div>
  );
}
