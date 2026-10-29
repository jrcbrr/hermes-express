import { connection } from "next/server";
import { MenuUnavailable } from "@/components/menu/menu-unavailable";
import { getSelectedBranchSlug, loadCatalog } from "@/server/catalog/queries";
import { CartView } from "./cart-view";

/**
 * The live part of /cart: the catalog (to price the items), the branch
 * cookie and the current time. The items themselves live in the browser.
 */
export async function CartContent() {
  await connection();
  const [branchSlug, snapshot] = await Promise.all([
    getSelectedBranchSlug(),
    loadCatalog(),
  ]);
  if (!snapshot) return <MenuUnavailable />;
  return (
    <CartView snapshot={snapshot} initialBranch={branchSlug} now={new Date()} />
  );
}
