import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminHeading } from "@/components/admin/admin-ui";
import { ProductForm } from "@/components/admin/product-form";
import { recipeOptions } from "@/lib/admin-recipe";
import { requireRole } from "@/server/auth/session";
import { getCatalogSnapshot } from "@/server/catalog/queries";

export const metadata: Metadata = { title: "Add a menu item" };

async function NewProduct() {
  await requireRole(["admin"], "/admin/menu/new");
  const snapshot = await getCatalogSnapshot();
  return (
    <ProductForm
      recipeOptions={recipeOptions(snapshot, null)}
      initial={{
        type: "pastry",
        name: "",
        description: "",
        price: "",
        isSeasonal: false,
        availableFrom: "",
        availableTo: "",
        isActive: true,
        recipeSize: "12oz",
        recipeTemperature: "hot",
        recipeBase: "",
        recipeMilk: "none",
        recipeSweetness: "0",
        recipeSyrups: [],
        recipeToppings: [],
      }}
    />
  );
}

export default function NewProductPage() {
  return (
    <>
      <AdminHeading title="Add a menu item" />
      <Suspense
        fallback={
          <p role="status" className="mt-6 text-muted-foreground">
            Loading…
          </p>
        }
      >
        <NewProduct />
      </Suspense>
    </>
  );
}
