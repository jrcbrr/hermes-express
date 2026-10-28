import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HermesMascot } from "./hermes-mascot";
import { LogoMark } from "./logo-mark";

describe.each([
  ["LogoMark", LogoMark],
  ["HermesMascot", HermesMascot],
])("%s", (_name, Art) => {
  it("is hidden from screen readers when decorative", () => {
    const { container } = render(<Art />);
    expect(container.querySelector("svg")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("becomes a named image when given a title", () => {
    render(<Art title="Hermes Express" />);
    expect(
      screen.getByRole("img", { name: "Hermes Express" }),
    ).toBeInTheDocument();
  });

  it("draws in currentColor so CSS can colour it", () => {
    const { container } = render(<Art />);
    expect(container.querySelector("svg")).toHaveAttribute(
      "stroke",
      "currentColor",
    );
  });
});
