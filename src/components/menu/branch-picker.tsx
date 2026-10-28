import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import { selectBranch } from "@/server/catalog/actions";

/**
 * Three buttons, one per branch. A plain form posting to a server action, so
 * it works before JavaScript loads and with the keyboard.
 */
export function BranchPicker({ selected }: { selected: string }) {
  return (
    <form action={selectBranch}>
      <fieldset>
        <legend className="text-sm font-semibold">
          Showing availability at
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {siteConfig.branches.map((branch) => {
            const isSelected = branch.slug === selected;
            return (
              <button
                key={branch.slug}
                type="submit"
                name="branch"
                value={branch.slug}
                aria-pressed={isSelected}
                className={cn(
                  "inline-flex h-11 items-center rounded-full border px-5 text-sm font-semibold transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-surface hover:bg-muted",
                )}
              >
                {branch.name}
              </button>
            );
          })}
        </div>
      </fieldset>
    </form>
  );
}
