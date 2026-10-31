/**
 * Keeps a guest's drink through the trip to the login page. Held in
 * sessionStorage, so it stays on this tab and is forgotten when the tab closes.
 */
import { z } from "zod";
import {
  AMOUNT_LEVELS,
  DRINK_SIZES,
  DRINK_TEMPERATURES,
  SWEETNESS_LEVELS,
} from "@/lib/validation/drink";
import { STEPS, type BuilderDraft, type StepId } from "./state";

const STORAGE_KEY = "hx_build_draft";

const stepIds = STEPS.map((step) => step.id) as [StepId, ...StepId[]];

const savedSchema = z.object({
  step: z.enum(stepIds),
  draft: z.object({
    size: z.enum(DRINK_SIZES),
    temperature: z.enum(DRINK_TEMPERATURES),
    iceLevel: z.enum(AMOUNT_LEVELS).optional(),
    base: z.string().nullable(),
    shots: z.number().int().optional(),
    milk: z.string().nullable(),
    milkAmount: z.enum(AMOUNT_LEVELS),
    sweetness: z.literal(SWEETNESS_LEVELS),
    syrups: z.array(z.string()),
    toppings: z.array(z.string()),
    name: z.string(),
    signature: z.string().optional(),
  }),
});

export type SavedDraft = { draft: BuilderDraft; step: StepId };

export function saveDraft(saved: SavedDraft): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch {
    // Storage can be blocked. The customer only loses the drink in progress.
  }
}

/** Returns the saved drink once, then forgets it. Null if there is none. */
export function takeSavedDraft(): SavedDraft | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    sessionStorage.removeItem(STORAGE_KEY);
    const parsed = savedSchema.safeParse(JSON.parse(raw));
    return parsed.success ? (parsed.data as SavedDraft) : null;
  } catch {
    return null;
  }
}
