/**
 * Rules of the Perfect Pour mini-game (docs/PLAN.md §5). The cup fills at a
 * steady speed while held, and stops at the brim, so there is no time pressure.
 */
export const GOLD_LINE_PERCENT = 70;
/** How far from the line still counts, in percent of the cup. */
export const POUR_TOLERANCE_PERCENT = 4;
export const FILL_PERCENT_PER_SECOND = 25;

export type PourOutcome = "short" | "perfect" | "over";

/** How full the cup is after holding for this long. */
export function pourLevel(heldMs: number): number {
  const level = (Math.max(0, heldMs) / 1000) * FILL_PERCENT_PER_SECOND;
  return Math.min(100, level);
}

export function pourOutcome(level: number): PourOutcome {
  if (level < GOLD_LINE_PERCENT - POUR_TOLERANCE_PERCENT) return "short";
  if (level > GOLD_LINE_PERCENT + POUR_TOLERANCE_PERCENT) return "over";
  return "perfect";
}
