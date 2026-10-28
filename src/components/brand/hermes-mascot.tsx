import type { SVGProps } from "react";

type HermesMascotProps = SVGProps<SVGSVGElement> & {
  /** Gives the mascot an accessible name. Without it the mascot is decorative. */
  title?: string;
};

/**
 * "Hermes", the mascot: a minimalist line-art profile wearing a winged
 * helmet. One colour via `currentColor`. Use sparingly (see PLAN.md §3).
 */
export function HermesMascot({ title, ...props }: HermesMascotProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {/* Helmet dome and brim */}
      <path d="M36 58c-2-20 12-34 32-34 17 0 28 11 28 28v6" />
      <path d="M32 58h66" />
      {/* Wing on the side of the helmet */}
      <path d="M56 44C46 32 34 27 18 28c8 6 18 10 30 13" />
      <path d="M54 50c-11-5-22-7-34-5 9 4 19 7 30 8" />
      <path d="M52 55c-8-2-16-2-24 0" />
      {/* Face in profile: forehead, nose, lips, chin */}
      <path d="M94 58c1 4 2 7 6 11 1 2-1 3-4 4 1 2 1 3-1 4 2 2 1 4-1 5 1 4-2 8-8 9-5 1-10 1-14 4" />
      {/* Eye and ear */}
      <path d="M84 66h5" />
      <path d="M62 66c4 0 6 3 6 6s-2 6-6 6" />
      {/* Back of the head and neck */}
      <path d="M38 58c-1 10 2 20 10 27v23" />
      <path d="M72 96v12" />
    </svg>
  );
}
