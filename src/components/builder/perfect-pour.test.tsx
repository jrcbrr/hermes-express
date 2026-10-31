import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  claim: vi.fn(),
  owner: "u1" as string | null,
  play: vi.fn(),
}));

vi.mock("@/server/rewards/actions", () => ({
  claimPerfectPour: mocks.claim,
}));
vi.mock("@/components/cart/cart-store", () => ({
  cartStore: { read: () => ({ cart: { owner: mocks.owner } }) },
}));
vi.mock("@/hooks/use-sound", () => ({
  useSound: () => ({ play: mocks.play }),
}));

const { PerfectPour } = await import("./perfect-pour");

const onClose = vi.fn();
const onBeforeLogin = vi.fn();
let clock = 0;

function setup() {
  render(<PerfectPour onClose={onClose} onBeforeLogin={onBeforeLogin} />);
  return screen.getByRole("button", { name: /hold to pour/i });
}

beforeEach(() => {
  vi.clearAllMocks();
  clock = 1000;
  mocks.owner = "u1";
  mocks.claim.mockResolvedValue({ newlyEarned: true });
  vi.spyOn(performance, "now").mockImplementation(() => clock);
});
afterEach(() => vi.restoreAllMocks());

/** 2800 ms fills the cup to the gold line. */
async function pourWithPointer(button: HTMLElement, ms: number) {
  fireEvent.pointerDown(button, { pointerId: 1 });
  clock += ms;
  await act(async () => {
    fireEvent.pointerUp(button, { pointerId: 1 });
  });
}

describe("PerfectPour", () => {
  it("starts with focus on the button, and an empty cup", () => {
    const button = setup();
    expect(button).toHaveFocus();
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "0",
    );
  });

  it("unlocks the badge when released on the line", async () => {
    await pourWithPointer(setup(), 2800);
    expect(mocks.claim).toHaveBeenCalledOnce();
    expect(screen.getByRole("status")).toHaveTextContent(
      "You have earned the Perfect Pour badge.",
    );
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "70",
    );
  });

  it("says so when the badge is already held", async () => {
    mocks.claim.mockResolvedValue({ newlyEarned: false });
    await pourWithPointer(setup(), 2800);
    expect(screen.getByRole("status")).toHaveTextContent("already hold");
  });

  it("reports a badge that could not be saved", async () => {
    mocks.claim.mockRejectedValue(new Error("offline"));
    await pourWithPointer(setup(), 2800);
    expect(screen.getByRole("status")).toHaveTextContent("could not save");
  });

  it("lets a miss try again without claiming anything", async () => {
    const button = setup();
    await pourWithPointer(button, 500);
    expect(screen.getByRole("status")).toHaveTextContent("short");
    await pourWithPointer(button, 3500);
    expect(screen.getByRole("status")).toHaveTextContent("past");
    expect(mocks.claim).not.toHaveBeenCalled();
    await pourWithPointer(button, 2800);
    expect(mocks.claim).toHaveBeenCalledOnce();
  });

  it("works with the keyboard, ignoring key repeat", async () => {
    const button = setup();
    fireEvent.keyDown(button, { key: " " });
    clock += 1000;
    fireEvent.keyDown(button, { key: " ", repeat: true });
    clock += 1800;
    await act(async () => {
      fireEvent.keyUp(button, { key: " " });
    });
    expect(mocks.claim).toHaveBeenCalledOnce();
  });

  it("ignores other keys", async () => {
    const button = setup();
    fireEvent.keyDown(button, { key: "a" });
    clock += 2800;
    await act(async () => {
      fireEvent.keyUp(button, { key: "a" });
    });
    expect(mocks.claim).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("resets without a result when a touch is interrupted", async () => {
    const button = setup();
    fireEvent.pointerDown(button, { pointerId: 1 });
    clock += 2800;
    fireEvent.pointerCancel(button, { pointerId: 1 });
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "0",
    );
    await act(async () => {
      fireEvent.pointerUp(button, { pointerId: 1 });
    });
    expect(mocks.claim).not.toHaveBeenCalled();
  });

  it("resets when the app is switched away", () => {
    const button = setup();
    fireEvent.pointerDown(button, { pointerId: 1 });
    clock += 2800;
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    hidden.mockRestore();
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "0",
    );
  });

  it("asks a guest to log in and keeps the drink when they go", async () => {
    mocks.owner = null;
    await pourWithPointer(setup(), 2800);
    expect(mocks.claim).not.toHaveBeenCalled();
    const link = screen.getByRole("link", { name: "Log in" });
    expect(link).toHaveAttribute("href", "/login?next=/build");
    fireEvent.click(link);
    expect(onBeforeLogin).toHaveBeenCalledOnce();
  });

  it("can be closed", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
