// The menu from docs/PLAN.md §6, as seed data. Prices are integer centavos.
// The seed only inserts rows that are missing, so editing a price here does
// not change a database that already has the row (the admin does that, Stage 7).
import type { IngredientKind, ProductType, PromoType } from "@/lib/catalog";
import { pesosToCentavos as peso } from "@/lib/money";
import type { DrinkConfig } from "@/lib/validation/drink";

export type IngredientSeed = {
  kind: IngredientKind;
  slug: string;
  name: string;
  priceCentavos: number;
  /** Layer colour in the builder cup (#RRGGBB). Null for non-liquids. */
  color: string | null;
  includedShots?: number;
};

export type ProductSeed = {
  type: ProductType;
  slug: string;
  name: string;
  description: string;
  priceCentavos: number;
  recipe?: DrinkConfig;
  isSeasonal?: boolean;
  availableFrom?: Date;
  availableTo?: Date;
};

export type PromoSeed = {
  code: string;
  type: PromoType;
  value: number;
  maxDiscountCentavos?: number;
  minSubtotalCentavos?: number;
  firstOrderOnly?: boolean;
  startsAt?: Date;
  endsAt?: Date;
};

/** Sold-out flags seeded for the demo (owner decision, Stage 3). */
export type StockSeed = {
  branchSlug: string;
  productSlug: string;
};

// Espresso-based bases include one shot; extra shots cost ₱40 each.
const ESPRESSO = { includedShots: 1 } as const;

