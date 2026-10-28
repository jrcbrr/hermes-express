import { describe, expect, it } from "vitest";
import { clientIp, formString } from "./request";

describe("clientIp", () => {
  it("uses the first x-forwarded-for entry", () => {
    expect(
      clientIp(new Headers({ "x-forwarded-for": "203.0.113.5, 10.0.0.1" })),
    ).toBe("203.0.113.5");
  });

  it("falls back to x-real-ip, then 'unknown'", () => {
    expect(clientIp(new Headers({ "x-real-ip": "203.0.113.9" }))).toBe(
      "203.0.113.9",
    );
    expect(clientIp(new Headers())).toBe("unknown");
  });
});

describe("formString", () => {
  it("reads strings and treats missing or file values as empty", () => {
    const form = new FormData();
    form.set("name", "Maria");
    form.set("file", new Blob(["x"]));
    expect(formString(form, "name")).toBe("Maria");
    expect(formString(form, "file")).toBe("");
    expect(formString(form, "missing")).toBe("");
  });
});
