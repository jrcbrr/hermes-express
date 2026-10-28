import { CupSoda, Receipt, Truck } from "lucide-react";
import { Section } from "./section";

const steps = [
  {
    icon: CupSoda,
    title: "Build",
    text: "Choose your cup, base, milk, sweetness and toppings, and watch your drink take shape.",
  },
  {
    icon: Receipt,
    title: "Order",
    text: "Select a branch, pay in a few taps, or schedule your drink for later.",
  },
  {
    icon: Truck,
    title: "Delivered or picked up",
    text: "Hermes brings it to your door, or it waits for you at the counter.",
  },
] as const;

export function HowItWorks() {
  return (
    <Section
      id="how-it-works"
      title="How it works"
      intro="Three simple steps from idea to first sip."
    >
      <ol className="grid gap-6 md:grid-cols-3">
        {steps.map(({ icon: Icon, title, text }, index) => (
          <li
            key={title}
            className="rounded-2xl border bg-surface p-6 text-center shadow-sm"
          >
            <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-surface-muted text-accent">
              <Icon className="size-7" aria-hidden="true" />
            </span>
            <h3 className="mt-4 text-xl font-bold">
              <span className="text-muted-foreground">{index + 1}. </span>
              {title}
            </h3>
            <p className="mt-2 text-muted-foreground">{text}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
