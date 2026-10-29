import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MotionConfig } from "motion/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toBuilderCatalog } from "@/lib/builder/catalog";
import {
  draftFromRecipe,
  EMPTY_DRAFT,
  type BuilderDraft,
} from "@/lib/builder/state";
import { FIXTURE_NOW, seedSnapshot } from "@/test/catalog-fixture";

vi.mock("@/server/catalog/actions", () => ({ selectBranch: vi.fn() }));

const { CoffeeBuilder } = await import("./coffee-builder");

const catalog = toBuilderCatalog(seedSnapshot(), FIXTURE_NOW);
const olympus = catalog.signatures.find((s) => s.slug === "olympus-latte")!;

function renderBuilder({
  start = EMPTY_DRAFT,
  signatureName = null,
  notice = null,
  soldOutByBranch = {},
  reducedMotion = "always",
}: {
  start?: BuilderDraft;
  signatureName?: string | null;
  notice?: string | null;
  soldOutByBranch?: Record<string, string[]>;
  reducedMotion?: "always" | "never";
} = {}) {
  return render(
    <MotionConfig reducedMotion={reducedMotion}>
      <CoffeeBuilder
        catalog={catalog}
        start={start}
        signatureName={signatureName}
        notice={notice}
        initialBranch="tipas"
        soldOutByBranch={soldOutByBranch}
      />
    </MotionConfig>,
  );
}

const option = (name: string | RegExp) =>
  screen.getByRole("radio", { name }) as HTMLInputElement;
const chip = (name: string | RegExp) =>
  screen.getByRole("checkbox", { name }) as HTMLInputElement;
