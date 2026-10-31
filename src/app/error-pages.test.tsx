import { fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ErrorPage from "./error";
import GlobalError from "./global-error";
import NotFound from "./not-found";

vi.mock("./globals.css", () => ({}));

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => vi.restoreAllMocks());

describe("NotFound", () => {
  it("offers the way home", () => {
    render(<NotFound />);
    expect(
      screen.getByRole("heading", { name: "We could not find that page" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Return home" })).toHaveAttribute(
      "href",
      "/",
    );
  });
});

describe("ErrorPage", () => {
  it("offers a retry and keeps the error text private", () => {
    const reset = vi.fn();
    render(<ErrorPage error={new Error("db password")} reset={reset} />);
    expect(screen.getByRole("alert")).not.toHaveTextContent("db password");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(reset).toHaveBeenCalledOnce();
  });
});

describe("GlobalError", () => {
  it("renders its own document without the error text", () => {
    const html = renderToStaticMarkup(
      <GlobalError error={new Error("db password")} reset={() => undefined} />,
    );
    expect(html).toContain("Something went wrong");
    expect(html).toContain('lang="en"');
    expect(html).not.toContain("db password");
  });
});
