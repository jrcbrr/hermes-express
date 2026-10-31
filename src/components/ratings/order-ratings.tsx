import { requireUser } from "@/server/auth/session";
import { getOrderForUser } from "@/server/orders/queries";
import { listRatings } from "@/server/ratings/queries";
import { RatingForm } from "./rating-form";

/** Rate each item, shown only to the customer once the order is Completed. */
export async function OrderRatings({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser(`/orders/${id}`);
  const found = await getOrderForUser(id, user);
  if (!found || found.userId !== user.id || found.status !== "completed") {
    return null;
  }
  const ratings = await listRatings(
    user.id,
    found.items.map((item) => item.id),
  );

  return (
    <section
      aria-labelledby="ratings-heading"
      className="mt-6 rounded-2xl border bg-surface p-6"
    >
      <h2 id="ratings-heading" className="font-heading text-xl font-extrabold">
        How was your order?
      </h2>
      <ul className="mt-4 flex flex-col gap-6">
        {found.items.map((item) => {
          const rated = ratings.find((r) => r.orderItemId === item.id);
          return (
            <li key={item.id}>
              {rated ? (
                <p>
                  <span className="font-semibold">{item.name}</span>: you rated
                  this {rated.stars} {rated.stars === 1 ? "star" : "stars"}.
                  {rated.comment ? ` “${rated.comment}”` : ""}
                </p>
              ) : (
                <RatingForm orderItemId={item.id} name={item.name} />
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
