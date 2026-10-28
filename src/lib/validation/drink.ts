import { z } from "zod";

/**
 * The shape of a drink, shared by the builder (client), server actions and
 * the database (`product.recipe`, and later `order_item.config`).
 *
 * This schema checks structure and limits only. Whether an ingredient exists,
 * is active, or suits the chosen base is checked against the catalog in
 * src/lib/pricing.ts.
 */

export const DRINK_SIZES = ["12oz", "16oz", "22oz"] as const;
export const DRINK_TEMPERATURES = ["hot", "iced", "blended"] as const;
export const AMOUNT_LEVELS = ["light", "regular", "extra"] as const;
export const SWEETNESS_LEVELS = [0, 25, 50, 75, 100] as const;

export const MIN_SHOTS = 1;
export const MAX_SHOTS = 4;
export const MAX_SYRUPS = 3;
export const MAX_TOPPINGS = 5;
export const DRINK_NAME_MAX_LENGTH = 40;

export type DrinkSize = (typeof DRINK_SIZES)[number];
export type DrinkTemperature = (typeof DRINK_TEMPERATURES)[number];
export type AmountLevel = (typeof AMOUNT_LEVELS)[number];
export type SweetnessLevel = (typeof SWEETNESS_LEVELS)[number];

const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Please choose a valid option.");

/** A list of ingredient slugs with no repeats and at most `max` entries. */
function slugList(max: number, label: string) {
  return z
    .array(slug)
    .max(max, `Please choose at most ${max} ${label}.`)
    .refine(
      (items) => new Set(items).size === items.length,
      `Each ${label.replace(/s$/, "")} can only be added once.`,
    );
}

export const drinkConfigSchema = z
  .object({
    size: z.enum(DRINK_SIZES),
    temperature: z.enum(DRINK_TEMPERATURES),
    /** Only for iced drinks. */
    iceLevel: z.enum(AMOUNT_LEVELS).optional(),
    base: slug,
    /** Only for espresso-based bases. Missing means the base's included shots. */
    shots: z.number().int().min(MIN_SHOTS).max(MAX_SHOTS).optional(),
    /** A milk slug; "none" is a milk option too. */
    milk: slug,
    milkAmount: z.enum(AMOUNT_LEVELS),
    sweetness: z.literal(SWEETNESS_LEVELS),
    syrups: slugList(MAX_SYRUPS, "syrups"),
    toppings: slugList(MAX_TOPPINGS, "toppings"),
    /** The customer's name for the drink, e.g. "Monday Fuel". */
    name: z
      .string()
      .trim()
      .min(1, "Please enter a name, or leave it empty.")
      .max(
        DRINK_NAME_MAX_LENGTH,
        `Please keep the name under ${DRINK_NAME_MAX_LENGTH} characters.`,
      )
      .optional(),
    /** Set when the drink started from a signature drink (see pricing.ts). */
    signature: slug.optional(),
  })
  .strict()
  .refine(
    (config) => config.iceLevel === undefined || config.temperature === "iced",
    {
      message: "Ice level is only for iced drinks.",
      path: ["iceLevel"],
    },
  );

export type DrinkConfig = z.infer<typeof drinkConfigSchema>;
