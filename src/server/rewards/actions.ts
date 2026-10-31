"use server";

import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { markBadgesSeenFor } from "./badges";

const schema = z.array(z.string().min(1).max(40)).max(20);

/** Stops an unlock toast showing again. Only ever the signed-in user's badges. */
export async function markBadgesSeen(keys: unknown): Promise<void> {
  const user = await requireUser("/rewards");
  const parsed = schema.safeParse(keys);
  if (parsed.success) await markBadgesSeenFor(user.id, parsed.data);
}