export const ingredientSeeds: readonly IngredientSeed[] = [
  // Sizes and temperatures are options, not liquids, so they have no colour.
  { kind: "size", slug: "12oz", name: "12oz", priceCentavos: 0, color: null },
  {
    kind: "size",
    slug: "16oz",
    name: "16oz",
    priceCentavos: peso(20),
    color: null,
  },
  {
    kind: "size",
    slug: "22oz",
    name: "22oz",
    priceCentavos: peso(40),
    color: null,
  },
  {
    kind: "temperature",
    slug: "hot",
    name: "Hot",
    priceCentavos: 0,
    color: null,
  },
  {
    kind: "temperature",
    slug: "iced",
    name: "Iced",
    priceCentavos: 0,
    color: null,
  },
  {
    kind: "temperature",
    slug: "blended",
    name: "Blended",
    priceCentavos: peso(20),
    color: null,
  },

  {
    kind: "shot",
    slug: "extra-shot",
    name: "Extra shot",
    priceCentavos: peso(40),
    color: "#3B2416",
  },

  {
    kind: "base",
    slug: "espresso",
    name: "Espresso",
    priceCentavos: peso(90),
    color: "#3B2416",
    ...ESPRESSO,
  },
  {
    kind: "base",
    slug: "americano",
    name: "Americano",
    priceCentavos: peso(110),
    color: "#4A2E1C",
    ...ESPRESSO,
  },
  {
    kind: "base",
    slug: "drip-coffee",
    name: "Drip Coffee",
    priceCentavos: peso(100),
    color: "#4E3220",
  },
  {
    kind: "base",
    slug: "cold-brew",
    name: "Cold Brew",
    priceCentavos: peso(140),
    color: "#3A2618",
  },
  {
    kind: "base",
    slug: "latte",
    name: "Latte",
    priceCentavos: peso(130),
    color: "#5A3825",
    ...ESPRESSO,
  },
  {
    kind: "base",
    slug: "cappuccino",
    name: "Cappuccino",
    priceCentavos: peso(130),
    color: "#573522",
    ...ESPRESSO,
  },
  {
    kind: "base",
    slug: "flat-white",
    name: "Flat White",
    priceCentavos: peso(140),
    color: "#4F3020",
    ...ESPRESSO,
  },
  {
    kind: "base",
    slug: "mocha",
    name: "Mocha",
    priceCentavos: peso(150),
    color: "#4A2A1E",
    ...ESPRESSO,
  },
  {
    kind: "base",
    slug: "spanish-latte",
    name: "Spanish Latte",
    priceCentavos: peso(150),
    color: "#6E4528",
    ...ESPRESSO,
  },
  {
    kind: "base",
    slug: "matcha",
    name: "Matcha",
    priceCentavos: peso(150),
    color: "#6E9B3A",
  },
  {
    kind: "base",
    slug: "hojicha",
    name: "Hojicha",
    priceCentavos: peso(150),
    color: "#8A5A36",
  },
  {
    kind: "base",
    slug: "chai",
    name: "Chai",
    priceCentavos: peso(140),
    color: "#A5703F",
  },
  {
    kind: "base",
    slug: "chocolate",
    name: "Chocolate",
    priceCentavos: peso(130),
    color: "#4B2C1F",
  },
  {
    kind: "base",
    slug: "strawberry-milk",
    name: "Strawberry Milk",
    priceCentavos: peso(130),
    color: "#E88FA3",
  },
  {
    kind: "base",
    slug: "ube-milk",
    name: "Ube Milk",
    priceCentavos: peso(140),
    color: "#7B52A8",
  },

  {
    kind: "milk",
    slug: "whole",
    name: "Whole milk",
    priceCentavos: 0,
    color: "#FAF3E6",
  },
  {
    kind: "milk",
    slug: "skim",
    name: "Skim milk",
    priceCentavos: 0,
    color: "#F4F1EA",
  },
  {
    kind: "milk",
    slug: "none",
    name: "No milk",
    priceCentavos: 0,
    color: null,
  },
  {
    kind: "milk",
    slug: "soy",
    name: "Soy milk",
    priceCentavos: peso(20),
    color: "#EFE3C8",
  },
  {
    kind: "milk",
    slug: "oat",
    name: "Oat milk",
    priceCentavos: peso(30),
    color: "#E9D7B5",
  },
  {
    kind: "milk",
    slug: "almond",
    name: "Almond milk",
    priceCentavos: peso(30),
    color: "#EEDCC2",
  },
  {
    kind: "milk",
    slug: "coconut",
    name: "Coconut milk",
    priceCentavos: peso(30),
    color: "#FBF8F1",
  },

  {
    kind: "syrup",
    slug: "vanilla",
    name: "Vanilla",
    priceCentavos: peso(20),
    color: "#F3E2B3",
  },
  {
    kind: "syrup",
    slug: "caramel",
    name: "Caramel",
    priceCentavos: peso(20),
    color: "#C47F2C",
  },
  {
    kind: "syrup",
    slug: "hazelnut",
    name: "Hazelnut",
    priceCentavos: peso(20),
    color: "#A8692F",
  },
  {
    kind: "syrup",
    slug: "salted-caramel",
    name: "Salted Caramel",
    priceCentavos: peso(20),
    color: "#B8742E",
  },
  {
    kind: "syrup",
    slug: "brown-sugar",
    name: "Brown Sugar",
    priceCentavos: peso(20),
    color: "#8B5A2B",
  },
  {
    kind: "syrup",
    slug: "honey",
    name: "Honey",
    priceCentavos: peso(20),
    color: "#E0A526",
  },
  {
    kind: "syrup",
    slug: "cinnamon",
    name: "Cinnamon",
    priceCentavos: peso(20),
    color: "#9C4F24",
  },
  {
    kind: "syrup",
    slug: "peppermint",
    name: "Peppermint",
    priceCentavos: peso(20),
    color: "#CFEFE4",
  },
  {
    kind: "syrup",
    slug: "toffee",
    name: "Toffee",
    priceCentavos: peso(20),
    color: "#9E6328",
  },
  {
    kind: "syrup",
    slug: "white-chocolate",
    name: "White Chocolate",
    priceCentavos: peso(20),
    color: "#F5ECD7",
  },

  {
    kind: "topping",
    slug: "whipped-cream",
    name: "Whipped Cream",
    priceCentavos: peso(20),
    color: "#FFFDF7",
  },
  {
    kind: "topping",
    slug: "cold-foam",
    name: "Cold Foam",
    priceCentavos: peso(30),
    color: "#F7F1E6",
  },
  {
    kind: "topping",
    slug: "sea-salt-cream",
    name: "Sea Salt Cream",
    priceCentavos: peso(35),
    color: "#F1EADF",
  },
  {
    kind: "topping",
    slug: "caramel-drizzle",
    name: "Caramel Drizzle",
    priceCentavos: peso(15),
    color: "#C47F2C",
  },
  {
    kind: "topping",
    slug: "chocolate-drizzle",
    name: "Chocolate Drizzle",
    priceCentavos: peso(15),
    color: "#4B2C1F",
  },
  {
    kind: "topping",
    slug: "cookie-crumble",
    name: "Cookie Crumble",
    priceCentavos: peso(20),
    color: "#5A3A26",
  },
  {
    kind: "topping",
    slug: "cinnamon-dust",
    name: "Cinnamon Dust",
    priceCentavos: 0,
    color: "#9C4F24",
  },
  {
    kind: "topping",
    slug: "cocoa-powder",
    name: "Cocoa Powder",
    priceCentavos: 0,
    color: "#5E3B27",
  },
  {
    kind: "topping",
    slug: "tapioca-pearls",
    name: "Tapioca Pearls",
    priceCentavos: peso(20),
    color: "#2B1A12",
  },
  {
    kind: "topping",
    slug: "coffee-jelly",
    name: "Coffee Jelly",
    priceCentavos: peso(20),
    color: "#3B2416",
  },
  {
    kind: "topping",
    slug: "nata-de-coco",
    name: "Nata de Coco",
    priceCentavos: peso(15),
    color: "#F4F6F2",
  },
];

