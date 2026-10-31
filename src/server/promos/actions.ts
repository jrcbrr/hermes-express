"use server";

import { z } from "zod";
import { priceCartItems } from "@/lib/cart";
import { sumCentavos } from "@/lib/money";
import { PROMO_NOT_FOUND } from "@/lib/promos";
import { cartItemsSchema } from "@/lib/validation/cart";
import { PROMO_CODE_MAX_LENGTH } from "@/lib/validation/checkout";
import { requireUser } from "@/server/auth/session";
import { getCatalogSnapshot } from "@/server/catalog/queries";
import { resolvePromo } from "./resolve";

export type PromoPreview =
  | {
      ok: true;
      code: string;
      discountCentavos: number;
      forSubtotal: number;
    }
  | { ok: false; message: string };

const schema = z.object({
  code: z.string().trim().min(1).max(PROMO_CODE_MAX_LENGTH),
  branch: z.string().min(1),
  items: cartItemsSchema,
});

/**
 * The discount a code would give this cart, for the checkout total. It changes
 * nothing, and placeOrder checks the code again when the order is placed.
 */
export async function previewPromo(input: unknown): Promise<PromoPreview> {
  const user = await requireUser("/checkout");
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, message: PROMO_NOT_FOUND };
  const { code, branch, items } = parsed.data;

  const now = new Date();
  const priced = priceCartItems(items, await getCatalogSnapshot(), branch, now);
  const subtotal = sumCentavos(priced.map((p) => p.lineTotalCentavos ?? 0));
  const result = await resolvePromo(code, user.id, subtotal, now);
  return result.ok
    ? {
        ok: true,
        code: result.code,
        discountCentavos: result.discountCentavos,
        forSubtotal: subtotal,
      }
    : result;
}
