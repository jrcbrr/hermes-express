import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SectionProps = {
  /** Used for the heading id, so the section is labelled by its heading. */
  id: string;
  title: string;
  intro?: string;
  className?: string;
  children: ReactNode;
};

/** Shared spacing and heading for every landing page section. */
export function Section({
  id,
  title,
  intro,
  className,
  children,
}: SectionProps) {
  const headingId = `${id}-heading`;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn("px-4 py-16 md:px-6 md:py-24", className)}
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h2
            id={headingId}
            className="text-3xl font-extrabold tracking-tight md:text-4xl"
          >
            {title}
          </h2>
          {intro ? (
            <p className="mt-3 text-base text-muted-foreground md:text-lg">
              {intro}
            </p>
          ) : null}
        </div>
        {children}
      </div>
    </section>
  );
}