/** The common parts of every signature recipe (12oz, regular milk, 50% sweet). */
const recipe = (
  parts: Partial<DrinkConfig> &
    Pick<DrinkConfig, "base" | "temperature" | "milk">,
): DrinkConfig => ({
  size: "12oz",
  milkAmount: "regular",
  sweetness: 50,
  syrups: [],
  toppings: [],
  ...parts,
});

export const productSeeds: readonly ProductSeed[] = [
  {
    type: "signature",
    slug: "olympus-latte",
    name: "Olympus Latte",
    description: "Latte with oat milk, honey and a dusting of cinnamon.",
    priceCentavos: peso(175),
    recipe: recipe({
      base: "latte",
      temperature: "hot",
      shots: 1,
      milk: "oat",
      syrups: ["honey"],
      toppings: ["cinnamon-dust"],
    }),
  },
  {
    type: "signature",
    slug: "winged-mocha",
    name: "Winged Mocha",
    description: "Mocha with whole milk, whipped cream and chocolate drizzle.",
    priceCentavos: peso(185),
    recipe: recipe({
      base: "mocha",
      temperature: "hot",
      shots: 1,
      milk: "whole",
      toppings: ["whipped-cream", "chocolate-drizzle"],
    }),
  },
  {
    type: "signature",
    slug: "caduceus-cold-brew",
    name: "Caduceus Cold Brew",
    description: "Slow-steeped cold brew crowned with sea salt cream.",
    priceCentavos: peso(175),
    recipe: recipe({
      base: "cold-brew",
      temperature: "iced",
      iceLevel: "regular",
      milk: "none",
      sweetness: 25,
      toppings: ["sea-salt-cream"],
    }),
  },
  {
    type: "signature",
    slug: "ambrosia-matcha",
    name: "Ambrosia Matcha",
    description: "Matcha with oat milk and a touch of vanilla.",
    priceCentavos: peso(195),
    recipe: recipe({
      base: "matcha",
      temperature: "iced",
      iceLevel: "regular",
      milk: "oat",
      syrups: ["vanilla"],
    }),
  },
  {
    type: "signature",
    slug: "golden-sandal",
    name: "Golden Sandal",
    description: "Spanish latte with brown sugar and coffee jelly.",
    priceCentavos: peso(190),
    recipe: recipe({
      base: "spanish-latte",
      temperature: "iced",
      iceLevel: "regular",
      shots: 1,
      milk: "whole",
      syrups: ["brown-sugar"],
      toppings: ["coffee-jelly"],
    }),
  },
  {
    type: "signature",
    slug: "messenger-americano",
    name: "Messenger Americano",
    description: "Americano with an extra shot, for swift days.",
    priceCentavos: peso(150),
    recipe: recipe({
      base: "americano",
      temperature: "hot",
      shots: 2,
      milk: "none",
      sweetness: 0,
    }),
  },

  {
    type: "pastry",
    slug: "butter-croissant",
    name: "Butter Croissant",
    description: "Flaky, golden layers made with real butter.",
    priceCentavos: peso(95),
  },
  {
    type: "pastry",
    slug: "pain-au-chocolat",
    name: "Pain au Chocolat",
    description: "Buttery pastry folded around dark chocolate.",
    priceCentavos: peso(110),
  },
  {
    type: "pastry",
    slug: "cinnamon-roll",
    name: "Cinnamon Roll",
    description: "Soft swirl of cinnamon sugar with a light glaze.",
    priceCentavos: peso(120),
  },
  {
    type: "pastry",
    slug: "banana-bread",
    name: "Banana Bread",
    description: "Moist, home-style loaf made with ripe bananas.",
    priceCentavos: peso(85),
  },
  {
    type: "pastry",
    slug: "ensaymada",
    name: "Ensaymada",
    description: "Pillowy brioche with butter, sugar and grated cheese.",
    priceCentavos: peso(75),
  },
  {
    type: "pastry",
    slug: "ube-cheese-pandesal",
    name: "Ube Cheese Pandesal",
    description: "Purple yam pandesal with a melting cheese centre.",
    priceCentavos: peso(60),
    // Demo seasonal item (owner decision, Stage 3). Manila time (UTC+8).
    isSeasonal: true,
    availableFrom: new Date("2026-10-01T00:00:00+08:00"),
    availableTo: new Date("2026-12-31T23:59:59+08:00"),
  },
  {
    type: "pastry",
    slug: "blueberry-muffin",
    name: "Blueberry Muffin",
    description: "Tender muffin filled with juicy blueberries.",
    priceCentavos: peso(90),
  },

  {
    type: "snack",
    slug: "chocolate-chip-cookie",
    name: "Chocolate Chip Cookie",
    description: "Crisp edges, chewy centre, plenty of chocolate.",
    priceCentavos: peso(65),
  },
  {
    type: "snack",
    slug: "ham-cheese-croissant",
    name: "Ham & Cheese Croissant Sandwich",
    description: "Butter croissant filled with ham and melted cheese.",
    priceCentavos: peso(160),
  },
  {
    type: "snack",
    slug: "chicken-pesto-panini",
    name: "Chicken Pesto Panini",
    description: "Grilled chicken, basil pesto and mozzarella, pressed warm.",
    priceCentavos: peso(180),
  },
];

export const promoSeeds: readonly PromoSeed[] = [
  {
    code: "FIRSTSIP",
    type: "fixed",
    value: peso(50),
    minSubtotalCentavos: peso(150),
    firstOrderOnly: true,
  },
  {
    code: "HERMES10",
    type: "percent",
    value: 10,
    maxDiscountCentavos: peso(100),
  },
  {
    code: "OLYMPUS20",
    type: "percent",
    value: 20,
    minSubtotalCentavos: peso(500),
    // Time-limited (owner decision, Stage 3). Manila time (UTC+8).
    startsAt: new Date("2026-11-01T00:00:00+08:00"),
    endsAt: new Date("2026-12-31T23:59:59+08:00"),
  },
];

export const stockSeeds: readonly StockSeed[] = [
  { branchSlug: "bgc", productSlug: "cinnamon-roll" },
];
