"use client";

import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useReducedMotionConfig,
  type Transition,
} from "motion/react";
import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { useSound } from "@/hooks/use-sound";
import { CupToppings } from "./builder-toppings";
import type { BuilderCatalog } from "@/lib/builder/catalog";
import type { BuilderDraft } from "@/lib/builder/state";
import {
  BRIM_SHARE,
  cupLayers,
  cupScale,
  describeDrink,
  foamReserve,
  iceCubeCount,
  mixColor,
  stackLayers,
  toppingVisuals,
  type LiquidLayer,
} from "@/lib/builder/visual";

// Glass geometry (viewBox 0 0 200 250). The 22oz cup is MAX_HEIGHT tall.
const BOTTOM = 236;
const MAX_HEIGHT = 172;

const POUR_MS = 700;
const SETTLE_MS = 400;
const MIX_MS = 900;

/**
 * pouring: a stream falls and the new layer rises.
 * stacked: the layers rest on top of each other for a moment.
 * mixing: a swirl blends them. mixed: the final colour.
 */
type Phase = "pouring" | "stacked" | "mixing" | "mixed";

function glass(scale: number) {
  const top = BOTTOM - MAX_HEIGHT * scale;
  return {
    top,
    inside: `M38 ${top} L54 ${BOTTOM - 12} Q55 ${BOTTOM} 66 ${BOTTOM} H134 Q145 ${BOTTOM} 146 ${BOTTOM - 12} L162 ${top} Z`,
    outline: `M36 ${top - 2} L52 ${BOTTOM - 10} Q54 ${BOTTOM + 2} 66 ${BOTTOM + 2} H134 Q146 ${BOTTOM + 2} 148 ${BOTTOM - 10} L164 ${top - 2}`,
    rim: `M28 ${top - 2} H172`,
  };
}

const noSubscribe = () => () => {};
const isClient = () => true;
const isServer = () => false;

const signatureOf = (layers: readonly LiquidLayer[]) =>
  layers.map((l) => `${l.key}:${l.slug}`).join("|");

/**
 * The builder's cup. Each new liquid pours in from the top and settles as a
 * coloured layer; with two or more layers a swirl then mixes them into one
 * colour. Toppings drop in, iced drinks show ice, hot drinks show steam.
 * With reduced motion the finished, mixed drink is shown without animation.
 */
