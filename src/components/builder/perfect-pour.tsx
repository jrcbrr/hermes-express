"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import { cartStore } from "@/components/cart/cart-store";
import { Button } from "@/components/ui/button";
import { useSound } from "@/hooks/use-sound";
import {
  GOLD_LINE_PERCENT,
  pourLevel,
  pourOutcome,
  type PourOutcome,
} from "@/lib/builder/perfect-pour";
import { claimPerfectPour } from "@/server/rewards/actions";

type Result = PourOutcome | null;
type BadgeStatus = "idle" | "earned" | "already" | "login" | "failed";

const MISS_MESSAGES: Record<Exclude<PourOutcome, "perfect">, string> = {
  short: "A little short of the gold line. Please try again.",
  over: "A little past the gold line. Please try again.",
};

const BADGE_MESSAGES: Record<Exclude<BadgeStatus, "idle" | "login">, string> = {
  earned: "You have earned the Perfect Pour badge.",
  already: "You already hold the Perfect Pour badge.",
  failed: "We could not save your badge. Please try again.",
};

/**
 * Hold to pour, release at the gold line. Optional: it never changes the drink.
 * Pointer events cover mouse and touch; Space or Enter cover the keyboard.
 */
export function PerfectPour({
  onClose,
  onBeforeLogin,
}: {
  onClose: () => void;
  /** Keeps the drink in progress before a guest leaves to log in. */
  onBeforeLogin: () => void;
}) {
  const [level, setLevel] = useState(0);
  const [pouring, setPouring] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const [badge, setBadge] = useState<BadgeStatus>("idle");
  const startedAt = useRef<number | null>(null);
  const frame = useRef(0);
  const holdRef = useRef<HTMLButtonElement>(null);
  const { play } = useSound();

  useEffect(() => holdRef.current?.focus(), []);

  const start = useCallback(() => {
    if (startedAt.current !== null) return;
    startedAt.current = performance.now();
    setPouring(true);
    setResult(null);
    setBadge("idle");
    setLevel(0);
    play("pour");
    const tick = () => {
      if (startedAt.current === null) return;
      setLevel(pourLevel(performance.now() - startedAt.current));
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }, [play]);

  const halt = useCallback((): number | null => {
    if (startedAt.current === null) return null;
    const final = pourLevel(performance.now() - startedAt.current);
    startedAt.current = null;
    cancelAnimationFrame(frame.current);
    setPouring(false);
    return final;
  }, []);

  /** An interrupted hold (a call, an app switch) resets without counting. */
  const cancel = useCallback(() => {
    if (halt() !== null) setLevel(0);
  }, [halt]);

  async function release() {
    const final = halt();
    if (final === null) return;
    const outcome = pourOutcome(final);
    setLevel(final);
    setResult(outcome);
    if (outcome !== "perfect") return;
    play("ding");
    if (cartStore.read().cart.owner === null) {
      setBadge("login");
      return;
    }
    try {
      const { newlyEarned } = await claimPerfectPour();
      setBadge(newlyEarned ? "earned" : "already");
    } catch {
      setBadge("failed");
    }
  }

  useEffect(() => {
    const onHidden = () => {
      if (document.hidden) cancel();
    };
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("blur", cancel);
    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("blur", cancel);
      cancelAnimationFrame(frame.current);
    };
  }, [cancel]);

  const isHoldKey = (event: KeyboardEvent) =>
    event.key === " " || event.key === "Enter";

  return (
    <section
      aria-labelledby="perfect-pour-heading"
      data-testid="perfect-pour"
      className="rounded-2xl border bg-surface p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <h3
          id="perfect-pour-heading"
          className="font-heading text-lg font-extrabold"
        >
          The Perfect Pour
        </h3>
        <Button
          type="button"
          variant="outline"
          className="h-11 px-3 font-semibold"
          onClick={onClose}
        >
          Close
        </Button>
      </div>
      <p id="perfect-pour-help" className="mt-1 text-sm text-muted-foreground">
        Hold the button to pour, and release when the coffee reaches the gold
        line, {GOLD_LINE_PERCENT}% of the way up. Take your time; this does not
        change your drink.
      </p>

      <div className="mt-4 flex items-end gap-4">
        <div
          role="progressbar"
          aria-label="Cup fill level"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(level)}
          className="relative h-44 w-24 shrink-0 overflow-hidden rounded-b-3xl border-2 border-foreground bg-surface-muted"
        >
          <div
            data-testid="perfect-pour-liquid"
            className="absolute inset-x-0 bottom-0 bg-coffee-latte"
            style={{ height: `${level}%` }}
          />
          <div
            data-testid="perfect-pour-line"
            className="absolute inset-x-0 h-1 bg-primary outline outline-1 outline-foreground"
            style={{ bottom: `${GOLD_LINE_PERCENT}%` }}
          />
        </div>
        <Button
          ref={holdRef}
          type="button"
          aria-describedby="perfect-pour-help"
          aria-pressed={pouring}
          className="h-20 flex-1 touch-none text-base font-bold select-none [-webkit-touch-callout:none]"
          onContextMenu={(event) => event.preventDefault()}
          onPointerDown={(event: PointerEvent<HTMLButtonElement>) => {
            event.currentTarget.setPointerCapture?.(event.pointerId);
            start();
          }}
          onPointerUp={() => void release()}
          onPointerCancel={cancel}
          onKeyDown={(event) => {
            if (!isHoldKey(event)) return;
            event.preventDefault();
            if (!event.repeat) start();
          }}
          onKeyUp={(event) => {
            if (!isHoldKey(event)) return;
            event.preventDefault();
            void release();
          }}
          onBlur={cancel}
        >
          {pouring ? "Pouring. Release at the line" : "Hold to pour"}
        </Button>
      </div>

      <div role="status" className="mt-3 text-sm empty:hidden">
        {result === "short" || result === "over" ? (
          <p>{MISS_MESSAGES[result]}</p>
        ) : null}
        {result === "perfect" ? (
          <p className="font-semibold">A perfect pour. Beautifully done.</p>
        ) : null}
        {badge === "login" ? (
          <p>
            <Link
              href="/login?next=/build"
              onClick={onBeforeLogin}
              className="font-semibold text-accent underline-offset-4 hover:underline"
            >
              Log in
            </Link>{" "}
            and pour again to keep the Perfect Pour badge.
          </p>
        ) : badge !== "idle" ? (
          <p>{BADGE_MESSAGES[badge]}</p>
        ) : null}
      </div>
    </section>
  );
}
