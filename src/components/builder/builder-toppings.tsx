"use client";

import { AnimatePresence, motion, type Transition } from "motion/react";
import { useId } from "react";
import {
  scatter,
  seedOf,
  shade,
  toppingLayout,
  FOAM_THICKNESS,
  type ToppingLayout,
  type ToppingVisual,
} from "@/lib/builder/visual";

/** Bottom of the glass inside (matches builder-cup.tsx). */
const BOTTOM = 236;

// Shading recipe used by every topping: a lit top, the ingredient colour,
// a slightly darker underside. Highlights are white at low opacity, so they
// read well in light and dark mode.
const HIGHLIGHT = "white";

type PieceProps = {
  topping: ToppingVisual;
  /** Unique prefix for this topping's gradient ids. */
  uid: string;
  /** Position among toppings of the same style (0 = first). */
  index: number;
  layout: ToppingLayout;
  surface: number;
  reduce: boolean;
};

const drop = (reduce: boolean, delay = 0): Transition =>
  reduce
    ? { duration: 0 }
    : { type: "spring", stiffness: 240, damping: 20, delay };

/** Vertical light-to-shadow gradient in the topping's colour. */
function Shading({
  id,
  color,
  light = 0.55,
  dark = -0.15,
}: {
  id: string;
  color: string;
  light?: number;
  dark?: number;
}) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor={shade(color, light)} />
      <stop offset="0.55" stopColor={color} />
      <stop offset="1" stopColor={shade(color, dark)} />
    </linearGradient>
  );
}

/** Cold foam and sea salt cream: a soft dome with tiny bubbles. */
function Foam({ topping, uid, index, surface, reduce }: PieceProps) {
  const base = surface - index * FOAM_THICKNESS;
  const top = base - FOAM_THICKNESS - 1;
  const fill = `${uid}-fill`;
  const dome = `M30 ${base + 1} C32 ${top + 2} 62 ${top} 100 ${top} C138 ${top} 168 ${top + 2} 170 ${base + 1}`;
  const bubbles = scatter(7, seedOf(topping.slug));
  return (
    <motion.g
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={drop(reduce)}
    >
      <defs>
        <Shading id={fill} color={topping.color} light={0.7} dark={-0.14} />
      </defs>
      <path d={`${dome} Z`} fill={`url(#${fill})`} />
      {/* A faint top edge keeps a pale foam visible against a pale glass. */}
      <path
        d={dome}
        fill="none"
        stroke={shade(topping.color, -0.3)}
        strokeOpacity="0.4"
        strokeWidth="0.9"
      />
      {/* Where the foam meets the drink: a thin soft shadow gives it lift. */}
      <path
        d={`M30 ${base + 1} H170`}
        stroke={shade(topping.color, -0.45)}
        strokeOpacity="0.35"
        strokeWidth="1.4"
      />
      <ellipse
        cx="80"
        cy={top + 3.5}
        rx="20"
        ry="1.6"
        fill={HIGHLIGHT}
        opacity="0.7"
      />
      {bubbles.map((b, i) => (
        <circle
          key={i}
          cx={54 + b.x * 92}
          cy={top + 5 + b.y * 5}
          r={0.7 + b.size * 0.8}
          fill="none"
          stroke={shade(topping.color, -0.28)}
          strokeOpacity="0.45"
          strokeWidth="0.6"
        />
      ))}
      {topping.slug === "sea-salt-cream"
        ? bubbles.map((b, i) => (
            <circle
              key={`salt-${i}`}
              cx={60 + b.size * 80}
              cy={top + 3 + b.x * 3}
              r="0.9"
              fill={HIGHLIGHT}
              stroke={shade(topping.color, -0.35)}
              strokeWidth="0.4"
            />
          ))
        : null}
    </motion.g>
  );
}

/** One piped tier of cream: a soft dome whose base tucks into the tier below. */
function tier(halfWidth: number, y: number, height: number): string {
  const l = 100 - halfWidth;
  const r = 100 + halfWidth;
  const top = y - height;
  return `M${l} ${y} C${l} ${y - height * 0.8} ${100 - halfWidth * 0.5} ${top} 100 ${top} C${100 + halfWidth * 0.5} ${top} ${r} ${y - height * 0.8} ${r} ${y} Q100 ${y + 4} ${l} ${y} Z`;
}

