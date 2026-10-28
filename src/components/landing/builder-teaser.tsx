import Link from "next/link";
import { useId, type CSSProperties } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Section } from "./section";

const GLASS_INSIDE =
  "M32 42 L44 158 Q46 168 56 168 H104 Q114 168 116 158 L128 42 Z";
const LOOP = "8s ease-in-out infinite";

// Spin the swirl around its own centre rather than the SVG origin.
const swirlStyle: CSSProperties = {
  transformBox: "fill-box",
  transformOrigin: "center",
  animation: `hx-swirl ${LOOP}`,
};

/**
 * Looping preview of the builder: espresso pours in, milk and foam stack on
 * top, then a swirl blends the layers. Resting state (reduced motion) shows
 * the finished, mixed drink.
 */
function TeaserCup() {
  const clipId = useId();

  return (
    <svg
      viewBox="0 0 160 180"
      className="mx-auto w-48 text-foreground md:w-56"
      role="img"
      aria-label="Coffee layers stacking in a glass, then mixing together"
    >
      <clipPath id={clipId}>
        <path d={GLASS_INSIDE} />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>
        <path d={GLASS_INSIDE} className="fill-surface" />
        <rect
          x="0"
          y="128"
          width="160"
          height="50"
          className="fill-coffee-espresso"
          style={{ animation: `hx-appear-1 ${LOOP}` }}
        />
        <rect
          x="0"
          y="92"
          width="160"
          height="36"
          className="fill-coffee-milk"
          style={{ animation: `hx-appear-2 ${LOOP}` }}
        />
        <rect
          x="0"
          y="78"
          width="160"
          height="14"
          className="fill-coffee-foam"
          style={{ animation: `hx-appear-3 ${LOOP}` }}
        />
        {/* The mixed drink, and a swirl line showing the mix */}
        <rect
          x="0"
          y="78"
          width="160"
          height="100"
          className="fill-coffee-latte"
          style={{ animation: `hx-mix ${LOOP}` }}
        />
        <path
          d="M80 125c0-8 12-8 12 0s-10 16-20 10-14-22 0-30 32 2 34 20"
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          className="stroke-coffee-foam"
          style={swirlStyle}
        />
      </g>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M30 40 L42 160 Q44 170 54 170 H106 Q116 170 118 160 L130 40" />
        <path d="M24 40 H136" />
      </g>
    </svg>
  );
}

const stages = ["Pour", "Stack", "Mix"] as const;

export function BuilderTeaser() {
  return (
    <Section
      id="builder"
      title="Craft it, layer by layer"
      intro="Pour your base, stack milk and foam, then watch it all swirl together. Every choice shows up in the cup, and the price updates as you go."
    >
      <div className="flex flex-col items-center gap-8">
        <TeaserCup />
        <ol
          className="flex items-center gap-3 text-sm font-semibold"
          aria-label="Builder steps"
        >
          {stages.map((stage, index) => (
            <li key={stage} className="flex items-center gap-3">
              <span className="rounded-full bg-surface-muted px-4 py-1.5">
                {stage}
              </span>
              {index < stages.length - 1 ? (
                <span aria-hidden="true" className="text-muted-foreground">
                  →
                </span>
              ) : null}
            </li>
          ))}
        </ol>
        <Link
          href="/build"
          className={buttonVariants({
            size: "lg",
            className: "h-12 px-6 text-base font-semibold",
          })}
        >
          Start building
        </Link>
      </div>
    </Section>
  );
}