const next = () => screen.getByRole("button", { name: /^Next/ });
const livePrice = () => screen.getByTestId("live-price").textContent;
const stepHeading = () => screen.getByRole("heading", { level: 2 }).textContent;

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("CoffeeBuilder", () => {
  it("builds a drink step by step with a live price", () => {
    renderBuilder();
    expect(stepHeading()).toBe("Cup");
    expect(screen.getByText("Choose a base to see the price.")).toBeVisible();

    fireEvent.click(option(/16oz/));
    fireEvent.click(option(/Iced/));
    expect(screen.getByRole("slider", { name: "Ice" })).toHaveAttribute(
      "aria-valuetext",
      "Regular",
    );
    fireEvent.change(screen.getByRole("slider", { name: "Ice" }), {
      target: { value: "2" },
    });
    expect(screen.getByRole("slider", { name: "Ice" })).toHaveAttribute(
      "aria-valuetext",
      "Extra",
    );

    fireEvent.click(next());
    expect(stepHeading()).toBe("Base");
    expect(document.activeElement).toBe(
      screen.getByRole("heading", { level: 2 }),
    );
    expect(next()).toBeDisabled();
    expect(screen.getByText("Choose a base to continue.")).toBeVisible();

    fireEvent.click(option(/^Latte/));
    expect(livePrice()).toBe("₱150");
    fireEvent.click(screen.getByRole("button", { name: "Add a shot" }));
    expect(livePrice()).toBe("₱190");

    fireEvent.click(next());
    expect(next()).toBeDisabled();
    fireEvent.click(option(/Oat milk/));
    expect(livePrice()).toBe("₱220");
    fireEvent.change(screen.getByRole("slider", { name: "Milk amount" }), {
      target: { value: "0" },
    });

    fireEvent.click(next());
    expect(stepHeading()).toBe("Sweetener");
    fireEvent.change(screen.getByRole("slider", { name: "Sweetness" }), {
      target: { value: "4" },
    });
    expect(screen.getByRole("slider", { name: "Sweetness" })).toHaveAttribute(
      "aria-valuetext",
      "100%",
    );
    fireEvent.click(chip(/Vanilla/));

    fireEvent.click(next());
    fireEvent.click(chip(/Cold Foam/));
    expect(livePrice()).toBe("₱270");

    fireEvent.click(next());
    expect(stepHeading()).toBe("Review");
    expect(screen.queryByRole("button", { name: /^Next/ })).toBeNull();
    fireEvent.change(screen.getByLabelText("Name your drink (optional)"), {
      target: { value: "Monday Fuel" },
    });
    for (const detail of [
      "16oz · Iced · Extra ice",
      "Latte · 2 shots",
      "Oat milk · Light",
      "100%",
      "Vanilla",
      "Cold Foam",
    ]) {
      expect(screen.getByText(detail, { selector: "dd" })).toBeVisible();
    }

    fireEvent.click(screen.getByRole("button", { name: "Add a cup" }));
    expect(livePrice()).toBe("₱540");
    expect(screen.getByRole("button", { name: "Add to cart" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Save to favorites" }),
    ).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(stepHeading()).toBe("Toppings");
  });

  it("opens the price breakdown on tap", () => {
    renderBuilder({ start: { ...EMPTY_DRAFT, base: "latte", shots: 1 } });
    const toggle = screen.getByRole("button", { name: /Show price details/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    const breakdown = screen.getByRole("list", { name: "Price breakdown" });
    expect(within(breakdown).getByText("Latte")).toBeVisible();
    expect(within(breakdown).getByText("₱130")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /Hide price details/ }));
    expect(screen.queryByRole("list", { name: "Price breakdown" })).toBeNull();
  });

  it("shows the quantity in the breakdown", () => {
    renderBuilder({ start: draftFromRecipe(olympus.recipe, olympus.slug) });
    fireEvent.click(screen.getByRole("button", { name: /Review/ }));
    fireEvent.click(screen.getByRole("button", { name: "Add a cup" }));
    fireEvent.click(screen.getByRole("button", { name: /Show price details/ }));
    expect(screen.getByText("₱175 × 2 cups")).toBeVisible();
    expect(livePrice()).toBe("₱350");
  });

  it("limits syrups to three", () => {
    renderBuilder({
      start: { ...EMPTY_DRAFT, base: "matcha", milk: "oat" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Sweetener/ }));
    for (const name of [/Vanilla/, /^Caramel/, /Honey/]) {
      fireEvent.click(chip(name));
    }
    expect(screen.getByText("3 of 3 syrups")).toBeVisible();
    expect(chip(/Toffee/)).toBeDisabled();
    expect(chip(/Honey/)).toBeEnabled();
    fireEvent.click(chip(/Honey/));
    expect(chip(/Toffee/)).toBeEnabled();
  });

  it("disables and labels options sold out at the selected branch", () => {
    renderBuilder({
      start: { ...EMPTY_DRAFT, base: "latte", shots: 1, milk: "oat" },
      soldOutByBranch: { bgc: ["oat", "vanilla"] },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Milk/ }));
    expect(option(/Oat milk/)).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "BGC" }));
    expect(document.cookie).toContain("hx_menu_branch=bgc");
    expect(option(/Oat milk/)).toBeDisabled();
    expect(option(/Oat milk/).closest("label")).toHaveTextContent(
      "Sold out at this branch",
    );

    fireEvent.click(screen.getByRole("button", { name: /Review/ }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Oat milk is sold out at BGC.",
    );
  });

  it("never serves Cold Brew hot", () => {
    renderBuilder();
    fireEvent.click(next());
    expect(option(/Cold Brew/)).toBeDisabled();
    expect(option(/Cold Brew/).closest("label")).toHaveTextContent(
      "Served iced or blended only",
    );

    fireEvent.click(screen.getByRole("button", { name: /^Cup/ }));
    fireEvent.click(option(/Iced/));
    fireEvent.click(next());
    fireEvent.click(option(/Cold Brew/));
    expect(screen.queryByRole("button", { name: "Add a shot" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /^Cup/ }));
    expect(option(/Hot/)).toBeDisabled();
  });

  it("undoes and resets", () => {
    renderBuilder();
    const undo = screen.getByRole("button", { name: "Undo" });
    const reset = screen.getByRole("button", { name: "Reset" });
    expect(undo).toBeDisabled();
    expect(reset).toBeDisabled();

    fireEvent.click(option(/22oz/));
    fireEvent.click(option(/Blended/));
    expect(option(/Blended/)).toBeChecked();
    fireEvent.click(undo);
    expect(option(/Hot/)).toBeChecked();
    expect(screen.getByText(/^Undone\./)).toBeInTheDocument();

    fireEvent.click(reset);
    expect(option(/12oz/)).toBeChecked();
    expect(screen.getByText(/^Reset\./)).toBeInTheDocument();
    fireEvent.click(undo);
    expect(option(/22oz/)).toBeChecked();
  });

  it("starts from a signature drink at its menu price", () => {
    renderBuilder({
      start: draftFromRecipe(olympus.recipe, olympus.slug),
      signatureName: "Olympus Latte",
    });
    expect(screen.getByText("Olympus Latte")).toBeVisible();
    expect(livePrice()).toBe("₱175");
    expect(screen.getByTestId("builder-cup")).toHaveAccessibleName(
      "12oz hot Latte with Oat milk topped with Cinnamon Dust",
    );
  });

  it("shows a notice from the page", () => {
    renderBuilder({ notice: "We could not find that drink." });
    expect(screen.getByRole("status")).toHaveTextContent(
      "We could not find that drink.",
    );
  });

  it("makes a surprise drink and opens the review", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    renderBuilder();
    fireEvent.click(screen.getByRole("button", { name: "Surprise me" }));
    expect(stepHeading()).toBe("Review");
    // The first option of every choice: 12oz hot Espresso, whole milk.
    expect(livePrice()).toBe("₱90");
  });

  it("explains when no surprise is possible at the branch", () => {
    renderBuilder({
      soldOutByBranch: { tipas: catalog.milks.map((m) => m.slug) },
    });
    fireEvent.click(screen.getByRole("button", { name: "Surprise me" }));
    expect(
      screen.getByText("We cannot make a surprise drink at Tipas right now."),
    ).toBeInTheDocument();
    expect(stepHeading()).toBe("Cup");
  });

  it("jumps between reachable steps from the progress bar", () => {
    renderBuilder();
    expect(screen.getByRole("button", { name: /Milk/ })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /^Base/ }));
    expect(stepHeading()).toBe("Base");
    expect(screen.getByRole("button", { name: /^Base/ })).toHaveAttribute(
      "aria-current",
      "step",
    );
  });
});

