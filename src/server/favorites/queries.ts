import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { savedDrink } from "@/db/schema";

/** The signed-in customer's saved drinks, newest first. */
export async function listFavorites(userId: string) {
  return getDb()
    .select({
      id: savedDrink.id,
      name: savedDrink.name,
      config: savedDrink.config,
    })
    .from(savedDrink)
    .where(eq(savedDrink.userId, userId))
    .orderBy(desc(savedDrink.createdAt));
}
