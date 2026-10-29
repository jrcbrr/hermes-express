import { z } from "zod";
import { MAX_CART_LINES, type CartItem } from "@/lib/cart";
import { MAX_LINE_QUANTITY } from "@/lib/pricing";
import { drinkConfigSchema } from "./drink";

/**
 * Full checks for cart items arriving at the server (the saved account cart
 * and placeOrder). Unknown fields, such as a price the browser added, are
 * stripped: prices always come from the catalog.
 */

const id = z.string().regex(/^[A-Za-z0-9-]{1,64}$/, "Invalid cart item.");

const quantity = z
  .number()
  .int()
  .min(1, "Quantity must be at least 1.")
  .max(MAX_LINE_QUANTITY, `Quantity can be at most ${MAX_LINE_QUANTITY}.`);

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid item.");

export const cartItemSchema = z.discriminatedUnion("kind", [
  z.object({ id, kind: z.literal("product"), productSlug: slug, quantity }),
  z.object({
    id,
    kind: z.literal("custom"),
    config: drinkConfigSchema,
    quantity,
  }),
]);

export const cartItemsSchema = z
  .array(cartItemSchema)
  .max(MAX_CART_LINES, `A cart can hold at most ${MAX_CART_LINES} items.`)
  .refine(
    (items) => new Set(items.map((i) => i.id)).size === items.length,
    "Each cart item must be listed once.",
  );

/** Keeps the valid items of a list from the browser and drops the rest. */
export function validCartItems(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const items: CartItem[] = [];
  for (const raw of value) {
    const parsed = cartItemSchema.safeParse(raw);
    if (!parsed.success || seen.has(parsed.data.id)) continue;
    seen.add(parsed.data.id);
    items.push(parsed.data);
    if (items.length === MAX_CART_LINES) break;
  }
  return items;
}
