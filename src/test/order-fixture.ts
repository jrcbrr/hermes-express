// A loaded order (as getOrderForUser returns it) for component and receipt tests.
import type { OrderDetails } from "@/server/orders/queries";

export const ORDER_ID = "6f1c7a52-8d1e-4f5b-9c3a-2b4d6e8f0a1b";

/** A paid GCash pickup at BGC: a custom latte (×2) and a croissant, ₱495. */
export const pickupOrder: OrderDetails = {
  id: ORDER_ID,
  code: "HX-7K2P",
  userId: "u1",
  branchId: "branch-bgc",
  branchSlug: "bgc",
  branchName: "BGC",
  branchAddress: "High Street Kiosk, Bonifacio Global City",
  fulfillment: "pickup",
  status: "received",
  scheduledFor: null,
  contactName: "Maria Santos",
  phone: "+639171234567",
  receiptEmail: "maria@example.com",
  address: null,
  notes: "",
  subtotalCentavos: 49500,
  discountCentavos: 0,
  deliveryFeeCentavos: 0,
  pointsRedeemed: 0,
  totalCentavos: 49500,
  promoCodeId: null,
  promoCode: null,
  paymentMethod: "gcash_demo",
  paymentStatus: "demo_paid",
  clientRequestId: "r1",
  receiptNumber: 123,
  // 9:15 AM on Oct 30, 2026 in Manila.
  createdAt: new Date("2026-10-30T01:15:00.000Z"),
  updatedAt: new Date("2026-10-30T01:15:00.000Z"),
  items: [
    {
      id: "i1",
      orderId: ORDER_ID,
      kind: "custom",
      productId: null,
      name: "Custom Latte",
      config: { details: ["16oz", "Iced", "Latte", "Oat milk"] },
      unitPriceCentavos: 20000,
      quantity: 2,
      lineTotalCentavos: 40000,
      sortOrder: 0,
    },
    {
      id: "i2",
      orderId: ORDER_ID,
      kind: "product",
      productId: "p1",
      name: "Butter Croissant",
      config: { productSlug: "butter-croissant", details: [] },
      unitPriceCentavos: 9500,
      quantity: 1,
      lineTotalCentavos: 9500,
      sortOrder: 1,
    },
  ],
};

/** A Cash on Delivery order, scheduled, with a promo discount and a delivery fee. */
export const deliveryOrder: OrderDetails = {
  ...pickupOrder,
  fulfillment: "delivery",
  address: "Unit 5, 26th St, Wawa, Taguig City",
  // 9:00 AM on Oct 31, 2026 in Manila.
  scheduledFor: new Date("2026-10-31T01:00:00.000Z"),
  discountCentavos: 5000,
  promoCodeId: "promo-1",
  promoCode: "FIRSTSIP",
  deliveryFeeCentavos: 4900,
  totalCentavos: 49400,
  paymentMethod: "cod",
  paymentStatus: "unpaid",
};
