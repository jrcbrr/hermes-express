// Credits for the menu photos in public/images/menu/<slug>.jpg. All come from
// Wikimedia Commons under free licences; several (CC BY, CC BY-SA) require
// that we credit the photographer, which the /credits page does.

export type PhotoCredit = {
  author: string;
  license: string;
  /** Null for public-domain photos, which have no licence text. */
  licenseUrl: string | null;
  /** The photo's page on Wikimedia Commons. */
  sourceUrl: string;
  /** How we changed the photo, if at all (besides resizing). */
  changes?: string;
};

const commons = (file: string) =>
  `https://commons.wikimedia.org/wiki/File:${file}`;

const CC0 = {
  license: "CC0 1.0",
  licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
} as const;
const PUBLIC_DOMAIN = { license: "Public domain", licenseUrl: null } as const;
const ccBy = (version: string) => ({
  license: `CC BY ${version}`,
  licenseUrl: `https://creativecommons.org/licenses/by/${version}/`,
});
const ccBySa = (version: string) => ({
  license: `CC BY-SA ${version}`,
  licenseUrl: `https://creativecommons.org/licenses/by-sa/${version}/`,
});

/** Keyed by product slug. */
export const menuPhotoCredits: Record<string, PhotoCredit> = {
  "olympus-latte": {
    author: "Andy Li",
    ...CC0,
    sourceUrl: commons("Mocha_-_LOAM_2023-08-22.jpg"),
  },
  "winged-mocha": {
    author: "Monika Wahi",
    ...ccBySa("3.0"),
    sourceUrl: commons("Mocha_with_chocolate_syrup_flower.JPG"),
  },
  "caduceus-cold-brew": {
    author: "Andy Li",
    ...CC0,
    sourceUrl: commons(
      "Maple_Cream_Cold_Brew_-_Trading_Post_Coffee_Roasters_2026-07-16.jpg",
    ),
  },
  "ambrosia-matcha": {
    author: "MichaellaaRubio",
    ...ccBy("4.0"),
    sourceUrl: commons("Matcha_Late.jpg"),
  },
  "golden-sandal": {
    author: "Andy Li",
    ...CC0,
    sourceUrl: commons(
      "Iced_brown_sugar_latte_-_Caccia_and_Tails_2025-08-28.jpg",
    ),
  },
  "messenger-americano": {
    author: "Sameer.siddhanti",
    ...PUBLIC_DOMAIN,
    sourceUrl: commons("Espresso_Americano.jpeg"),
  },
  "pegasus-caramel-frappe": {
    author: "Ralff Nestor Nacor",
    ...ccBySa("4.0"),
    sourceUrl: commons("Salted_Caramel_Frappe,_Sep_2026.jpg"),
  },
  "titan-chocolate-frappe": {
    author: "Brunnaiz",
    ...ccBySa("4.0"),
    sourceUrl: commons("Frappuccino_de_xocolata_d%27Starbucks.jpg"),
  },
  "elysian-matcha-frappe": {
    author: "Andy Li",
    ...CC0,
    sourceUrl: commons(
      "Ceremonial_Grade_Matcha_Frappe_(no_coffee)_and_Pumpkin_Spice_Frappe_(blended_with_espresso)_-_Brooklands_Cafe_2026-09-23.jpg",
    ),
    changes: "Cropped to show one drink.",
  },
  "nyx-black-cold-brew": {
    author: "Roland Tanglao",
    ...CC0,
    sourceUrl: commons("Iced_cold_brew_coffee.jpg"),
  },
  "zephyr-foam-cold-brew": {
    author: "Ems1960",
    ...ccBySa("4.0"),
    sourceUrl: commons("Nitro_Cold_Brew.jpg"),
  },
  "hestia-hearth-brew": {
    author: "책읽는달팽",
    ...ccBySa("4.0"),
    sourceUrl: commons("Nel_Drip_Coffee.jpg"),
  },
  "apollo-morning-brew": {
    author: "Tim Boyd",
    ...ccBy("2.0"),
    sourceUrl: commons("Caf%C3%A9_au_lait.jpg"),
  },
  "butter-croissant": {
    author: "SKopp",
    ...ccBySa("3.0"),
    sourceUrl: commons("Croissant,_whole.jpg"),
  },
  "pain-au-chocolat": {
    author: "Luc Viatour",
    ...ccBySa("3.0"),
    sourceUrl: commons("Pain_au_chocolat_Luc_Viatour.jpg"),
  },
  "cinnamon-roll": {
    author: "NefariousOpus",
    ...PUBLIC_DOMAIN,
    sourceUrl: commons("Cinnamon_Roll_003.jpg"),
  },
  "banana-bread": {
    author: "Shisma",
    ...ccBy("4.0"),
    sourceUrl: commons("Banana_bread_slices.jpg"),
  },
  ensaymada: {
    author: "Iamraincrystal",
    ...ccBySa("3.0"),
    sourceUrl: commons("Ensaymada.JPG"),
  },
  "ube-cheese-pandesal": {
    author: "Ptrcparian",
    ...ccBySa("4.0"),
    sourceUrl: commons("Ube_Pandesal_(Filipino_purple_yam_Bread_roll).jpg"),
  },
  "blueberry-muffin": {
    author: "Renee Comet, National Cancer Institute",
    ...PUBLIC_DOMAIN,
    sourceUrl: commons("Muffin_NIH.jpg"),
  },
  "chocolate-chip-cookie": {
    author: "Evan-Amos",
    ...PUBLIC_DOMAIN,
    sourceUrl: commons("Choc-Chip-Cookie.jpg"),
  },
  "ham-cheese-croissant": {
    author: "Andy Li",
    ...CC0,
    sourceUrl: commons(
      "Ham_%26_cheese_croissant_-_Bread_%26_Milk_2024-05-22.jpg",
    ),
  },
  "chicken-pesto-panini": {
    author: "Andy Li",
    ...CC0,
    sourceUrl: commons(
      "Panini_(Mozzarella,_Pesto_%26_Tomato)_-_Dyke_Road_Park_Cafe.jpg",
    ),
  },
};
