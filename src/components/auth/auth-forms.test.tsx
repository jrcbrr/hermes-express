import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LogInForm } from "./login-form";
import { SignUpForm } from "./signup-form";

const search = vi.hoisted(() => ({ current: new URLSearchParams() }));
vi.mock("next/navigation", () => ({ useSearchParams: () => search.current }));

const state = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return { ...actual, useActionState: () => [state.current, vi.fn(), false] };
});
vi.mock("@/server/auth/actions", () => ({ logIn: vi.fn(), signUp: vi.fn() }));

beforeEach(() => {
  search.current = new URLSearchParams();
  state.current = {};
});

describe("LogInForm", () => {
  it("has labelled fields and passes ?next through", () => {
    search.current = new URLSearchParams("next=/orders");
    const { container } = render(<LogInForm />);
    expect(screen.getByLabelText("Email")).toHaveAttribute(
      "autocomplete",
      "email",
    );
    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "type",
      "password",
    );
    expect(container.querySelector('input[name="next"]')).toHaveValue(
      "/orders",
    );
    expect(
      screen.getByRole("link", { name: "Create an account" }),
    ).toHaveAttribute("href", "/signup?next=%2Forders");
  });

  it("shows the form message as an alert and keeps the email", () => {
    state.current = {
      message: "The email or password you entered is incorrect.",
      values: { email: "maria@example.com" },
    };
    render(<LogInForm />);
    expect(screen.getByRole("alert")).toHaveTextContent("incorrect");
    expect(screen.getByLabelText("Email")).toHaveValue("maria@example.com");
  });
});

describe("SignUpForm", () => {
  it("has every field, labelled", () => {
    render(<SignUpForm />);
    for (const label of [
      "Full name",
      "Email",
      "Mobile number",
      "Password",
      "Confirm password",
    ]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  it("links field errors to their inputs for screen readers", () => {
    state.current = {
      errors: { phone: "Please enter a valid Philippine mobile number." },
    };
    render(<SignUpForm />);
    const phone = screen.getByLabelText("Mobile number");
    expect(phone).toHaveAttribute("aria-invalid", "true");
    expect(phone).toHaveAccessibleDescription(/valid Philippine mobile number/);
  });
});
