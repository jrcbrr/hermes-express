import { buildMenu } from "@/lib/catalog";
import { getSelectedBranchSlug, loadCatalog } from "@/server/catalog/queries";
import { BranchPicker } from "./branch-picker";
import { MenuSections } from "./menu-sections";
import { MenuUnavailable } from "./menu-unavailable";

/**
 * The live part of /menu. It reads the branch cookie and the current time, so
 * it renders per request (inside <Suspense>); the catalog itself is cached.
 */
export async function MenuContent() {
  const branchSlug = await getSelectedBranchSlug();
  const catalog = await loadCatalog();

  return (
    <>
      <div className="mt-6">
        <BranchPicker selected={branchSlug} />
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        Online ordering opens soon. Until then, you are welcome to browse the
        menu.
      </p>
      {catalog ? (
        <MenuSections sections={buildMenu(catalog, branchSlug, new Date())} />
      ) : (
        <MenuUnavailable />
      )}
    </>
  );
}
