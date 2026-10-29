import {
  groupDrinks,
  type MenuItem,
  type MenuSection,
  type ProductType,
} from "@/lib/catalog";
import type { DrinkTemperature } from "@/lib/validation/drink";
import { ProductCard } from "./product-card";

export const sectionInfo: Record<
  ProductType,
  { id: string; title: string; intro: string }
> = {
  signature: {
    id: "signature-drinks",
    title: "Signature Drinks",
    intro:
      "Our house creations. Prices are for a 12oz cup; customize any of them in the builder.",
  },
  pastry: {
    id: "pastries",
    title: "Pastries",
    intro: "Baked fresh each morning.",
  },
  snack: {
    id: "snacks",
    title: "Snacks",
    intro: "Something more filling to go with your cup.",
  },
};

const drinkGroupInfo: Record<
  DrinkTemperature | "other",
  { id: string; title: string }
> = {
  hot: { id: "hot-drinks", title: "Hot drinks" },
  iced: { id: "iced-drinks", title: "Iced drinks" },
  blended: { id: "frappes", title: "Frappes" },
  other: { id: "more-drinks", title: "More drinks" },
};

const gridClass = "mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3";

/** Signature drinks under Hot / Iced / Frappes subheadings. */
function DrinkGroups({ items }: { items: MenuItem[] }) {
  return groupDrinks(items).map(({ temperature, items: drinks }) => {
    const { id, title } = drinkGroupInfo[temperature ?? "other"];
    return (
      <div key={id} className="mt-8">
        <h3 id={id} className="scroll-mt-24 text-xl font-bold">
          {title}
        </h3>
        <ul className={gridClass} aria-labelledby={id}>
          {drinks.map((item) => (
            <ProductCard key={item.slug} item={item} headingLevel={4} />
          ))}
        </ul>
      </div>
    );
  });
}

/** Jump links plus one section per product type. */
export function MenuSections({ sections }: { sections: MenuSection[] }) {
  // Each section, plus each drink group right after Signature Drinks.
  const jumpLinks = sections.flatMap(({ type, items }) => [
    sectionInfo[type],
    ...(type === "signature"
      ? groupDrinks(items).map((g) => drinkGroupInfo[g.temperature ?? "other"])
      : []),
  ]);
  return (
    <>
      <nav aria-label="Menu sections" className="mt-8">
        <ul className="flex flex-wrap gap-2">
          {jumpLinks.map(({ id, title }) => (
            <li key={id}>
              <a
                href={`#${id}`}
                className="inline-flex h-10 items-center rounded-lg border px-4 text-sm font-medium hover:bg-muted"
              >
                {title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {sections.map(({ type, items }) => {
        const { id, title, intro } = sectionInfo[type];
        return (
          <section
            key={type}
            id={id}
            aria-labelledby={`${id}-heading`}
            className="mt-12 scroll-mt-24"
          >
            <h2
              id={`${id}-heading`}
              className="text-2xl font-extrabold tracking-tight md:text-3xl"
            >
              {title}
            </h2>
            <p className="mt-2 text-muted-foreground">{intro}</p>
            {items.length === 0 ? (
              <p className="mt-6 rounded-2xl border bg-surface p-5 text-muted-foreground">
                Nothing here at the moment. Please check back soon.
              </p>
            ) : type === "signature" ? (
              <DrinkGroups items={items} />
            ) : (
              <ul className={gridClass}>
                {items.map((item) => (
                  <ProductCard key={item.slug} item={item} />
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </>
  );
}
