/**
 * Display formatting. Money is stored as integer centavos everywhere and only
 * turned into text here, in the UI layer.
 */

const pesoWhole = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const pesoCents = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 15000 -> "₱150", 15050 -> "₱150.50". */
export function formatPeso(centavos: number): string {
  if (!Number.isSafeInteger(centavos)) {
    throw new TypeError(`Money must be integer centavos, got ${centavos}`);
  }
  const formatter = centavos % 100 === 0 ? pesoWhole : pesoCents;
  return formatter.format(centavos / 100);
}

/** 24-hour "HH:MM" -> "7:00 AM" / "10:00 PM". */
export function formatTime(time: string): string {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!match) {
    throw new RangeError(`Expected 24-hour "HH:MM", got "${time}"`);
  }
  const hours = Number(match[1]);
  const period = hours < 12 ? "AM" : "PM";
  const hours12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hours12}:${match[2]} ${period}`;
}
