import { connection } from "next/server";
import { buildMenu, soldOutSlugsByBranch } from "@/lib/catalog";
import { getSelectedBranchSlug, loadCatalog } from "@/server/catalog/queries";
import { MenuBrowser } from "./menu-browser";

/**
 * The live part of /menu. It reads the branch cookie and the current time, so
 * it renders per request (inside <Suspense>); the catalog itself is cached.
 */
export async function MenuContent() {
  // Request time from here on: seasonal checks use the current date.
  await connection();
  const branchSlug = await getSelectedBranchSlug();
  const catalog = await loadCatalog();
  const now = new Date();

  return (
    <MenuBrowser
      initialBranch={branchSlug}
      sections={catalog ? buildMenu(catalog, branchSlug, now) : null}
      soldOutByBranch={catalog ? soldOutSlugsByBranch(catalog, now) : {}}
    >
      <p className="mt-4 text-sm text-muted-foreground">
        Online ordering opens soon. Until then, you are welcome to browse the
        menu.
      </p>
    </MenuBrowser>
  );
}
