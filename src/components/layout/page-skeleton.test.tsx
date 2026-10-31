import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PageSkeleton } from "./page-skeleton";

describe("PageSkeleton", () => {
  it("announces loading and draws the cards asked for", () => {
    render(<PageSkeleton cards={2} layout="list" />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading");
    // Two text lines plus the cards.
    expect(screen.getAllByTestId("skeleton")).toHaveLength(4);
  });
});