/** Whipped cream: three piped tiers and a curled tip, softly lit from the top left. */
function Dollop({ topping, uid, layout, reduce }: PieceProps) {
  const base = layout.dollopBase ?? layout.foamTop;
  const fill = `${uid}-fill`;
  const shadow = shade(topping.color, -0.35);
  // A faint edge keeps white cream readable above the rim on a light page.
  const outline = {
    stroke: shade(topping.color, -0.3),
    strokeOpacity: 0.45,
    strokeWidth: 0.9,
  };
  const tiers: [number, number, number][] = [
    [52, base, 13],
    [39, base - 10, 12],
    [26, base - 20, 11],
  ];
  return (
    <motion.g
      initial={{ y: -30, opacity: 0, scale: 0.9 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={drop(reduce)}
      style={{ originX: "100px", originY: `${base}px` }}
    >
      <defs>
        <radialGradient id={fill} cx="0.35" cy="0.25" r="0.85">
          <stop offset="0" stopColor={HIGHLIGHT} />
          <stop offset="0.6" stopColor={topping.color} />
          <stop offset="1" stopColor={shade(topping.color, -0.18)} />
        </radialGradient>
      </defs>
      <ellipse
        cx="100"
        cy={base + 1}
        rx="54"
        ry="3"
        fill={shadow}
        opacity="0.22"
      />
      {tiers.map(([halfWidth, y, height], i) => (
        <g key={i}>
          <path
            d={tier(halfWidth, y, height)}
            fill={`url(#${fill})`}
            {...outline}
          />
          {/* A soft shadow where this tier tucks into the one below. */}
          {i > 0 ? (
            <path
              d={`M${100 - halfWidth} ${y} Q100 ${y + 4} ${100 + halfWidth} ${y}`}
              fill="none"
              stroke={shadow}
              strokeOpacity="0.3"
              strokeWidth="1.1"
            />
          ) : null}
          <path
            d={`M${100 - halfWidth * 0.7} ${y - height * 0.55} Q${100 - halfWidth * 0.45} ${y - height * 0.95} ${100 - halfWidth * 0.1} ${y - height}`}
            fill="none"
            stroke={HIGHLIGHT}
            strokeOpacity="0.85"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </g>
      ))}
      <path
        d={`M90 ${base - 29} C91 ${base - 38} 100 ${base - 41} 108 ${base - 46} C109 ${base - 40} 114 ${base - 35} 111 ${base - 29} Q100 ${base - 26} 90 ${base - 29} Z`}
        fill={`url(#${fill})`}
        {...outline}
      />
    </motion.g>
  );
}

/** Points of a sauce line that drapes over what it sits on and wiggles. */
function sauceLine(
  [x0, x1]: [number, number],
  y: number,
  drape: number,
): [number, number][] {
  const count = Math.round((x1 - x0) / 8);
  const mid = (x0 + x1) / 2;
  const half = (x1 - x0) / 2;
  return Array.from({ length: count + 1 }, (_, i) => {
    const x = x0 + (i * (x1 - x0)) / count;
    const t = (x - mid) / half;
    return [x, y + drape * t * t + (i % 2 ? 2.4 : -2.4)];
  });
}

/** A smooth path through points (each corner rounded with a curve). */
function smoothPath(points: [number, number][]): string {
  const [first, ...rest] = points;
  const curves = rest.slice(0, -1).map(([x, y], i) => {
    const [nx, ny] = rest[i + 1]!;
    return `Q${x} ${y} ${(x + nx) / 2} ${(y + ny) / 2}`;
  });
  const last = rest.at(-1)!;
  return `M${first![0]} ${first![1]} ${curves.join(" ")} L${last[0]} ${last[1]}`;
}

/** A tapered drop of sauce hanging from (x, y). */
function drip(x: number, y: number, length: number): string {
  return `M${x - 1.3} ${y} C${x - 1.1} ${y + length * 0.6} ${x - 2.3} ${y + length} ${x} ${y + length + 2} C${x + 2.3} ${y + length} ${x + 1.1} ${y + length * 0.6} ${x + 1.3} ${y} Z`;
}

/** Caramel or chocolate sauce: a glossy line that drapes, with two drips. */
function Drizzle({ topping, index, layout, reduce }: PieceProps) {
  const onDollop = layout.dollopTop !== null;
  const points = sauceLine(
    layout.crownSpan,
    layout.crown - 2 + index * 4,
    onDollop ? 8 : 2,
  );
  const line = smoothPath(points);
  const drips = [points[1]!, points[points.length - 3]!].map(
    ([x, y], i): [number, number, number] => [x, y, (onDollop ? 5 : 9) - i * 2],
  );
  const draw = reduce
    ? { initial: false as const }
    : {
        initial: { pathLength: 0 },
        animate: { pathLength: 1 },
        transition: { duration: 0.7, ease: "easeOut" as const },
      };
  return (
    <g>
      <motion.path
        d={line}
        fill="none"
        stroke={topping.color}
        strokeWidth="2.6"
        strokeLinecap="round"
        {...draw}
      />
      {/* Gloss: a thin light line along the sauce makes it look wet. */}
      <motion.path
        d={line}
        fill="none"
        stroke={shade(topping.color, 0.5)}
        strokeOpacity="0.75"
        strokeWidth="0.8"
        strokeLinecap="round"
        transform="translate(-0.4 -0.8)"
        {...draw}
      />
      {drips.map(([x, y, length], i) => (
        <motion.path
          key={i}
          d={drip(x, y, length)}
          fill={topping.color}
          style={{ originY: 0 }}
          initial={reduce ? false : { scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={
            reduce ? { duration: 0 } : { delay: 0.6 + i * 0.12, duration: 0.35 }
          }
        />
      ))}
    </g>
  );
}

/** Cinnamon or cocoa: a fine, uneven dusting. */
function Dust({ topping, index, layout, reduce }: PieceProps) {
  const [x0, x1] = layout.crownSpan;
  return (
    <motion.g
      fill={topping.color}
      initial={{ y: -8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={reduce ? { duration: 0 } : { duration: 0.5 }}
    >
      {scatter(30, seedOf(topping.slug)).map((p, i) => (
        <circle
          key={i}
          cx={x0 + 4 + p.x * (x1 - x0 - 8)}
          cy={layout.crown - 3 + p.y * 4 - index * 2}
          r={0.45 + p.size * 0.9}
          opacity={0.55 + p.size * 0.45}
        />
      ))}
    </motion.g>
  );
}

/** Cookie crumble: small crumbs with a lit top facet. */
function Crumble({ topping, uid, layout, reduce }: PieceProps) {
  const [x0, x1] = layout.crownSpan;
  const fill = `${uid}-fill`;
  return (
    <g>
      <defs>
        <Shading id={fill} color={topping.color} light={0.35} dark={-0.3} />
      </defs>
      {scatter(9, seedOf(topping.slug)).map((p, i) => {
        const x = x0 + 6 + p.x * (x1 - x0 - 12);
        const y = layout.crown - 2 + p.y * 3;
        const s = 1.2 + p.size * 1.2;
        return (
          <motion.path
            key={i}
            d={`M${x - 2 * s} ${y + s} L${x - 0.6 * s} ${y - 1.6 * s} L${x + 1.8 * s} ${y - 0.8 * s} L${x + 1.4 * s} ${y + 1.4 * s} Z`}
            fill={`url(#${fill})`}
            initial={{ y: -16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={drop(reduce, i * 0.03)}
          />
        );
      })}
    </g>
  );
}

/** Pearls and cubes that sink to the bottom, falling one after another. */
function Pieces({ topping, uid, index, reduce }: PieceProps) {
  const fill = `${uid}-fill`;
  const isPearl = topping.slug === "tapioca-pearls";
  const points = scatter(6, seedOf(topping.slug));
  return (
    <g>
      <defs>
        {isPearl ? (
          <radialGradient id={fill} cx="0.35" cy="0.3" r="0.75">
            <stop offset="0" stopColor={shade(topping.color, 0.45)} />
            <stop offset="0.5" stopColor={topping.color} />
            <stop offset="1" stopColor={shade(topping.color, -0.4)} />
          </radialGradient>
        ) : (
          <linearGradient id={fill} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={shade(topping.color, 0.3)} />
            <stop offset="0.5" stopColor={topping.color} />
            <stop offset="1" stopColor={shade(topping.color, -0.25)} />
          </linearGradient>
        )}
      </defs>
      {points.map((p, i) => {
        const cx = 64 + i * 14 + (index % 2) * 5;
        const cy = BOTTOM - 7 - index * 10 - (i % 2) * 5;
        return (
          <motion.g
            key={i}
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={drop(reduce, i * 0.06)}
          >
            {isPearl ? (
              <>
                <circle cx={cx} cy={cy} r="5" fill={`url(#${fill})`} />
                <circle
                  cx={cx - 1.7}
                  cy={cy - 1.8}
                  r="1.1"
                  fill={HIGHLIGHT}
                  opacity="0.75"
                />
              </>
            ) : (
              <g transform={`rotate(${(p.x - 0.5) * 30} ${cx} ${cy})`}>
                <rect
                  x={cx - 4.5}
                  y={cy - 4.5}
                  width="9"
                  height="9"
                  rx="2"
                  fill={`url(#${fill})`}
                  fillOpacity="0.85"
                  stroke={shade(topping.color, -0.3)}
                  strokeOpacity="0.5"
                  strokeWidth="0.7"
                />
                <rect
                  x={cx - 3}
                  y={cy - 3.2}
                  width="3.5"
                  height="1.1"
                  rx="0.5"
                  fill={HIGHLIGHT}
                  opacity="0.6"
                />
              </g>
            )}
          </motion.g>
        );
      })}
    </g>
  );
}

const DRAW = {
  dollop: Dollop,
  foam: Foam,
  drizzle: Drizzle,
  dust: Dust,
  crumble: Crumble,
  pieces: Pieces,
} as const;

/**
 * The cup's toppings. "inside" is drawn within the glass (clipped to it);
 * "above" holds whipped cream, which rises over the rim, and anything
 * resting on it.
 */
export function CupToppings({
  toppings,
  surface,
  rim,
  reduce,
  layer,
}: {
  toppings: ToppingVisual[];
  surface: number;
  /** Top of the glass (SVG y): full drinks wear their whipped cream on it. */
  rim: number;
  reduce: boolean;
  layer: "inside" | "above";
}) {
  const uid = useId();
  const layout = toppingLayout(toppings, surface, rim);
  const onDollop = layout.dollopTop !== null;
  const isAbove = (t: ToppingVisual) =>
    t.style === "dollop" ||
    (onDollop &&
      (t.style === "drizzle" || t.style === "dust" || t.style === "crumble"));

  // Each style counts separately, so stacked foams and drizzles don't overlap.
  const counts: Partial<Record<ToppingVisual["style"], number>> = {};
  const placed = toppings.map((topping) => {
    const index = counts[topping.style] ?? 0;
    counts[topping.style] = index + 1;
    return { topping, index };
  });

  return (
    <AnimatePresence initial={false}>
      {placed
        .filter(({ topping }) => isAbove(topping) === (layer === "above"))
        .map(({ topping, index }) => {
          const Draw = DRAW[topping.style];
          return (
            <motion.g
              key={topping.slug}
              data-testid={`topping-${topping.slug}`}
              data-style={topping.style}
              exit={{ opacity: 0 }}
              transition={reduce ? { duration: 0 } : { duration: 0.2 }}
            >
              <Draw
                topping={topping}
                uid={`${uid}-${topping.slug}`}
                index={index}
                layout={layout}
                surface={surface}
                reduce={reduce}
              />
            </motion.g>
          );
        })}
    </AnimatePresence>
  );
}
