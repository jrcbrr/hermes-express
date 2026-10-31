"use server";

import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { awardPerfectPour, markBadgesSeenFor } from "./badges";

const schema = z.array(z.string().min(1).max(40)).max(20);

/** Stops an unlock toast showing again. Only ever the signed-in user's badges. */
export async function markBadgesSeen(keys: unknown): Promise<void> {
  const user = await requireUser("/rewards");
  const parsed = schema.safeParse(keys);
  if (parsed.success) await markBadgesSeenFor(user.id, parsed.data);
}

/**
 * Records a Perfect Pour win. The game runs in the browser, so the server takes
 * its word for it (owner-approved, Stage 9): the badge carries no points or money.
 */
export async function claimPerfectPour(): Promise<{ newlyEarned: boolean }> {
  const user = await requireUser("/build");
  return { newlyEarned: await awardPerfectPour(user.id) };
}
