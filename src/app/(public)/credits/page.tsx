import type { Metadata } from "next";
import { menuPhotoCredits } from "@/config/photo-credits";
import { productSeeds } from "@/db/catalog-data";

export const metadata: Metadata = {
  title: "Photo credits",
  description:
    "The photographers and licences behind the menu photos on Hermes Express.",
};

const linkClass = "text-accent underline underline-offset-4";

/** Credits every menu photo, as its licence asks (no database needed). */
export default function CreditsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 pb-28 md:px-6 md:py-16">
      <h1 className="font-heading text-3xl font-extrabold tracking-tight md:text-4xl">
        Photo credits
      </h1>
      <p className="mt-2 text-muted-foreground">
        Our menu photos come from Wikimedia Commons. Thank you to the
        photographers who share their work under free licences. Photos are
        resized for the web.
      </p>
      <ul className="mt-8 divide-y rounded-2xl border bg-surface">
        {productSeeds.map((product) => {
          const credit = menuPhotoCredits[product.slug];
          if (!credit) return null;
          return (
            <li key={product.slug} className="p-4 text-sm">
              <p className="font-semibold">{product.name}</p>
              <p className="mt-1 text-muted-foreground">
                Photo by {credit.author},{" "}
                {credit.licenseUrl ? (
                  <a
                    href={credit.licenseUrl}
                    className={linkClass}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {credit.license}
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                ) : (
                  credit.license
                )}
                .{credit.changes ? ` ${credit.changes}` : ""}{" "}
                <a
                  href={credit.sourceUrl}
                  className={linkClass}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Source
                  <span className="sr-only">
                    {" "}
                    for the {product.name} photo (opens in a new tab)
                  </span>
                </a>
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
