import { Award } from "lucide-react";
import { BADGES } from "@/lib/badges";
import { cn } from "@/lib/utils";

/** Every badge: earned ones in full colour, the rest faded with how to earn them. */
export function BadgeList({ earned }: { earned: readonly string[] }) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {BADGES.map((badge) => {
        const has = earned.includes(badge.key);
        return (
          <li
            key={badge.key}
            className={cn(
              "flex items-start gap-3 rounded-xl border bg-surface p-3",
              !has && "bg-surface-muted",
            )}
          >
            <Award
              aria-hidden="true"
              className={cn(
                "mt-0.5 size-5 shrink-0",
                has ? "text-primary" : "text-muted-foreground",
              )}
            />
            <div className="min-w-0">
              <p className="font-semibold">
                {badge.name}
                <span className="sr-only">
                  {has ? " (earned)" : " (not yet earned)"}
                </span>
              </p>
              <p className="text-sm text-muted-foreground">
                {badge.description}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
