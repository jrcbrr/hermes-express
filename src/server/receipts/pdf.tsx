// The receipt as a PDF, built on the server with @react-pdf/renderer. It
// renders the same Receipt as the receipt page (src/lib/receipt.ts).
import {
  Document,
  Page,
  Path,
  StyleSheet,
  Svg,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import { LOGO_MARK_PATHS } from "@/components/brand/logo-mark";
import { formatPesoPlain } from "@/lib/money";
import type { Receipt } from "@/lib/receipt";

// Raw colours are needed here: the PDF is drawn outside the page, so the CSS
// theme variables don't exist. Values match globals.css (light theme).
const GOLD = "#B8892E";
const ESPRESSO = "#2B1E17";
const MUTED = "#7A6A5D";
const RULE = "#E5DCCF";

const styles = StyleSheet.create({
  page: {
    paddingVertical: 48,
    paddingHorizontal: 72,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: ESPRESSO,
    lineHeight: 1.4,
  },
  center: { alignItems: "center", textAlign: "center" },
  shopName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 16,
    lineHeight: 1.2,
    marginVertical: 4,
  },
  section: {
    borderBottomWidth: 1,
    borderBottomColor: RULE,
    borderBottomStyle: "dashed",
    paddingVertical: 10,
  },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  label: { fontFamily: "Helvetica-Bold", width: 90 },
  value: { flex: 1 },
  muted: { color: MUTED },
  bold: { fontFamily: "Helvetica-Bold" },
  itemName: { flex: 1 },
  qty: { width: 30, textAlign: "right" },
  money: { width: 80, textAlign: "right" },
  total: { fontFamily: "Helvetica-Bold", fontSize: 12, marginVertical: 4 },
  notice: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    letterSpacing: 0.5,
    marginTop: 8,
    textTransform: "uppercase",
  },
});

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

function Amount({
  label,
  value,
  style,
}: {
  label: string;
  value: string;
  style?: typeof styles.total | typeof styles.muted;
}) {
  return (
    <View style={[styles.row, style ?? {}]}>
      <Text>{label}</Text>
      <Text style={styles.money}>{value}</Text>
    </View>
  );
}

export function ReceiptDocument({ receipt }: { receipt: Receipt }) {
  const { shop, customer, totals, payment, footer } = receipt;
  return (
    <Document
      title={`${shop.name} receipt ${receipt.number}`}
      author={shop.name}
    >
      <Page size="A4" style={styles.page}>
        <View style={[styles.section, styles.center]}>
          <Svg viewBox="0 0 48 48" width={36} height={36}>
            {LOGO_MARK_PATHS.map((d) => (
              <Path
                key={d}
                d={d}
                fill="none"
                stroke={GOLD}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
          </Svg>
          <Text style={styles.shopName}>{shop.name}</Text>
          <Text>
            {shop.branchName} · {shop.address}
          </Text>
          <Text>Phone {shop.phone}</Text>
          <Text>TIN {shop.tin}</Text>
        </View>

        <View style={styles.section}>
          <Detail label="Receipt no." value={receipt.number} />
          <Detail label="Order code" value={receipt.orderCode} />
          <Detail label="Date" value={receipt.issuedAt} />
          <Detail label={receipt.fulfillment} value={receipt.timing} />
          <Detail label="Customer" value={customer.name} />
          <Detail label="Phone" value={customer.phone} />
          <Detail label="Email" value={customer.email} />
          {customer.address ? (
            <Detail label="Deliver to" value={customer.address} />
          ) : null}
        </View>

        <View style={styles.section}>
          <View style={[styles.row, styles.muted]}>
            <Text style={styles.itemName}>Item</Text>
            <Text style={styles.qty}>Qty</Text>
            <Text style={styles.money}>Price</Text>
            <Text style={styles.money}>Amount</Text>
          </View>
          {receipt.lines.map((line) => (
            <View
              key={line.id}
              style={[styles.row, { marginTop: 4 }]}
              wrap={false}
            >
              <View style={styles.itemName}>
                <Text style={styles.bold}>{line.name}</Text>
                {line.details ? (
                  <Text style={styles.muted}>{line.details}</Text>
                ) : null}
              </View>
              <Text style={styles.qty}>{line.quantity}</Text>
              <Text style={styles.money}>
                {formatPesoPlain(line.unitPriceCentavos)}
              </Text>
              <Text style={styles.money}>
                {formatPesoPlain(line.lineTotalCentavos)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Amount
            label="Subtotal"
            value={formatPesoPlain(totals.subtotalCentavos)}
          />
          {totals.discountCentavos > 0 ? (
            <Amount
              label={`Discount${totals.promoCode ? ` (${totals.promoCode})` : ""}`}
              value={formatPesoPlain(-totals.discountCentavos)}
            />
          ) : null}
          {totals.deliveryFeeCentavos !== null ? (
            <Amount
              label="Delivery fee"
              value={
                totals.deliveryFeeCentavos === 0
                  ? "Free"
                  : formatPesoPlain(totals.deliveryFeeCentavos)
              }
            />
          ) : null}
          <Amount
            label="Total"
            value={formatPesoPlain(totals.totalCentavos)}
            style={styles.total}
          />
          <Amount
            label="VATable sales"
            value={formatPesoPlain(totals.vatableSalesCentavos)}
            style={styles.muted}
          />
          <Amount
            label="VAT (12%)"
            value={formatPesoPlain(totals.vatCentavos)}
            style={styles.muted}
          />
        </View>

        <View style={styles.section}>
          <Detail label="Payment" value={payment.method} />
          <Detail label="Status" value={payment.status} />
        </View>

        <View style={[styles.center, { paddingTop: 10 }]}>
          <Text style={styles.bold}>{footer.thanks}</Text>
          <Text style={styles.muted}>{footer.tagline}</Text>
          <Text style={styles.notice}>{footer.notice}</Text>
        </View>
      </Page>
    </Document>
  );
}

/** The receipt as PDF bytes, for the download route and the email. */
export function renderReceiptPdf(receipt: Receipt): Promise<Buffer> {
  return renderToBuffer(<ReceiptDocument receipt={receipt} />);
}
