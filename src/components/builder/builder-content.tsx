import { connection } from "next/server";
import { toBuilderCatalog } from "@/lib/builder/catalog";
import { resolveBuilderStart, type SearchParams } from "@/lib/builder/start";
import { soldOutIngredientsByBranch } from "@/lib/catalog";
import { getSelectedBranchSlug, loadCatalog } from "@/server/catalog/queries";
import { BuilderUnavailable } from "./builder-unavailable";
import { CoffeeBuilder } from "./coffee-builder";

/**
 * The live part of /build. It reads the branch cookie and the query string, so
 * it renders per request (inside <Suspense>); the catalog itself is cached.
 */
export async function BuilderContent({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await connection();
  const [params, branchSlug, snapshot] = await Promise.all([
    searchParams,
    getSelectedBranchSlug(),
    loadCatalog(),
  ]);
  if (!snapshot) return <BuilderUnavailable />;

  const catalog = toBuilderCatalog(snapshot, new Date());
  const start = resolveBuilderStart(catalog, params);
  return (
    <CoffeeBuilder
      catalog={catalog}
      start={start.draft}
      signatureName={start.signatureName}
      notice={start.notice}
      initialBranch={branchSlug}
      soldOutByBranch={soldOutIngredientsByBranch(snapshot)}
    />
  );
}
