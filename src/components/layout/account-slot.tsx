import { getSession } from "@/server/auth/session";
import { AccountMenu } from "./account-menu";

/**
 * Reads the session on the server and renders the account menu. The header
 * wraps this in <Suspense>, so the rest of the page can still be prerendered.
 */
export async function AccountSlot() {
  const session = await getSession();
  const user = session
    ? {
        name: session.user.name,
        email: session.user.email,
        role: session.user.role ?? "customer",
      }
    : null;
  return <AccountMenu user={user} />;
}
