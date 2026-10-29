"use server";

import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { cart } from "@/db/schema";
import { mergeCarts, type CartItem } from "@/lib/cart";
import { cartItemsSchema, validCartItems } from "@/lib/validation/cart";
import { getSession } from "@/server/auth/session";

/**
 * The signed-in customer's saved cart. Guests keep their cart only in the
 * browser; when they log in, the browser sends it here once to be merged.
 * These actions run in the background, so a signed-out caller gets an empty
 * answer instead of a redirect to /login.
 */

export type CartSync = { userId: string | null; items: CartItem[] };

async function loadSavedCart(userId: string): Promise<CartItem[]> {
  const [row] = await getDb()
    .select({ items: cart.items })
    .from(cart)
    .where(eq(cart.userId, userId));
  // Re-check what was saved: the menu's rules may have changed since.
  return validCartItems(row?.items ?? []);
}

async function storeCart(userId: string, items: CartItem[]): Promise<void> {
  await getDb()
    .insert(cart)
    .values({ userId, items })
    .onConflictDoUpdate({
      target: cart.userId,
      set: { items, updatedAt: new Date() },
    });
}

/**
 * Merges a guest cart (possibly empty) into the account's saved cart and
 * returns the result. With an empty `guestItems`, it just loads the saved cart.
 */
export async function syncCart(guestItems: unknown): Promise<CartSync> {
  const session = await getSession();
  if (!session) return { userId: null, items: [] };

  const userId = session.user.id;
  const guest = validCartItems(guestItems);
  const saved = await loadSavedCart(userId);
  if (guest.length === 0) return { userId, items: saved };

  const merged = mergeCarts(saved, guest);
  await storeCart(userId, merged);
  return { userId, items: merged };
}

/** Replaces the account's saved cart. Invalid carts are ignored. */
export async function saveCart(items: unknown): Promise<void> {
  const session = await getSession();
  if (!session) return;
  const parsed = cartItemsSchema.safeParse(items);
  if (!parsed.success) return;
  await storeCart(session.user.id, parsed.data);
}
