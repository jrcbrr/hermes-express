"use client";

import { useEffect } from "react";
import { syncCart } from "@/server/cart/actions";
import { cartStore } from "./cart-store";

/**
 * Keeps the browser cart in step with who is signed in:
 * - logging in merges a guest cart into the account's saved cart;
 * - opening the site signed in loads the account's cart;
 * - logging out forgets the account's cart on this device.
 */
export function CartAccountSync({ userId }: { userId: string | null }) {
  useEffect(() => {
    const { cart } = cartStore.read();
    if (userId === null) {
      if (cart.owner !== null) cartStore.forget();
      return;
    }

    let cancelled = false;
    // Only a guest's cart is merged; another account's is never shared.
    const guestItems = cart.owner === null ? cart.items : [];
    syncCart(guestItems)
      .then((result) => {
        if (!cancelled && result.userId === userId) {
          cartStore.setAccount(userId, result.items);
        }
      })
      .catch(() => {
        // Offline or the server is busy: keep the browser cart for now.
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return null;
}
