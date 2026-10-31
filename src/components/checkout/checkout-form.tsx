"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, type FormEvent } from "react";
import { FormField, FormMessage } from "@/components/auth/form-field";
import { cartStore, useCart } from "@/components/cart/cart-store";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DELIVERY_BARANGAYS, DELIVERY_CITY } from "@/config/delivery-areas";
import { siteConfig, type BranchService } from "@/config/site";
import { priceCartItems } from "@/lib/cart";
import { branchCookieString, type CatalogSnapshot } from "@/lib/catalog";
import { formatTime } from "@/lib/format";
import type { OrderProblem } from "@/lib/orders";
import {
  calculateCartTotals,
  DELIVERY_FEE_CENTAVOS,
  FREE_DELIVERY_MIN_CENTAVOS,
} from "@/lib/pricing";
import { formatPeso } from "@/lib/money";
import { formatSlotDay, formatSlotTime } from "@/lib/schedule";
import { toFieldErrors, type FieldErrors } from "@/lib/validation/auth";
import {
  checkoutSchema,
  isCashPayment,
  NOTE_MAX_LENGTH,
  PAYMENT_METHOD_LABELS,
  paymentMethodsFor,
  STREET_MAX_LENGTH,
  type CheckoutInput,
  type PaymentMethod,
} from "@/lib/validation/checkout";
import { placeOrder } from "@/server/orders/actions";
import { ChoiceGroup } from "./choice-group";
import { OrderSummary } from "./order-summary";
import { PromoField, type AppliedPromo } from "./promo-field";
import { ProcessingScreen } from "./processing-screen";

/** ASAP availability and the offered slots (ISO strings) for one branch. */
export type BranchTiming = { asap: boolean; slots: string[] };

/** How long the demo payment screen shows, so it reads as a real step. */
export const PROCESSING_MS = 1500;

const selectClass =
  "h-11 w-full rounded-lg border border-input bg-surface px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm";

/** A v4 UUID, also on plain-http pages where crypto.randomUUID is missing. */
function newRequestId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"));
  return [
    hex.slice(0, 4),
    hex.slice(4, 6),
    hex.slice(6, 8),
    hex.slice(8, 10),
    hex.slice(10),
  ]
    .map((part) => part.join(""))
    .join("-");
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Slots grouped by Manila day, for <optgroup>s. */
function groupSlots(slots: readonly string[], now: Date) {
  const groups = new Map<string, { value: string; label: string }[]>();
  for (const iso of slots) {
    const slot = new Date(iso);
    const day = formatSlotDay(slot, now);
    const list = groups.get(day) ?? [];
    list.push({ value: iso, label: formatSlotTime(slot) });
    groups.set(day, list);
  }
  return [...groups];
}

/**
 * The checkout form (docs/PLAN.md §7): pickup or delivery, branch, contact
 * details, when, and a demo payment. Totals shown here are a preview; the
 * server works them out again in placeOrder.
 */