export function BuilderCup({
  draft,
  catalog,
}: {
  draft: BuilderDraft;
  catalog: BuilderCatalog;
}) {
  // The device setting, or a <MotionConfig reducedMotion="always"> above us.
  // The server can't know the setting, so the first browser render matches
  // the server's (motion on) and switches right after hydration.
  const hydrated = useSyncExternalStore(noSubscribe, isClient, isServer);
  const prefersReduced = useReducedMotion();
  const configReduced = useReducedMotionConfig();
  const reduce = hydrated && Boolean(prefersReduced || configReduced);
  const { play } = useSound();
  const clipId = useId();
  const textureId = useId();

  const scale = cupScale(draft.size);
  const height = MAX_HEIGHT * scale;
  const toppings = toppingVisuals(draft.toppings, catalog);
  // A finished drink ends at the brim; foams take the last part of the cup.
  const layers = cupLayers(
    draft,
    catalog,
    BRIM_SHARE - foamReserve(toppings, height),
  );
  const signature = signatureOf(layers);
  const [previous, setPrevious] = useState({ signature, layers });
  const [phase, setPhase] = useState<Phase>("mixed");
  const [pour, setPour] = useState<{ color: string; id: number } | null>(null);

  // A new or different liquid starts a pour (adjusting state during render,
  // React's pattern for reacting to changed props).
  if (signature !== previous.signature) {
    const added = layers.find(
      (l) => !previous.layers.some((p) => p.key === l.key && p.slug === l.slug),
    );
    setPrevious({ signature, layers });
    if (added && !reduce) {
      setPour((current) => ({
        color: added.color,
        id: (current?.id ?? 0) + 1,
      }));
      setPhase("pouring");
    }
  }

  const canMix = layers.length >= 2;
  useEffect(() => {
    if (phase === "pouring") play("pour");
    const next: Partial<Record<Phase, [Phase, number]>> = {
      pouring: ["stacked", POUR_MS],
      stacked: [canMix ? "mixing" : "mixed", SETTLE_MS],
      mixing: ["mixed", MIX_MS],
    };
    const step = next[phase];
    if (!step) return;
    const timer = setTimeout(() => {
      if (phase === "pouring") setPour(null);
      setPhase(step[0]);
    }, step[1]);
    return () => clearTimeout(timer);
  }, [phase, canMix, play, pour?.id]);

  const shape = glass(scale);
  const total = layers.reduce((sum, l) => sum + l.share, 0);
  const surface = BOTTOM - total * height;
  const mixed = mixColor(layers);
  const showMix = canMix && (phase === "mixing" || phase === "mixed");
  const ease = (ms: number): Transition =>
    reduce ? { duration: 0 } : { duration: ms / 1000, ease: "easeOut" };

  const stacked = stackLayers(layers).map(({ layer, below }) => ({
    layer,
    y: BOTTOM - (below + layer.share) * height,
    slotBottom: BOTTOM - below * height,
    h: layer.share * height,
  }));

  return (
    <div className="flex items-center justify-center gap-3 md:flex-col">
      <svg
        viewBox="0 0 200 250"
        className="w-28 text-foreground md:w-full md:max-w-80"
        role="img"
        aria-label={describeDrink(draft, catalog)}
        data-testid="builder-cup"
        data-phase={phase}
      >
        <defs>
          <clipPath id={clipId}>
            <motion.path
              initial={false}
              animate={{ d: shape.inside }}
              transition={ease(400)}
            />
          </clipPath>
          <pattern
            id={textureId}
            width="8"
            height="8"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="2" cy="2" r="1.2" className="fill-surface" />
            <circle cx="6" cy="6" r="0.9" className="fill-surface" />
          </pattern>
        </defs>

        {draft.temperature === "hot" && layers.length > 0 ? (
          <Steam top={shape.top} reduce={reduce} />
        ) : null}

        <g clipPath={`url(#${clipId})`}>
          <rect x="0" y="0" width="200" height="250" className="fill-surface" />

          <AnimatePresence>
            {pour ? (
              <motion.rect
                key={pour.id}
                x="97"
                y="0"
                width="6"
                rx="3"
                height={Math.max(0, surface)}
                fill={pour.color}
                style={{ originY: 0 }}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeIn" }}
                data-testid="pour-stream"
              />
            ) : null}
          </AnimatePresence>

          <AnimatePresence initial={false}>
            {stacked.map(({ layer, y, slotBottom, h }) => (
              <motion.rect
                key={layer.key}
                x="0"
                width="200"
                initial={{ attrY: slotBottom, height: 0, fill: layer.color }}
                animate={{ attrY: y, height: h, fill: layer.color }}
                exit={{ height: 0, attrY: slotBottom }}
                transition={ease(POUR_MS)}
              />
            ))}
          </AnimatePresence>

          {mixed !== null ? (
            <motion.rect
              x="0"
              width="200"
              initial={false}
              animate={{
                attrY: surface,
                height: total * height,
                fill: mixed,
                opacity: showMix ? 1 : 0,
              }}
              transition={ease(phase === "mixing" ? MIX_MS : 250)}
              data-testid="mixed-layer"
            />
          ) : null}

          {draft.temperature === "blended" && layers.length > 0 ? (
            <>
              <rect
                x="0"
                y={surface}
                width="200"
                height={total * height}
                fill={`url(#${textureId})`}
                opacity="0.35"
              />
              <ellipse
                cx="100"
                cy={surface}
                rx="64"
                ry="9"
                fill={mixed ?? undefined}
              />
            </>
          ) : null}

          <AnimatePresence>
            {phase === "mixing" && !reduce ? (
              // The wrapper places the swirl; the path itself only spins.
              <g
                key="swirl"
                transform={`translate(100 ${surface + (total * height) / 2})`}
              >
                <motion.path
                  d="M0 -14 a14 14 0 1 1 -14 14 a9 9 0 1 1 9 -9 a5 5 0 1 1 -5 5"
                  fill="none"
                  strokeWidth="3"
                  strokeLinecap="round"
                  className="stroke-surface"
                  initial={{ rotate: 0, opacity: 0 }}
                  animate={{ rotate: 360, opacity: [0, 0.8, 0] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: MIX_MS / 1000, ease: "easeInOut" }}
                  data-testid="mix-swirl"
                />
              </g>
            ) : null}
          </AnimatePresence>

          <IceCubes
            count={iceCubeCount(draft.iceLevel)}
            top={Math.min(surface + 4, BOTTOM - 26)}
            reduce={reduce}
          />
          <CupToppings
            toppings={toppings}
            surface={surface}
            reduce={reduce}
            layer="inside"
          />
        </g>

        {/* Whipped cream can rise over the rim; the glass edge stays in front. */}
        <CupToppings
          toppings={toppings}
          surface={surface}
          reduce={reduce}
          layer="above"
        />

        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <motion.path
            initial={false}
            animate={{ d: shape.outline }}
            transition={ease(400)}
          />
          <motion.path
            initial={false}
            animate={{ d: shape.rim }}
            transition={ease(400)}
          />
        </g>
      </svg>

      {canMix && !reduce ? (
        <Button
          type="button"
          variant="ghost"
          className="h-11 px-4"
          disabled={phase !== "mixed"}
          onClick={() => setPhase("stacked")}
        >
          Mix again
        </Button>
      ) : null}
    </div>
  );
}

function Steam({ top, reduce }: { top: number; reduce: boolean }) {
  return (
    <g
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      opacity="0.35"
      data-testid="steam"
    >
      {[76, 100, 124].map((x, i) => (
        <motion.path
          key={x}
          d={`M${x} ${top - 8}c-6-6 6-10 0-18`}
          initial={false}
          animate={reduce ? undefined : { opacity: [0, 1, 0], y: [0, -6, -10] }}
          transition={{
            duration: 3,
            delay: i * 0.8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </g>
  );
}

function IceCubes({
  count,
  top,
  reduce,
}: {
  count: number;
  top: number;
  reduce: boolean;
}) {
  return (
    <AnimatePresence initial={false}>
      {Array.from({ length: count }, (_, i) => (
        <motion.g
          key={i}
          data-testid="ice-cube"
          initial={{ opacity: 0, y: -40 }}
          animate={
            reduce ? { opacity: 1, y: 0 } : { opacity: 1, y: [0, -2, 0] }
          }
          exit={{ opacity: 0 }}
          transition={
            reduce
              ? { duration: 0 }
              : { duration: 3, delay: i * 0.3, repeat: Infinity }
          }
        >
          <rect
            x={58 + i * 17}
            y={top + (i % 2) * 9}
            width="16"
            height="16"
            rx="3"
            transform={`rotate(${i % 2 ? 12 : -10} ${66 + i * 17} ${top + 8})`}
            className="fill-surface stroke-foreground/30"
            fillOpacity="0.55"
            strokeWidth="1.5"
          />
        </motion.g>
      ))}
    </AnimatePresence>
  );
}
