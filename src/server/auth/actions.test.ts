import { APIError } from "better-auth/api";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signUpEmail: vi.fn(),
  signInEmail: vi.fn(),
  signOut: vi.fn(),
  consume: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "203.0.113.5" }),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));
vi.mock("@/lib/auth", () => ({
  getAuth: () => ({
    api: {
      signUpEmail: mocks.signUpEmail,
      signInEmail: mocks.signInEmail,
      signOut: mocks.signOut,
    },
  }),
}));
vi.mock("@/server/rate-limit", () => ({
  AUTH_RATE_LIMIT: { window: 60, max: 5 },
  consume: mocks.consume,
}));

const { logIn, logOut, signUp } = await import("./actions");

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const signUpFields = {
  name: "Maria Santos",
  email: "Maria@Example.com",
  phone: "0917 123 4567",
  password: "brewed-by-you",
  confirmPassword: "brewed-by-you",
  next: "/orders",
};

function apiError(code: string) {
  return new APIError("BAD_REQUEST", { code, message: code });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.consume.mockResolvedValue({ allowed: true, retryAfter: null });
});

describe("signUp", () => {
  it("returns field errors and keeps safe values, without calling Better Auth", async () => {
    const state = await signUp({}, form({ ...signUpFields, phone: "123" }));
    expect(state.errors?.phone).toMatch(/Philippine mobile number/);
    expect(state.values).toEqual({
      name: "Maria Santos",
      email: "Maria@Example.com",
      phone: "123",
    });
    expect(state.values).not.toHaveProperty("password");
    expect(mocks.signUpEmail).not.toHaveBeenCalled();
    expect(mocks.consume).not.toHaveBeenCalled();
  });

  it("creates the account with normalized data, then redirects to ?next", async () => {
    await expect(signUp({}, form(signUpFields))).rejects.toThrow(
      "REDIRECT:/orders",
    );
    expect(mocks.consume).toHaveBeenCalledWith("signup:ip:203.0.113.5", {
      window: 60,
      max: 5,
    });
    expect(mocks.signUpEmail).toHaveBeenCalledWith({
      body: {
        name: "Maria Santos",
        email: "maria@example.com",
        phone: "+639171234567",
        password: "brewed-by-you",
      },
      headers: expect.any(Headers),
    });
  });

  it("ignores an off-site ?next", async () => {
    await expect(
      signUp({}, form({ ...signUpFields, next: "https://evil.example" })),
    ).rejects.toThrow("REDIRECT:/");
  });

  it("stops when rate limited", async () => {
    mocks.consume.mockResolvedValueOnce({ allowed: false, retryAfter: 30 });
    const state = await signUp({}, form(signUpFields));
    expect(state.message).toMatch(/Too many attempts/);
    expect(mocks.signUpEmail).not.toHaveBeenCalled();
  });

  it("explains when the email is already registered", async () => {
    mocks.signUpEmail.mockRejectedValueOnce(
      apiError("USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL"),
    );
    const state = await signUp({}, form(signUpFields));
    expect(state.errors?.email).toMatch(/already exists/);
  });

  it("shows a general message for other auth errors", async () => {
    mocks.signUpEmail.mockRejectedValueOnce(apiError("FAILED_TO_CREATE_USER"));
    const state = await signUp({}, form(signUpFields));
    expect(state.message).toMatch(/could not complete/);
  });

  it("lets unexpected errors bubble up", async () => {
    mocks.signUpEmail.mockRejectedValueOnce(new Error("db down"));
    await expect(signUp({}, form(signUpFields))).rejects.toThrow("db down");
  });
});

describe("logIn", () => {
  const fields = {
    email: "maria@example.com",
    password: "brewed-by-you",
    next: "/profile",
  };

  it("validates first", async () => {
    const state = await logIn({}, form({ email: "", password: "" }));
    expect(state.errors?.password).toBe("Please enter your password.");
    expect(mocks.signInEmail).not.toHaveBeenCalled();
  });

  it("rate limits by IP and by email", async () => {
    mocks.consume
      .mockResolvedValueOnce({ allowed: true, retryAfter: null })
      .mockResolvedValueOnce({ allowed: false, retryAfter: 40 });
    const state = await logIn({}, form(fields));
    expect(state.message).toMatch(/Too many attempts/);
    expect(mocks.consume).toHaveBeenCalledWith(
      "login:ip:203.0.113.5",
      expect.anything(),
    );
    expect(mocks.consume).toHaveBeenCalledWith(
      "login:email:maria@example.com",
      expect.anything(),
    );
    expect(mocks.signInEmail).not.toHaveBeenCalled();
  });

  it("logs in and redirects", async () => {
    await expect(logIn({}, form(fields))).rejects.toThrow("REDIRECT:/profile");
    expect(mocks.signInEmail).toHaveBeenCalledWith({
      body: { email: "maria@example.com", password: "brewed-by-you" },
      headers: expect.any(Headers),
    });
  });

  it("gives one message for a wrong email or password", async () => {
    mocks.signInEmail.mockRejectedValueOnce(
      apiError("INVALID_EMAIL_OR_PASSWORD"),
    );
    const state = await logIn({}, form(fields));
    expect(state.message).toBe(
      "The email or password you entered is incorrect.",
    );
    expect(state.values).toEqual({ email: "maria@example.com" });
  });

  it("shows a general message for other auth errors", async () => {
    mocks.signInEmail.mockRejectedValueOnce(new APIError("FORBIDDEN"));
    const state = await logIn({}, form(fields));
    expect(state.message).toMatch(/could not complete/);
  });

  it("lets unexpected errors bubble up", async () => {
    mocks.signInEmail.mockRejectedValueOnce(new Error("db down"));
    await expect(logIn({}, form(fields))).rejects.toThrow("db down");
  });
});

describe("logOut", () => {
  it("ends the session and goes home", async () => {
    await expect(logOut()).rejects.toThrow("REDIRECT:/");
    expect(mocks.signOut).toHaveBeenCalledWith({
      headers: expect.any(Headers),
    });
  });
});
