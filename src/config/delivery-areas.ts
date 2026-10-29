/**
 * Where Hermes Express delivers (docs/PLAN.md §7): Taguig City, including
 * Bonifacio Global City. Checked with a barangay list instead of a maps API.
 * The last ten are the "EMBO" barangays that joined Taguig in 2023.
 */
export const DELIVERY_CITY = "Taguig City";

export const DELIVERY_BARANGAYS = [
  "Bagumbayan",
  "Bambang",
  "Calzada",
  "Central Bicutan",
  "Central Signal Village",
  "Fort Bonifacio (BGC)",
  "Hagonoy",
  "Ibayo-Tipas",
  "Katuparan",
  "Ligid-Tipas",
  "Lower Bicutan",
  "Maharlika Village",
  "Napindan",
  "New Lower Bicutan",
  "North Daang Hari",
  "North Signal Village",
  "Palingon",
  "Pinagsama",
  "San Miguel",
  "Santa Ana",
  "South Daang Hari",
  "South Signal Village",
  "Tanyag",
  "Tuktukan",
  "Upper Bicutan",
  "Ususan",
  "Wawa",
  "Western Bicutan",
  "Cembo",
  "Comembo",
  "East Rembo",
  "Pembo",
  "Pitogo",
  "Post Proper Northside",
  "Post Proper Southside",
  "Rizal",
  "South Cembo",
  "West Rembo",
] as const;

export type DeliveryBarangay = (typeof DELIVERY_BARANGAYS)[number];

export function isDeliveryBarangay(value: string): value is DeliveryBarangay {
  return (DELIVERY_BARANGAYS as readonly string[]).includes(value);
}
