import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdminHeading } from "@/components/admin/admin-ui";
import { ProductForm } from "@/components/admin/product-form";
import { StockToggle } from "@/components/barista/stock-toggle";
import { manilaDateString } from "@/lib/admin";
import { recipeOptions } from "@/lib/admin-recipe";
import { requireRole } from "@/server/auth/session";
import { listBranches } from "@/server/admin/queries";
import { getCatalogSnapshot } from "@/server/catalog/queries";

export const metadata: Metadata = { title: "Edit a menu item" };

async function EditProduct({ params }: PageProps<"/admin/menu/[id]">) {
  await requireRole(["admin"], "/admin/menu");
  const { id } = await params;
  const [snapshot, branches] = await Promise.all([
    getCatalogSnapshot(),
    listBranches(),
  ]);
  const product = snapshot.products.find((p) => p.id === id);
  if (!product) notFound();
  const recipe = product.recipe;

  return (
    <>
      <ProductForm
        recipeOptions={recipeOptions(snapshot, recipe)}
        initial={{
          id: product.id,
          type: product.type,
          name: product.name,
          description: product.description,
          price: String(product.priceCentavos / 100),
          isSeasonal: product.isSeasonal,
          availableFrom: product.availableFrom
            ? manilaDateString(product.availableFrom)
            : "",
          availableTo: product.availableTo
            ? manilaDateString(product.availableTo)
            : "",
          isActive: product.isActive,
          recipeSize: recipe?.size ?? "",
          recipeTemperature: recipe?.temperature ?? "",
          recipeBase: recipe?.base ?? "",
          recipeMilk: recipe?.milk ?? "",
          recipeSweetness: String(recipe?.sweetness ?? 0),
          recipeSyrups: recipe?.syrups ?? [],
          recipeToppings: recipe?.toppings ?? [],
        }}
      />
      <section aria-label="Sold out by branch" className="mt-10">
        <h2 className="font-heading text-xl font-extrabold">
          Sold out by branch
        </h2>
        <ul className="mt-3 grid gap-2 md:grid-cols-2">
          {branches.map((b) => (
            <StockToggle
              key={b.id}
              kind="product"
              branchId={b.id}
              item={{
                id: product.id,
                name: b.name,
                isSoldOut: snapshot.soldOut.some(
                  (f) => f.branchSlug === b.slug && f.productId === product.id,
                ),
                blockedBy: [],
              }}
            />
          ))}
        </ul>
      </section>
    </>
  );
}

export default function EditProductPage(props: PageProps<"/admin/menu/[id]">) {
  return (
    <>
      <AdminHeading title="Edit a menu item" />
      <Suspense
        fallback={
          <p role="status" className="mt-6 text-muted-foreground">
            Loading…
          </p>
        }
      >
        <EditProduct {...props} />
      </Suspense>
    </>
  );
}
