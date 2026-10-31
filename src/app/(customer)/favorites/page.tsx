import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { RemoveFavoriteButton } from "@/components/favorites/remove-favorite-button";
import { MenuUnavailable } from "@/components/menu/menu-unavailable";
import { ReorderButton } from "@/components/orders/reorder-button";
import { buttonVariants } from "@/components/ui/button";
import { priceCartItems } from "@/lib/cart";
import { formatPeso } from "@/lib/money";
import { requireUser } from "@/server/auth/session";
import { getSelectedBranchSlug, loadCatalog } from "@/server/catalog/queries";
import { listFavorites } from "@/server/favorites/queries";

export const metadata: Metadata = { title: "Favorites" };

async function FavoritesList() {
  const user = await requireUser("/favorites");
  const [favorites, snapshot, branch] = await Promise.all([
    listFavorites(user.id),
    loadCatalog(),
    getSelectedBranchSlug(),
  ]);
  if (!snapshot) return <MenuUnavailable />;

  if (favorites.length === 0) {
    return (
      <div className="mt-6 rounded-2xl border bg-surface p-6">
        <p className="text-lg font-semibold">No saved drinks yet.</p>
        <p className="mt-1 text-muted-foreground">
          Build a drink and save it from its review step.
        </p>
        <Link
          href="/build"
          className={buttonVariants({
            size: "lg",
            className: "mt-4 h-11 px-5 font-semibold",
          })}
        >
          Build your drink
        </Link>
      </div>
    );
  }

  const now = new Date();
  return (
    <ul className="mt-6 grid gap-4 md:grid-cols-2">
      {favorites.map((favorite) => {
        const entry = {
          kind: "custom" as const,
          config: favorite.config,
          quantity: 1,
        };
        const [priced] = priceCartItems(
          [{ ...entry, id: favorite.id }],
          snapshot,
          branch,
          now,
        );
        return (
          <li
            key={favorite.id}
            className="flex flex-col gap-3 rounded-2xl border bg-surface p-5"
          >
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-heading text-lg font-extrabold">
                {favorite.name}
              </h2>
              {priced?.unitPriceCentavos != null ? (
                <span className="shrink-0 font-semibold">
                  {formatPeso(priced.unitPriceCentavos)}
                </span>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">
              {priced?.details.join(" · ")}
            </p>
            {priced?.problem ? (
              <p className="text-sm text-danger">{priced.problem}</p>
            ) : null}
            <ReorderButton
              entries={priced?.unitPriceCentavos != null ? [entry] : []}
              label="Add to cart"
              ariaLabel={`Add ${favorite.name} to cart`}
            />
            <RemoveFavoriteButton id={favorite.id} name={favorite.name} />
          </li>
        );
      })}
    </ul>
  );
}

export default function FavoritesPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 pb-28 md:px-6 md:py-16">
      <h1 className="font-heading text-3xl font-extrabold tracking-tight">
        Favorites
      </h1>
      <Suspense
        fallback={
          <p role="status" className="mt-6 text-muted-foreground">
            Loading your favorites…
          </p>
        }
      >
        <FavoritesList />
      </Suspense>
    </div>
  );
}
