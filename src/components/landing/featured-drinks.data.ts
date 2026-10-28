// TODO(Stage 3): replace with signature products from the database.
// Placeholder copy of the signature drinks in docs/PLAN.md §6 (12oz prices).

export type FeaturedDrink = {
  slug: string;
  name: string;
  description: string;
  priceCentavos: number;
};

export const featuredDrinks: readonly FeaturedDrink[] = [
  {
    slug: "olympus-latte",
    name: "Olympus Latte",
    description: "Latte with oat milk, honey and a dusting of cinnamon.",
    priceCentavos: 17500,
  },
  {
    slug: "winged-mocha",
    name: "Winged Mocha",
    description: "Mocha with whole milk, whipped cream and chocolate drizzle.",
    priceCentavos: 18500,
  },
  {
    slug: "caduceus-cold-brew",
    name: "Caduceus Cold Brew",
    description: "Slow-steeped cold brew crowned with sea salt cream.",
    priceCentavos: 17500,
  },
  {
    slug: "ambrosia-matcha",
    name: "Ambrosia Matcha",
    description: "Matcha with oat milk and a touch of vanilla.",
    priceCentavos: 19500,
  },
  {
    slug: "golden-sandal",
    name: "Golden Sandal",
    description: "Spanish latte with brown sugar and coffee jelly.",
    priceCentavos: 19000,
  },
  {
    slug: "messenger-americano",
    name: "Messenger Americano",
    description: "Americano with an extra shot, for swift days.",
    priceCentavos: 15000,
  },
];
