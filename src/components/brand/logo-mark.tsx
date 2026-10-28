import type { SVGProps } from "react";

/**
 * Path data for the mark on a 48x48 grid: steam, cup body, handle, three wing
 * feathers sweeping back from the cup, saucer. Shared with the generated
 * apple icon. src/app/icon.svg is a static copy, so update it too.
 */
export const LOGO_MARK_PATHS = [
  "M21 6c-2 2 2 4 0 7M27 6c-2 2 2 4 0 7",
  "M15 18h20v10a10 10 0 0 1-10 10h0a10 10 0 0 1-10-10z",
  "M35 21h2.5a4.5 4.5 0 0 1 0 9H35",
  "M15 21C10 21 5.5 18.5 3 14c4.5.5 8.5 2 12 4.5",
  "M15 25.5c-4.5 0-8-1.5-10.5-4.5 3.5 0 7 .8 10.5 2.5",
  "M15.6 30c-3.6.2-6.6-.8-8.6-3",
  "M11 42h28",
] as const;

type LogoMarkProps = SVGProps<SVGSVGElement> & {
  /** Gives the mark an accessible name. Without it the mark is decorative. */
  title?: string;
};

/**
 * Hermes Express mark: a coffee cup with a single wing, drawn as one-colour
 * line art. It uses `currentColor`, so set its colour with a text-* class.
 */
export function LogoMark({ title, ...props }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {LOGO_MARK_PATHS.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
