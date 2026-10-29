import { getSession } from "@/server/auth/session";
import { CartAccountSync } from "./cart-account-sync";

/**
 * Reads who is signed in on the server and hands it to CartAccountSync. The
 * root layout wraps this in <Suspense>, like the header's account menu.
 */
export async function CartSessionSlot() {
  const session = await getSession();
  return <CartAccountSync userId={session?.user.id ?? null} />;
}
