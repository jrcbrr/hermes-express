import { buildStockList, type StockItem } from "@/lib/stock";
import { requireRole } from "@/server/auth/session";
import { resolveStaffBranch } from "@/server/barista/branch";
import { getCatalogSnapshot } from "@/server/catalog/queries";
import { StaffBranchNav } from "./staff-branch-nav";
import { StockToggle } from "./stock-toggle";

const KIND_HEADINGS = {
  base: "Bases",
  milk: "Milks",
  syrup: "Syrups",
  topping: "Toppings",
} as const;

function StockSection({
  title,
  kind,
  items,
  branchId,
}: {
  title: string;
  kind: "product" | "ingredient";
  items: StockItem[];
  branchId: string;
}) {
  return (
    <section aria-label={title} className="mt-8">
      <h2 className="font-heading text-xl font-extrabold">{title}</h2>
      <ul className="mt-3 grid gap-2 md:grid-cols-2">
        {items.map((item) => (
          <StockToggle
            key={item.id}
            item={item}
            kind={kind}
            branchId={branchId}
          />
        ))}
      </ul>
    </section>
  );
}

/** Guards the stock page and lists what the branch can switch off. */
export async function StockContent({
  searchParams,
}: {
  searchParams: Promise<{ branch?: string | string[] }>;
}) {
  const user = await requireRole(["barista", "admin"], "/barista/stock");
  const { branch } = await searchParams;
  const branches = await resolveStaffBranch(
    user,
    typeof branch === "string" ? branch : null,
  );
  if (!branches) {
    return (
      <p className="mt-3 text-muted-foreground">
        No branch is assigned to your account. Please ask an admin.
      </p>
    );
  }
  const { current } = branches;
  const stock = buildStockList(await getCatalogSnapshot(), current.slug);

  return (
    <div key={current.id}>
      <p className="mt-2 text-muted-foreground">{current.name}</p>
      <StaffBranchNav branches={branches} page="/barista/stock" />
      <StockSection
        title="Menu items"
        kind="product"
        items={stock.products}
        branchId={current.id}
      />
      {stock.ingredients.map(({ kind, items }) => (
        <StockSection
          key={kind}
          title={KIND_HEADINGS[kind]}
          kind="ingredient"
          items={items}
          branchId={current.id}
        />
      ))}
    </div>
  );
}
