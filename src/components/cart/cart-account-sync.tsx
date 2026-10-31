"use client";

import { useEffect } from "react";
import { mergeCarts } from "@/lib/cart";
import { syncCart } from "@/server/cart/actions";
import { cartStore } from "./cart-store";

/**
 * Keeps the browser cart in step with who is signed in:
 * - logging in merges a guest cart into the account's saved cart;
 * - opening the site signed in loads the account's cart, unless this browser
 *   holds newer changes, which are sent to the account instead;
 * - logging out forgets the account's cart on this device.
 * A change made while the server is answering is never overwritten.
 */
export function CartAccountSync({ userId }: { userId: string | null }) {
  useEffect(() => {
    const { cart } = cartStore.read();
    if (userId === null) {
      if (cart.owner !== null) cartStore.forget();
      return;
    }
    if (cart.owner === userId && cartStore.hasUnsavedChanges()) {
      cartStore.saveToAccount();
      return;
    }

    let cancelled = false;
    // Only a guest's cart is merged; another account's is never shared.
    const guestItems = cart.owner === null ? cart.items : [];
    syncCart(guestItems)
      .then((result) => {
        if (cancelled || result.userId !== userId) return;
        const current = cartStore.read().cart;
        // The customer changed their cart meanwhile. That change is newer than
        // this answer, and is already on its way to the account.
        if (current !== cart && current.owner === userId) return;
        if (current !== cart && current.owner === null) {
          const sent = new Set(guestItems.map((item) => item.id));
          const added = current.items.filter((item) => !sent.has(item.id));
          cartStore.setAccount(userId, mergeCarts(result.items, added));
          if (added.length > 0) cartStore.saveToAccount();
          return;
        }
        cartStore.setAccount(userId, result.items);
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
