import type { MenuSection, ProductType } from "@/lib/catalog";
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

/** Jump links plus one section per product type. */
export function MenuSections({ sections }: { sections: MenuSection[] }) {
  return (
    <>
      <nav aria-label="Menu sections" className="mt-8">
        <ul className="flex flex-wrap gap-2">
          {sections.map(({ type }) => (
            <li key={type}>
              <a
                href={`#${sectionInfo[type].id}`}
                className="inline-flex h-10 items-center rounded-lg border px-4 text-sm font-medium hover:bg-muted"
              >
                {sectionInfo[type].title}
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
            {items.length > 0 ? (
              <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => (
                  <ProductCard key={item.slug} item={item} />
                ))}
              </ul>
            ) : (
              <p className="mt-6 rounded-2xl border bg-surface p-5 text-muted-foreground">
                Nothing here at the moment. Please check back soon.
              </p>
            )}
          </section>
        );
      })}
    </>
  );
}
