import { describe, expect, it } from "vitest";
import {
  formatPesoPlain,
  assertCentavos,
  formatPeso,
  multiplyCentavos,
  percentOfCentavos,
  pesosToCentavos,
  sumCentavos,
} from "./money";

describe("formatPeso", () => {
  it("shows whole pesos without decimals", () => {
    expect(formatPeso(15000)).toBe("₱150");
    expect(formatPeso(0)).toBe("₱0");
  });

  it("adds thousands separators", () => {
    expect(formatPeso(125000)).toBe("₱1,250");
  });

  it("shows centavos when there are any", () => {
    expect(formatPeso(15050)).toBe("₱150.50");
    expect(formatPeso(5)).toBe("₱0.05");
  });

  it("shows negative amounts (for example a discount)", () => {
    expect(formatPeso(-5000)).toBe("-₱50");
  });

  it("rejects values that are not integer centavos", () => {
    expect(() => formatPeso(150.5)).toThrow(TypeError);
    expect(() => formatPeso(Number.NaN)).toThrow(TypeError);
  });
});

describe("assertCentavos", () => {
  it("returns whole numbers unchanged", () => {
    expect(assertCentavos(0)).toBe(0);
    expect(assertCentavos(4900)).toBe(4900);
    expect(assertCentavos(-100)).toBe(-100);
  });

  it.each([0.5, Number.NaN, Number.POSITIVE_INFINITY, 2 ** 53])(
    "rejects %s",
    (value) => {
      expect(() => assertCentavos(value)).toThrow(TypeError);
    },
  );
});

describe("pesosToCentavos", () => {
  it.each([
    [150, 15000],
    [0, 0],
    [49.5, 4950],
    [0.1 + 0.2, 30],
    [19.999, 2000],
  ])("turns ₱%s into %s centavos", (pesos, centavos) => {
    expect(pesosToCentavos(pesos)).toBe(centavos);
  });

  it("rejects values that are not numbers", () => {
    expect(() => pesosToCentavos(Number.NaN)).toThrow(TypeError);
    expect(() => pesosToCentavos(Number.POSITIVE_INFINITY)).toThrow(TypeError);
  });
});

describe("multiplyCentavos", () => {
  it("multiplies a unit price by a quantity", () => {
    expect(multiplyCentavos(17500, 3)).toBe(52500);
    expect(multiplyCentavos(17500, 0)).toBe(0);
  });

  it("rejects fractional prices and quantities", () => {
    expect(() => multiplyCentavos(175.5, 2)).toThrow(TypeError);
    expect(() => multiplyCentavos(17500, 1.5)).toThrow(TypeError);
  });
});

describe("percentOfCentavos", () => {
  it("rounds to the nearest centavo", () => {
    expect(percentOfCentavos(15050, 10)).toBe(1505);
    expect(percentOfCentavos(999, 10)).toBe(100);
    expect(percentOfCentavos(50000, 20)).toBe(10000);
  });

  it("handles 0% and 100%", () => {
    expect(percentOfCentavos(12345, 0)).toBe(0);
    expect(percentOfCentavos(12345, 100)).toBe(12345);
  });

  it("rejects percentages outside 0–100", () => {
    expect(() => percentOfCentavos(100, -1)).toThrow(RangeError);
    expect(() => percentOfCentavos(100, 101)).toThrow(RangeError);
    expect(() => percentOfCentavos(100, Number.NaN)).toThrow(RangeError);
  });

  it("rejects amounts that are not centavos", () => {
    expect(() => percentOfCentavos(1.5, 10)).toThrow(TypeError);
  });
});

describe("sumCentavos", () => {
  it("adds amounts", () => {
    expect(sumCentavos([17500, 9500, 4900])).toBe(31900);
  });

  it("returns 0 for an empty list", () => {
    expect(sumCentavos([])).toBe(0);
  });

  it("rejects any amount that is not centavos", () => {
    expect(() => sumCentavos([100, 0.5])).toThrow(TypeError);
  });
});

describe("formatPesoPlain", () => {
  it("writes PHP with two decimals and thousands separators", () => {
    expect(formatPesoPlain(49500)).toBe("PHP 495.00");
    expect(formatPesoPlain(5)).toBe("PHP 0.05");
    expect(formatPesoPlain(123456789)).toBe("PHP 1,234,567.89");
    expect(formatPesoPlain(-5000)).toBe("-PHP 50.00");
  });

  it("refuses amounts that are not whole centavos", () => {
    expect(() => formatPesoPlain(1.5)).toThrow(TypeError);
  });
});
