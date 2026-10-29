/**
 * Money helpers. Every amount is an integer number of centavos (₱1 = 100
 * centavos), so sums never pick up floating-point errors. Amounts only become
 * text in the UI, through formatPeso().
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

/** Throws unless `value` is a whole number of centavos. Returns it unchanged. */
export function assertCentavos(value: number): number {
  if (!Number.isSafeInteger(value)) {
    throw new TypeError(`Money must be integer centavos, got ${value}`);
  }
  return value;
}

/** 15000 -> "₱150", 15050 -> "₱150.50". */
export function formatPeso(centavos: number): string {
  assertCentavos(centavos);
  const formatter = centavos % 100 === 0 ? pesoWhole : pesoCents;
  return formatter.format(centavos / 100);
}

const plainAmount = new Intl.NumberFormat("en-PH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * 49500 -> "PHP 495.00", -5000 -> "-PHP 50.00". For the receipt PDF, whose
 * built-in font has no "₱" sign.
 */
export function formatPesoPlain(centavos: number): string {
  assertCentavos(centavos);
  const sign = centavos < 0 ? "-" : "";
  return `${sign}PHP ${plainAmount.format(Math.abs(centavos) / 100)}`;
}

/** 150 -> 15000, 49.5 -> 4950. Rounds to the nearest centavo. */
export function pesosToCentavos(pesos: number): number {
  if (!Number.isFinite(pesos)) {
    throw new TypeError(`Expected a peso amount, got ${pesos}`);
  }
  return assertCentavos(Math.round(pesos * 100));
}

/** Unit price × quantity. The quantity must be a whole number. */
export function multiplyCentavos(centavos: number, quantity: number): number {
  assertCentavos(centavos);
  if (!Number.isSafeInteger(quantity)) {
    throw new TypeError(`Quantity must be a whole number, got ${quantity}`);
  }
  return assertCentavos(centavos * quantity);
}

/** `percent`% of an amount, rounded to the nearest centavo (10% of 15050 -> 1505). */
export function percentOfCentavos(centavos: number, percent: number): number {
  assertCentavos(centavos);
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
    throw new RangeError(`Percent must be between 0 and 100, got ${percent}`);
  }
  return Math.round((centavos * percent) / 100);
}

/** Adds amounts of centavos. An empty list adds up to 0. */
export function sumCentavos(values: readonly number[]): number {
  return assertCentavos(
    values.reduce((total, value) => total + assertCentavos(value), 0),
  );
}
