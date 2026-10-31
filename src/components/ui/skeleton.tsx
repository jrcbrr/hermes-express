import { cn } from "@/lib/utils";

/** A placeholder block. The pulse stops under reduced motion (motion-safe). */
export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      data-testid="skeleton"
      className={cn(
        "rounded-md bg-surface-muted motion-safe:animate-pulse",
        className,
      )}
      {...props}
    />
  );
}
