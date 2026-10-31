"use client";

/**
 * The cart in the browser. It lives in localStorage, so guests keep it
 * across visits, and stays in step across tabs. For a signed-in customer
 * each change is also saved to their account (debounced), so the cart
 * follows them to other devices. Components read it with useCart().
 */
import { useSyncExternalStore } from "react";
import {
  addToCart,
  EMPTY_CART,
  readStoredCart,
  removeFromCart,
  replaceCartItem,
  setCartQuantity,
  type CartItem,
  type NewCartItem,
  type StoredCart,
} from "@/lib/cart";
import { saveCart } from "@/server/cart/actions";

export const CART_STORAGE_KEY = "hx_cart";
const CART_UNSAVED_KEY = "hx_cart_unsaved";
const SAVE_DELAY_MS = 400;

export type CartSnapshot = {
  /** False on the server and before the browser has read localStorage. */
  ready: boolean;
  cart: StoredCart;
};

const SERVER_SNAPSHOT: CartSnapshot = { ready: false, cart: EMPTY_CART };
let snapshot: CartSnapshot = SERVER_SNAPSHOT;
/** The stored text `snapshot` was read from; re-read when it changes. */
let snapshotRaw: string | null = null;
const listeners = new Set<() => void>();
let saveTimer: ReturnType<typeof setTimeout> | undefined;
/** Counts changes, so an older save finishing can't mark a newer one saved. */
let saveVersion = 0;

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(CART_STORAGE_KEY);
  } catch {
    // Private mode or storage turned off: the cart lives in memory only.
    return null;
  }
}

function parse(raw: string | null): StoredCart {
  try {
    return readStoredCart(raw === null ? null : JSON.parse(raw));
  } catch {
    return EMPTY_CART;
  }
}

function emit(): void {
  for (const listener of listeners) listener();
}

/** Another tab changed the cart. */
function onStorage(event: StorageEvent): void {
  if (event.key !== null && event.key !== CART_STORAGE_KEY) return;
  emit();
}

function subscribe(listener: () => void): () => void {
  if (listeners.size === 0) window.addEventListener("storage", onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): CartSnapshot {
  const raw = readRaw();
  if (!snapshot.ready || raw !== snapshotRaw) {
    snapshot = { ready: true, cart: parse(raw) };
    snapshotRaw = raw;
  }
  return snapshot;
}

/**
 * Remembers that this browser holds changes the account hasn't received. It is
 * stored because leaving the page cancels the delayed save: the next page must
 * send the browser's cart rather than load the older one over it.
 */
function setUnsaved(unsaved: boolean): void {
  try {
    if (unsaved) window.localStorage.setItem(CART_UNSAVED_KEY, "true");
    else window.localStorage.removeItem(CART_UNSAVED_KEY);
  } catch {
    // Storage turned off: the cart lives in memory only anyway.
  }
}

function scheduleSave(items: CartItem[]): void {
  clearTimeout(saveTimer);
  setUnsaved(true);
  const version = ++saveVersion;
  saveTimer = setTimeout(() => {
    saveCart(items)
      .then(() => {
        // A newer change is still waiting for its own save.
        if (version === saveVersion) setUnsaved(false);
      })
      // Best effort: the browser copy stays, and is sent again later.
      .catch(() => undefined);
  }, SAVE_DELAY_MS);
}

function write(cart: StoredCart, { save = true } = {}): void {
  const raw = JSON.stringify(cart);
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, raw);
  } catch {
    // Storage full or turned off: the cart still works until the tab closes.
  }
  snapshot = { ready: true, cart };
  snapshotRaw = readRaw();
  emit();
  if (save && cart.owner !== null) {
    scheduleSave(cart.items);
  } else {
    saveVersion++;
    setUnsaved(false);
  }
}

function update(change: (items: CartItem[]) => CartItem[]): void {
  const { cart } = getSnapshot();
  write({ ...cart, items: change(cart.items) });
}

/** A random id for a new cart item. */
export function newCartItemId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Plain-http pages (e.g. a phone testing a laptop's dev server) lack randomUUID.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export const cartStore = {
  read: getSnapshot,

  /** Adds an item; returns false when the cart is full. */
  add(entry: NewCartItem): boolean {
    const { cart } = getSnapshot();
    const result = addToCart(cart.items, entry, newCartItemId());
    if (result.ok) write({ ...cart, items: result.items });
    return result.ok;
  },
  setQuantity(id: string, quantity: number): void {
    update((items) => setCartQuantity(items, id, quantity));
  },
  remove(id: string): void {
    update((items) => removeFromCart(items, id));
  },
  replace(id: string, entry: NewCartItem): void {
    update((items) => replaceCartItem(items, id, entry));
  },
  /** Empties the cart (after an order is placed). */
  clear(): void {
    update(() => []);
  },
  /** Forgets a signed-out account's cart on this device. */
  forget(): void {
    write(EMPTY_CART, { save: false });
  },
  /** Takes the account's cart as loaded or merged by the server. */
  setAccount(owner: string, items: CartItem[]): void {
    write({ owner, items }, { save: false });
  },
  /** True when the account hasn't received the browser's latest changes. */
  hasUnsavedChanges(): boolean {
    try {
      return window.localStorage.getItem(CART_UNSAVED_KEY) !== null;
    } catch {
      return false;
    }
  },
  /** Sends the browser's cart to its account. */
  saveToAccount(): void {
    scheduleSave(getSnapshot().cart.items);
  },
};

/** The cart, kept up to date. `ready` is false until the browser has read it. */
export function useCart(): CartSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, () => SERVER_SNAPSHOT);
}
