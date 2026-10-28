import { useId, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

const GLASS_INSIDE =
  "M42 62 L56 199 Q58 212 70 212 H130 Q142 212 144 199 L158 62 Z";

/**
 * Hero illustration: a glass that slowly fills with layered coffee, holds,
 * then drains and repeats. Pure SVG + CSS keyframes (globals.css), so it
 * renders on the server. Its resting state is a full cup, which is what
 * visitors who prefer reduced motion see.
 */
export function AnimatedCup({ className }: { className?: string }) {
  const clipId = useId();

  return (
    <svg
      viewBox="0 0 200 240"
      className={cn("text-foreground", className)}
      role="img"
      aria-label="A glass filling with layered coffee"
      data-testid="hero-cup"
    >
      {/* Pour stream, behind the liquid so it disappears into the drink. */}
      <rect
        x="96"
        y="0"
        width="8"
        height="200"
        rx="4"
        className="fill-coffee-espresso"
        style={{
          opacity: 0,
          animation: "hx-pour 9s ease-in-out infinite",
        }}
      />

      <clipPath id={clipId}>
        <path d={GLASS_INSIDE} />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>
        <path d={GLASS_INSIDE} className="fill-surface" />
        <g
          style={
            {
              "--hx-fill-distance": "150px",
              animation: "hx-fill 9s ease-in-out infinite",
            } as CSSProperties
          }
        >
          <rect
            x="0"
            y="168"
            width="200"
            height="60"
            className="fill-coffee-espresso"
          />
          <rect
            x="0"
            y="118"
            width="200"
            height="50"
            className="fill-coffee-latte"
          />
          <rect
            x="0"
            y="92"
            width="200"
            height="26"
            className="fill-coffee-milk"
          />
          <rect
            x="0"
            y="80"
            width="200"
            height="12"
            className="fill-coffee-foam"
          />
        </g>
      </g>

      {/* Steam */}
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        className="opacity-40"
      >
        <path
          d="M72 50c-6-6 6-10 0-18"
          style={{ animation: "hx-steam 3s ease-in-out infinite" }}
        />
        <path
          d="M130 50c-6-6 6-10 0-18"
          style={{ animation: "hx-steam 3s ease-in-out 1.5s infinite" }}
        />
      </g>

      {/* Glass outline and rim */}
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M40 60 L54 200 Q56 214 70 214 H130 Q144 214 146 200 L160 60" />
        <path d="M32 60 H168" />
      </g>

      {/* A small gold wing on the glass, echoing the logo. */}
      <g
        fill="none"
        strokeWidth="3.5"
        strokeLinecap="round"
        className="stroke-primary"
      >
        <path d="M44 100c-12 0-24-6-30-18 11 1 21 5 31 11" />
        <path d="M47 116c-12 0-21-4-27-12 9 0 18 2 26 6" />
        <path d="M49 131c-9 1-16-1-21-6" />
      </g>
    </svg>
  );
}