describe("BuilderCup animation", () => {
  it("pours, stacks, mixes and can mix again", () => {
    vi.useFakeTimers();
    renderBuilder({
      start: { ...EMPTY_DRAFT, base: "latte", shots: 1 },
      reducedMotion: "never",
    });
    const cup = screen.getByTestId("builder-cup");
    expect(cup).toHaveAttribute("data-phase", "mixed");
    expect(screen.getByTestId("steam")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^Milk/ }));
    fireEvent.click(option(/Whole milk/));
    expect(cup).toHaveAttribute("data-phase", "pouring");
    expect(screen.getByTestId("pour-stream")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(700));
    expect(cup).toHaveAttribute("data-phase", "stacked");
    act(() => vi.advanceTimersByTime(400));
    expect(cup).toHaveAttribute("data-phase", "mixing");
    expect(screen.getByTestId("mix-swirl")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(900));
    expect(cup).toHaveAttribute("data-phase", "mixed");

    fireEvent.click(screen.getByRole("button", { name: "Mix again" }));
    expect(cup).toHaveAttribute("data-phase", "stacked");
    act(() => vi.advanceTimersByTime(400));
    expect(cup).toHaveAttribute("data-phase", "mixing");
  });

  it("settles a single liquid without mixing", () => {
    vi.useFakeTimers();
    renderBuilder({ reducedMotion: "never" });
    fireEvent.click(next());
    fireEvent.click(option(/^Matcha/));
    const cup = screen.getByTestId("builder-cup");
    expect(cup).toHaveAttribute("data-phase", "pouring");
    act(() => vi.advanceTimersByTime(700));
    act(() => vi.advanceTimersByTime(400));
    expect(cup).toHaveAttribute("data-phase", "mixed");
    expect(screen.queryByRole("button", { name: "Mix again" })).toBeNull();
  });

  it("shows the finished drink at once with reduced motion", () => {
    renderBuilder({
      start: { ...EMPTY_DRAFT, base: "latte", shots: 1 },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Milk/ }));
    fireEvent.click(option(/Whole milk/));
    expect(screen.getByTestId("builder-cup")).toHaveAttribute(
      "data-phase",
      "mixed",
    );
    expect(screen.queryByTestId("pour-stream")).toBeNull();
    expect(screen.queryByRole("button", { name: "Mix again" })).toBeNull();
  });

  it("draws ice, a blended texture and every kind of topping", async () => {
    renderBuilder({
      start: {
        ...EMPTY_DRAFT,
        temperature: "iced",
        iceLevel: "extra",
        base: "matcha",
        milk: "oat",
        toppings: [
          "whipped-cream",
          "caramel-drizzle",
          "cocoa-powder",
          "tapioca-pearls",
          "coffee-jelly",
        ],
      },
    });
    expect(screen.getAllByTestId("ice-cube")).toHaveLength(5);
    for (const slug of [
      "whipped-cream",
      "caramel-drizzle",
      "cocoa-powder",
      "tapioca-pearls",
      "coffee-jelly",
    ]) {
      expect(screen.getByTestId(`topping-${slug}`)).toBeInTheDocument();
    }
    fireEvent.click(option(/Blended/));
    await waitFor(() =>
      expect(screen.queryAllByTestId("ice-cube")).toHaveLength(0),
    );
    expect(screen.queryByTestId("steam")).toBeNull();
  });
});