export function CheckoutForm({
  snapshot,
  now,
  initialBranch,
  timings,
  defaults,
}: {
  snapshot: CatalogSnapshot;
  now: Date;
  initialBranch: string;
  timings: Record<string, BranchTiming>;
  defaults: { contactName: string; phone: string; receiptEmail: string };
}) {
  const router = useRouter();
  const { ready, cart } = useCart();
  const slotId = useId();
  const requestId = useRef<string | null>(null);
  const errorSummary = useRef<HTMLDivElement>(null);

  const [fulfillment, setFulfillment] = useState<BranchService>("pickup");
  const [branch, setBranch] = useState(initialBranch);
  const [contactName, setContactName] = useState(defaults.contactName);
  const [phone, setPhone] = useState(defaults.phone);
  const [receiptEmail, setReceiptEmail] = useState(defaults.receiptEmail);
  const [street, setStreet] = useState("");
  const [barangay, setBarangay] = useState("");
  const [note, setNote] = useState("");
  const [timingChoice, setTimingChoice] = useState<"asap" | "scheduled">(
    "asap",
  );
  const [scheduledFor, setScheduledFor] = useState("");
  const [paymentChoice, setPaymentChoice] =
    useState<PaymentMethod>("gcash_demo");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | undefined>();
  const [problems, setProblems] = useState<OrderProblem[]>([]);
  const [phase, setPhase] = useState<"form" | "processing" | "done">("form");
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null);

  const timing = timings[branch] ?? { asap: false, slots: [] };
  // ASAP is only offered while the branch is open.
  const when = timing.asap ? timingChoice : "scheduled";
  const slot = timing.slots.includes(scheduledFor)
    ? scheduledFor
    : (timing.slots[0] ?? "");
  const methods = paymentMethodsFor(fulfillment);
  const paymentMethod = methods.includes(paymentChoice)
    ? paymentChoice
    : methods[0]!;
  const branchInfo = siteConfig.branches.find((b) => b.slug === branch);

  if (phase !== "form") {
    return (
      <ProcessingScreen
        title={
          isCashPayment(paymentMethod)
            ? "Placing your order…"
            : `Processing your payment with ${PAYMENT_METHOD_LABELS[paymentMethod]}…`
        }
      />
    );
  }
  if (!ready) {
    return (
      <p role="status" className="mt-6 text-muted-foreground">
        Loading your cart…
      </p>
    );
  }
  if (cart.items.length === 0) {
    return (
      <div className="mt-6 rounded-2xl border bg-surface p-6">
        <p className="text-lg font-semibold">Your cart is empty.</p>
        <Link
          href="/menu"
          className={buttonVariants({
            size: "lg",
            className: "mt-4 h-11 px-5 font-semibold",
          })}
        >
          View the menu
        </Link>
      </div>
    );
  }

  const priced = priceCartItems(cart.items, snapshot, branch, now);
  const lines = priced.flatMap((p) =>
    p.unitPriceCentavos === null
      ? []
      : [
          {
            unitPriceCentavos: p.unitPriceCentavos,
            quantity: p.item.quantity,
          },
        ],
  );
  const subtotal = calculateCartTotals({ lines, fulfillment }).subtotalCentavos;
  // A discount is worked out for one subtotal: a changed cart needs a new one.
  const promo = appliedPromo?.forSubtotal === subtotal ? appliedPromo : null;
  const totals = calculateCartTotals({
    lines,
    fulfillment,
    discountCentavos: promo?.discountCentavos ?? 0,
  });
  const hasProblems = priced.some((p) => p.problem !== null);

  function chooseBranch(slug: string) {
    setBranch(slug);
    document.cookie = branchCookieString(
      slug,
      window.location.protocol === "https:",
    );
  }

  function showErrors(next: FieldErrors, text: string) {
    setErrors(next);
    setMessage(text);
    // Let the summary render, then move focus to it.
    setTimeout(() => errorSummary.current?.focus(), 0);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    requestId.current ??= newRequestId();
    const payload: CheckoutInput = {
      clientRequestId: requestId.current,
      fulfillment,
      branch,
      contactName,
      phone,
      receiptEmail,
      street,
      barangay,
      note,
      timing: when,
      scheduledFor: when === "scheduled" && slot !== "" ? slot : undefined,
      paymentMethod,
      promoCode: promo?.code,
      items: cart.items,
    };
    const check = checkoutSchema.safeParse(payload);
    if (!check.success) {
      showErrors(
        toFieldErrors(check.error),
        "Please check the highlighted details.",
      );
      return;
    }

    setPhase("processing");
    setProblems([]);
    try {
      const [result] = await Promise.all([
        placeOrder(payload),
        wait(PROCESSING_MS),
      ]);
      if (result.ok) {
        setPhase("done");
        cartStore.clear();
        router.push(`/orders/${result.orderId}`);
        return;
      }
      setPhase("form");
      if (result.errors?.promoCode) setAppliedPromo(null);
      setProblems(result.problems ?? []);
      showErrors(result.errors ?? {}, result.message);
    } catch {
      setPhase("form");
      showErrors(
        {},
        "We could not reach Hermes Express. Please check your connection and try again.",
      );
    }
  }

  const errorList = Object.values(errors).filter(Boolean);

  return (
    <form
      noValidate
      onSubmit={submit}
      className="mt-6 grid gap-8 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]"
    >
      <div className="flex min-w-0 flex-col gap-8">
        <p className="rounded-xl border border-accent/40 bg-accent/10 p-3 text-sm">
          <span className="font-semibold">Demo checkout.</span> No real payment
          is made, and no card or wallet details are asked for.
        </p>

        {message || problems.length > 0 ? (
          <div
            ref={errorSummary}
            tabIndex={-1}
            className="flex flex-col gap-2 outline-none"
          >
            <FormMessage message={message} />
            {errorList.length > 0 || problems.length > 0 ? (
              <ul className="list-disc pl-5 text-sm text-danger">
                {errorList.map((text) => (
                  <li key={text}>{text}</li>
                ))}
                {problems.map((p) => (
                  <li key={p.itemId}>
                    {p.name ? `${p.name}: ` : ""}
                    {p.problem}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        <ChoiceGroup
          name="fulfillment"
          legend="How would you like your order?"
          value={fulfillment}
          onChange={setFulfillment}
          error={errors.fulfillment}
          choices={[
            {
              value: "pickup",
              label: "Pickup",
              description: "Collect it at the counter.",
            },
            {
              value: "delivery",
              label: "Delivery",
              description: `${formatPeso(DELIVERY_FEE_CENTAVOS)}, free from ${formatPeso(FREE_DELIVERY_MIN_CENTAVOS)}. ${DELIVERY_CITY} only.`,
            },
          ]}
        />

        <ChoiceGroup
          name="branch"
          legend={fulfillment === "pickup" ? "Pick up from" : "Deliver from"}
          value={branch}
          onChange={chooseBranch}
          error={errors.branch}
          choices={siteConfig.branches.map((b) => ({
            value: b.slug,
            label: b.name,
            description: `${b.address} · ${formatTime(b.opensAt)} – ${formatTime(b.closesAt)}`,
          }))}
        />

        <fieldset className="flex flex-col gap-4">
          <legend className="mb-2 text-sm font-semibold">
            Contact details
          </legend>
          <FormField
            name="contactName"
            label="Name"
            autoComplete="name"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            error={errors.contactName}
          />
          <FormField
            name="phone"
            label="Mobile number"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="09XX XXX XXXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            error={errors.phone}
          />
          <FormField
            name="receiptEmail"
            label="Email for your receipt"
            type="email"
            autoComplete="email"
            value={receiptEmail}
            onChange={(e) => setReceiptEmail(e.target.value)}
            error={errors.receiptEmail}
          />
        </fieldset>

        {fulfillment === "delivery" ? (
          <fieldset className="flex flex-col gap-4">
            <legend className="mb-2 text-sm font-semibold">
              Delivery address ({DELIVERY_CITY})
            </legend>
            <FormField
              name="street"
              label="House or unit number, building and street"
              autoComplete="street-address"
              maxLength={STREET_MAX_LENGTH}
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              error={errors.street}
            />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="field-barangay">Barangay</Label>
              <select
                id="field-barangay"
                name="barangay"
                value={barangay}
                onChange={(e) => setBarangay(e.target.value)}
                aria-invalid={errors.barangay ? true : undefined}
                aria-describedby={
                  errors.barangay ? "field-barangay-error" : undefined
                }
                className={selectClass}
              >
                <option value="">Choose your barangay</option>
                {DELIVERY_BARANGAYS.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              {errors.barangay ? (
                <p id="field-barangay-error" className="text-sm text-danger">
                  {errors.barangay}
                </p>
              ) : null}
            </div>
          </fieldset>
        ) : null}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="field-note">Note for the barista (optional)</Label>
          <textarea
            id="field-note"
            name="note"
            rows={3}
            maxLength={NOTE_MAX_LENGTH}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="For example, please write my name on the cup."
            aria-invalid={errors.note ? true : undefined}
            className="w-full rounded-lg border border-input bg-surface px-3 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
          />
          {errors.note ? (
            <p className="text-sm text-danger">{errors.note}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-3">
          <ChoiceGroup
            name="timing"
            legend={
              fulfillment === "pickup"
                ? "When would you like to pick it up?"
                : "When would you like it delivered?"
            }
            value={when}
            onChange={setTimingChoice}
            error={errors.timing}
            choices={[
              {
                value: "asap",
                label: "As soon as possible",
                description: timing.asap
                  ? "We start on it right away."
                  : `${branchInfo?.name ?? "This branch"} is closed right now.`,
                disabled: !timing.asap,
              },
              {
                value: "scheduled",
                label: "Schedule for later",
                description: "Choose a time, up to 2 days ahead.",
              },
            ]}
          />
          {when === "scheduled" ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={slotId}>Time</Label>
              <select
                id={slotId}
                name="scheduledFor"
                value={slot}
                onChange={(e) => setScheduledFor(e.target.value)}
                aria-invalid={errors.scheduledFor ? true : undefined}
                className={selectClass}
              >
                {groupSlots(timing.slots, now).map(([day, options]) => (
                  <optgroup key={day} label={day}>
                    {options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {day}, {o.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {errors.scheduledFor ? (
                <p className="text-sm text-danger">{errors.scheduledFor}</p>
              ) : null}
            </div>
          ) : null}
        </div>

        <ChoiceGroup
          name="paymentMethod"
          legend="Payment (demo)"
          value={paymentMethod}
          onChange={setPaymentChoice}
          error={errors.paymentMethod}
          choices={methods.map((method) => ({
            value: method,
            label: PAYMENT_METHOD_LABELS[method],
            description:
              method === "cod"
                ? "Pay the rider in cash when your order arrives."
                : method === "cash_pickup"
                  ? "Pay in cash at the counter when you collect your order."
                  : "A demo payment. Nothing is charged.",
          }))}
        />
      </div>

      <div className="flex flex-col gap-4">
        <OrderSummary
          priced={priced}
          totals={totals}
          fulfillment={fulfillment}
          promoCode={promo?.code ?? null}
        />
        <PromoField
          items={cart.items}
          branch={branch}
          applied={promo}
          onChange={setAppliedPromo}
        />
        {hasProblems ? (
          <p
            role="alert"
            className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm"
          >
            Some items cannot be ordered from this branch. Please choose another
            branch, or update your cart.
          </p>
        ) : null}
        <Button
          type="submit"
          size="lg"
          className="h-12 text-base font-semibold"
          disabled={hasProblems}
        >
          {isCashPayment(paymentMethod)
            ? `Place order · ${formatPeso(totals.totalCentavos)}`
            : `Pay ${formatPeso(totals.totalCentavos)} (demo)`}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          No real payment is made.
        </p>
      </div>
    </form>
  );
}
