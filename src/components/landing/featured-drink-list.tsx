import Link from "next/link";
import { connection } from "next/server";
import { MenuPhoto } from "@/components/menu/menu-photo";
import { buttonVariants } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { buildMenu } from "@/lib/catalog";
import { formatPeso } from "@/lib/money";
import { loadCatalog } from "@/server/catalog/queries";

const MAX_FEATURED = 6;

/** The signature drinks from the database, as landing page cards. */
export async function FeaturedDrinkList() {
  // Read the database per request, never at build time (CI has no database).
  await connection();
  const catalog = await loadCatalog();
  if (!catalog) {
    return (
      <p role="status" className="text-center text-muted-foreground">
        Our signature drinks are unavailable at the moment. Please try again in
        a few minutes.
      </p>
    );
  }

  // The landing page is not branch-specific; sold-out labels live on /menu.
  const [signatures] = buildMenu(
    catalog,
    siteConfig.branches[0].slug,
    new Date(),
  );
  const drinks = signatures?.items.slice(0, MAX_FEATURED) ?? [];

  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {drinks.map((drink, n) => (
        <li
          key={drink.slug}
          className="flex flex-col overflow-hidden rounded-2xl border bg-surface shadow-sm"
        >
          <MenuPhoto src={drink.imageUrl} eager={n === 0} />
          <div className="flex flex-1 flex-col p-5">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-bold">{drink.name}</h3>
              <p className="shrink-0 font-semibold">
                {formatPeso(drink.priceCentavos)}
              </p>
            </div>
            <p className="mt-2 flex-1 text-sm text-muted-foreground">
              {drink.description}
            </p>
            <div className="mt-5 flex gap-2">
              {/* Add to cart arrives in Stage 5; until then, Add opens the menu. */}
              <Link
                href="/menu#signature-drinks"
                aria-label={`Add ${drink.name}`}
                className={buttonVariants({
                  size: "lg",
                  className: "flex-1 font-semibold",
                })}
              >
                Add
              </Link>
              <Link
                href={`/build?drink=${drink.slug}`}
                aria-label={`Customize ${drink.name}`}
                className={buttonVariants({
                  variant: "outline",
                  size: "lg",
                  className: "flex-1 font-semibold",
                })}
              >
                Customize
              </Link>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
