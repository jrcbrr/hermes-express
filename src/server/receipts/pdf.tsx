// The receipt as a PDF, built on the server with @react-pdf/renderer. It
// prints the same Receipt as the receipt page (src/lib/receipt.ts), on an
// 80 mm receipt roll in the built-in Courier font.
import {
  Document,
  Font,
  Page,
  Path,
  StyleSheet,
  Svg,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import { LOGO_MARK_PATHS } from "@/components/brand/logo-mark";
import { formatAmount, formatPesoPlain } from "@/lib/money";
import type { Receipt, ReceiptAmountRow, ReceiptRow } from "@/lib/receipt";

// Wrap long lines between words only, never with a hyphen inside a word
// ("Lat-te") as the default does.
Font.registerHyphenationCallback((word) => [word]);

/** 80 mm, the usual receipt-printer roll, in PDF points. */
const ROLL_WIDTH = 227;

// A printed receipt is black on white. A raw colour is needed here: the PDF
// is drawn outside the page, so the CSS theme variables don't exist.
const INK = "#000000";

const styles = StyleSheet.create({
  page: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    fontFamily: "Courier",
    fontSize: 8,
    lineHeight: 1.35,
    color: INK,
  },
  center: { alignItems: "center", textAlign: "center" },
  bold: { fontFamily: "Courier-Bold" },
  shopName: { fontFamily: "Courier-Bold", fontSize: 10, marginTop: 2 },
  title: { fontFamily: "Courier-Bold", letterSpacing: 2, marginTop: 6 },
  section: {
    borderTopWidth: 0.75,
    borderTopColor: INK,
    borderTopStyle: "dashed",
    paddingVertical: 5,
    marginTop: 5,
  },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  value: { flex: 1, textAlign: "right" },
  qty: { width: 18 },
  description: { flex: 1 },
  amount: { width: 52, textAlign: "right" },
});

function Row({ label, value }: ReceiptRow) {
  return (
    <View style={styles.row}>
      <Text>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

function AmountRow(row: ReceiptAmountRow) {
  return (
    <Row
      label={row.label}
      value={"text" in row ? row.text : formatAmount(row.centavos)}
    />
  );
}

export function ReceiptDocument({ receipt }: { receipt: Receipt }) {
  const { header, total, payment, footer } = receipt;
  return (
    <Document
      title={`${header.shopName} ${header.title} ${receipt.number}`}
      author={header.shopName}
    >
      <Page size={{ width: ROLL_WIDTH }} style={styles.page}>
        <View style={styles.center}>
          <Svg viewBox="0 0 48 48" width={22} height={22}>
            {LOGO_MARK_PATHS.map((d) => (
              <Path
                key={d}
                d={d}
                fill="none"
                stroke={INK}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
          </Svg>
          <Text style={styles.shopName}>{header.shopName}</Text>
          <Text>{header.branch}</Text>
          <Text>{header.phone}</Text>
          <Text>{header.tin}</Text>
          <Text style={styles.title}>{header.title}</Text>
        </View>

        <View style={styles.section}>
          {receipt.details.map((row) => (
            <Row key={row.label} {...row} />
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.qty}>QTY</Text>
            <Text style={styles.description}>DESCRIPTION</Text>
            <Text style={styles.amount}>AMOUNT</Text>
          </View>
          {receipt.lines.map((line) => (
            <View
              key={line.id}
              style={[styles.row, { marginTop: 2 }]}
              wrap={false}
            >
              <Text style={styles.qty}>{line.quantity}</Text>
              <View style={styles.description}>
                <Text>{line.description}</Text>
                <Text>
                  @{formatAmount(line.unitPriceCentavos)}
                  {line.details ? ` ${line.details}` : ""}
                </Text>
              </View>
              <Text style={styles.amount}>
                {formatAmount(line.lineTotalCentavos)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          {receipt.amounts.map((row) => (
            <AmountRow key={row.label} {...row} />
          ))}
          <View style={[styles.row, styles.bold, { marginTop: 2 }]}>
            <Text>{total.label}</Text>
            <Text style={styles.value}>{formatPesoPlain(total.centavos)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          {receipt.vat.map((row) => (
            <AmountRow key={row.label} {...row} />
          ))}
        </View>

        <View style={styles.section}>
          <Row {...payment} />
          <View style={{ marginTop: 4 }}>
            {receipt.soldTo.map((row) => (
              <Row key={row.label} {...row} />
            ))}
          </View>
        </View>

        <View style={[styles.section, styles.center]}>
          <Text>{footer.thanks}</Text>
          <Text>{footer.tagline}</Text>
          <Text style={[styles.bold, { marginTop: 4 }]}>{footer.notice}</Text>
        </View>
      </Page>
    </Document>
  );
}

/** The receipt as PDF bytes, for the download route and the email. */
export function renderReceiptPdf(receipt: Receipt): Promise<Buffer> {
  return renderToBuffer(<ReceiptDocument receipt={receipt} />);
}
