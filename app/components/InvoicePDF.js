import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import businessConfig from "@/lib/businessConfig";

// Build an absolute URL so @react-pdf/renderer can fetch images correctly.
// Relative paths like "/logo.png" don't work inside the PDF renderer.
function assetUrl(path) {
  if (typeof window !== "undefined") {
    return `${window.location.origin}${path}`;
  }
  return path;
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    padding: 18,
    backgroundColor: "#ffffff",
  },

  // Outer wrapper — indigo border
  outer: {
    borderWidth: 2,
    borderColor: "#000000",
    flex: 1,
  },

  // ── Section divider (top border on section) ──────────────────────────────
  divider: {
    borderTopWidth: 1,
    borderTopColor: "#d1d5db",
  },
  dividerStrong: {
    borderTopWidth: 1.5,
    borderTopColor: "#000000",
  },

  // ── 2-col split helpers ───────────────────────────────────────────────────
  splitRow: { flexDirection: "row" },
  splitLeft: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: "#d1d5db",
    padding: 9,
  },
  splitRight: {
    width: "35%",
    padding: 9,
  },
  splitLeft60: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: "#d1d5db",
    padding: 9,
  },
  splitRight40: {
    width: "40%",
    padding: 9,
  },
  splitLeft55: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: "#d1d5db",
    padding: 9,
  },
  splitRight45: {
    width: "45%",
    padding: 9,
  },

  // ── Header ────────────────────────────────────────────────────────────────
  // Top two boxes (business + GST) share the same light blue background
  headerBg: { backgroundColor: "#e0f2fe" },
  bizName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 24,
    color: "#0f172a",
    marginBottom: 4,
  },
  bizTagline: { fontSize: 10, color: "#1f2937", marginBottom: 5 },
  bizAddress: { fontSize: 10, color: "#1f2937", marginBottom: 2 },
  bizPhone: { fontSize: 10, color: "#1f2937" },
  gstinLabel: { fontSize: 9, color: "#0f172a", marginBottom: 3 },
  gstinValue: { fontFamily: "Helvetica-Bold", fontSize: 12, color: "#0f172a" },
  gstState: { fontSize: 9, color: "#111827", marginTop: 6 },

  headerLogo: {
    width: 70,
    height: 70,
  },

  // ── Title ─────────────────────────────────────────────────────────────────
  titleSection: {
    paddingVertical: 6,
    paddingHorizontal: 9,
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  titleText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
    letterSpacing: 3,
    color: "#000000",
  },

  // ── Customer ──────────────────────────────────────────────────────────────
  sectionLabel: {
    fontSize: 8,
    color: "#000000",
    marginBottom: 3,
    fontFamily: "Helvetica-Bold",
  },
  custName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 16,
    marginBottom: 3,
    color: "#000000",
  },
  custDetail: { fontSize: 10, marginBottom: 2, color: "#111827" },
  metaRow: { flexDirection: "row", marginBottom: 3 },
  metaLabel: {
    fontSize: 9,
    color: "#000000",
    width: 62,
    fontFamily: "Helvetica-Bold",
  },
  metaValue: { fontSize: 10, flex: 1, color: "#111827" },
  metaValueBold: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    flex: 1,
    color: "#000000",
  },

  // ── Items table ───────────────────────────────────────────────────────────
  // Single clean grid: outer top/left border, cell borders for all lines
  tableOuter: {
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: "#000000",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
  },
  tableRow: {
    flexDirection: "row",
  },
  tableRowAlt: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
  },

  thCell: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderRightWidth: 1,
    borderRightColor: "#000000",
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    color: "#000000",
  },
  tdCell: {
    fontSize: 9.5,
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderRightWidth: 1,
    borderRightColor: "#000000",
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    color: "#000000",
  },
  tdLast: {
    fontSize: 9.5,
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderRightWidth: 1,
    borderRightColor: "#000000",
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    color: "#000000",
  },
  thLast: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderRightWidth: 1,
    borderRightColor: "#000000",
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    color: "#000000",
  },

  // ── Totals ─────────────────────────────────────────────────────────────────
  wordsLabel: {
    fontSize: 9,
    color: "#000000",
    marginBottom: 4,
    fontFamily: "Helvetica-Bold",
  },
  wordsText: {
    fontFamily: "Helvetica-Oblique",
    fontSize: 10,
    color: "#000000",
  },
  totalsRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#d1d5db",
    paddingVertical: 3,
  },
  totalsLabel: {
    flex: 1,
    fontSize: 10,
    textAlign: "right",
    paddingRight: 8,
    color: "#000000",
  },
  totalsValue: {
    fontSize: 10,
    textAlign: "right",
    paddingRight: 6,
    color: "#000000",
    fontFamily: "Helvetica-Bold",
  },
  grandTotalRow: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    paddingVertical: 6,
  },
  grandTotalLabel: {
    flex: 1,
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    color: "#000000",
    textAlign: "right",
    paddingRight: 8,
  },
  grandTotalValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    color: "#000000",
    textAlign: "right",
    paddingRight: 6,
  },

  // ── Spacer to push declaration + bank to bottom ───────────────────────────
  spacer: { flexGrow: 1 },

  // ── Declaration ───────────────────────────────────────────────────────────
  declSection: {
    backgroundColor: "#ffffff",
    paddingVertical: 6,
    paddingHorizontal: 9,
  },
  declTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9.5,
    color: "#000000",
    marginBottom: 4,
  },
  declText: { fontSize: 10, color: "#111827" },

  // ── E.&O.E. box ───────────────────────────────────────────────────────────
  eoeSection: {
    backgroundColor: "#ffffff",
    paddingVertical: 5,
    paddingHorizontal: 9,
  },
  eoeTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9.5,
    color: "#000000",
    marginBottom: 2,
  },
  eoeText: { fontSize: 9, color: "#111827" },

  // ── Bank + Signature ──────────────────────────────────────────────────────
  bankRow: { flexDirection: "row", marginBottom: 3 },
  bankLabel: {
    fontSize: 9,
    color: "#000000",
    width: 62,
    fontFamily: "Helvetica-Bold",
  },
  bankValue: { fontSize: 10, flex: 1, color: "#000000" },
  bankDetailsRow: { flexDirection: "row", alignItems: "flex-start" },
  bankDetailsCol: { flex: 1 },
  qrWrapper: {
    width: 90,
    alignItems: "center",
    justifyContent: "flex-start",
    alignSelf: "flex-start",
  },
  qrImage: { width: 80, height: 80 },
  forText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    textAlign: "center",
    marginBottom: 35,
    color: "#000000",
  },
  sigLine: {
    borderTopWidth: 1,
    borderTopColor: "#000000",
    marginHorizontal: 15,
  },
  sigLabel: {
    fontSize: 9,
    textAlign: "center",
    marginTop: 4,
    color: "#111827",
  },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: { backgroundColor: "#ffffff", padding: 7, alignItems: "center" },
  footerText: {
    fontFamily: "Helvetica-Oblique",
    fontSize: 9.5,
    color: "#4b5563",
  },
});

// ─── Number helpers ─────────────────────────────────────────────────────────

function fmt(n) {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n || 0);
}

const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];
const TENS = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];

function numToWords(n) {
  if (n === 0) return "Zero";
  let str = "";
  if (n >= 10000000) {
    str += numToWords(Math.floor(n / 10000000)) + " Crore ";
    n %= 10000000;
  }
  if (n >= 100000) {
    str += numToWords(Math.floor(n / 100000)) + " Lakh ";
    n %= 100000;
  }
  if (n >= 1000) {
    str += numToWords(Math.floor(n / 1000)) + " Thousand ";
    n %= 1000;
  }
  if (n >= 100) {
    str += ONES[Math.floor(n / 100)] + " Hundred ";
    n %= 100;
  }
  if (n >= 20) {
    str += TENS[Math.floor(n / 10)] + (n % 10 ? " " + ONES[n % 10] : "");
  } else if (n > 0) {
    str += ONES[n];
  }
  return str.trim();
}

function convertToWords(amount) {
  const intPart = Math.floor(amount);
  const decPart = Math.round((amount - intPart) * 100);
  let result = "Rupees " + numToWords(intPart);
  if (decPart > 0) result += " and " + numToWords(decPart) + " Paise";
  return result + " Only";
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function MetaRow({ label, value, bold }) {
  return (
    <View style={S.metaRow}>
      <Text style={S.metaLabel}>{label}</Text>
      <Text style={bold ? S.metaValueBold : S.metaValue}>{value}</Text>
    </View>
  );
}

function BankRow({ label, value }) {
  return (
    <View style={S.bankRow}>
      <Text style={S.bankLabel}>{label}</Text>
      <Text style={S.bankValue}>{value}</Text>
    </View>
  );
}

// ─── Column widths (must add up to ~100% or fixed pt) ───────────────────────
// S.No, Particulars (wider), HSN, GST, Qty, Rate, Total
const COL_WIDTHS = ["6%", "40%", "10%", "8%", "8%", "14%", "14%"];

function TableCell({ children, width, align, isLast, isHeader, bg }) {
  const base = isHeader
    ? isLast
      ? S.thLast
      : S.thCell
    : isLast
      ? S.tdLast
      : S.tdCell;

  return (
    <View style={[base, { width }, bg ? { backgroundColor: bg } : {}]}>
      <Text style={{ textAlign: align || "left" }}>{children}</Text>
    </View>
  );
}

function ItemRow({ item, idx, isGstBill }) {
  const ls = item.quantity * item.unitPrice;
  const gstAmt = isGstBill ? (ls * item.gst) / 100 : 0;
  const total = ls + gstAmt;
  const bg = idx % 2 === 1 ? "#fafafa" : null;
  const cells = [
    [String(idx + 1), "center"],
    [item.name || "", "left"],
    [item.hsnCode || "-", "center"],
    [isGstBill ? (item.gst || 0) + "%" : "-", "center"],
    [String(item.quantity), "center"],
    [fmt(item.unitPrice), "right"],
    [fmt(total), "right"],
  ];
  return (
    <View style={bg ? S.tableRowAlt : S.tableRow}>
      {cells.map(([text, align], i) => (
        <TableCell
          key={i}
          width={COL_WIDTHS[i]}
          align={align}
          isLast={i === cells.length - 1}
          bg={bg}
        >
          {text}
        </TableCell>
      ))}
    </View>
  );
}

// ─── Main document ────────────────────────────────────────────────────────────

export default function InvoiceDocument({ invoice }) {
  const biz = businessConfig.business_details;
  const bank = businessConfig.bank_details;
  const decl = businessConfig.declaration;
  const addr = biz.address;

  const customer = invoice.customerData || {};
  const permAddr = customer.permanentAddress || {};

  // ── Totals ──────────────────────────────────────────────────────────────
  let subtotal = 0;
  const gstGroups = {};
  const items = invoice.items || [];

  items.forEach((item) => {
    const ls = item.quantity * item.unitPrice;
    subtotal += ls;
    if (invoice.isGstBill && item.gst > 0) {
      if (!gstGroups[item.gst]) gstGroups[item.gst] = 0;
      gstGroups[item.gst] += (ls * item.gst) / 100;
    }
  });

  const totalGst = Object.values(gstGroups).reduce((s, v) => s + v, 0);
  const grandTotal = subtotal + totalGst;

  // ── Address strings ──────────────────────────────────────────────────────
  const bizLine1 = `${addr.door_no_old}/${addr.door_no_new}, ${addr.street}, ${addr.area},`;
  const bizLine2 = `${addr.landmark}, ${addr.district} - ${addr.pincode}`;
  const bizPhones = `Ph: ${biz.phone_numbers.join(" | ")}`;

  const custAddrStr = [
    permAddr.companyAddress,
    permAddr.city,
    permAddr.state,
    permAddr.postalCode,
  ]
    .filter(Boolean)
    .join(", ");

  const invoiceDate = invoice.createdAt
    ? new Date(invoice.createdAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "-";

  const billLabel = invoice.billType === "credit" ? "Credit Bill" : "Cash Bill";

  // ── Item rows (pad to min 5) ──────────────────────────────────────────────
  const paddedItems = [...items];
  while (paddedItems.length < 5) paddedItems.push(null);

  // ── GST breakdown rows ────────────────────────────────────────────────────
  const gstBreakdownRows = [];
  if (invoice.isGstBill) {
    Object.keys(gstGroups)
      .sort((a, b) => a - b)
      .forEach((rate) => {
        if (invoice.isIgst) {
          gstBreakdownRows.push([`IGST @ ${rate}%`, fmt(gstGroups[rate])]);
        } else {
          const half = gstGroups[rate] / 2;
          gstBreakdownRows.push([`CGST @ ${rate / 2}%`, fmt(half)]);
          gstBreakdownRows.push([`SGST @ ${rate / 2}%`, fmt(half)]);
        }
      });
  }

  const HEADER_LABELS = [
    "S.No",
    "Particulars",
    "HSN",
    "GST",
    "Qty",
    "Rate",
    "Total",
  ];
  const HEADER_ALIGNS = [
    "center",
    "left",
    "center",
    "center",
    "center",
    "right",
    "right",
  ];

  return (
    <Document>
      <Page size="A4" style={S.page}>
        <View style={S.outer}>
          {/* ① HEADER */}
          <View style={[S.splitRow, S.headerBg]}>
            <View style={S.splitLeft}>
              <Text style={S.bizName}>{biz.business_name}</Text>
              <Text style={S.bizTagline}>{biz.tagline}</Text>
              <Text style={S.bizAddress}>{bizLine1}</Text>
              <Text style={S.bizAddress}>{bizLine2}</Text>
              <Text style={S.bizPhone}>{bizPhones}</Text>
            </View>
            <View
              style={[
                S.splitRight,
                {
                  alignItems: "center",
                  justifyContent: "center",
                  borderLeftWidth: 1,
                  borderLeftColor: "#93c5fd",
                  backgroundColor: "#e0f2fe",
                },
              ]}
            >
              <Image style={S.headerLogo} src={assetUrl("/alms-logo.png")} />
              <Text style={S.gstinLabel}>GSTIN</Text>
              <Text style={S.gstinValue}>{biz.gst_number}</Text>
            </View>
          </View>

          {/* ② TAX INVOICE / ESTIMATE TITLE */}
          <View style={[S.titleSection, S.divider]}>
            <Text style={S.titleText}>
              {invoice.isGstBill ? "TAX INVOICE" : "ESTIMATE"}
            </Text>
          </View>

          {/* ③ CUSTOMER + META */}
          <View style={[S.splitRow, S.divider]}>
            <View style={S.splitLeft60}>
              <Text style={S.sectionLabel}>Bill To</Text>
              <Text style={S.custName}>{customer.name || "-"}</Text>
              {customer.phone && (
                <Text style={S.custDetail}>Ph: {customer.phone}</Text>
              )}
              {customer.gstNumber && (
                <Text style={S.custDetail}>GST: {customer.gstNumber}</Text>
              )}
              {custAddrStr ? (
                <Text
                  style={[S.custDetail, { color: "#555555", marginTop: 2 }]}
                >
                  {custAddrStr}
                </Text>
              ) : null}
            </View>
            <View style={S.splitRight40}>
              <MetaRow
                label="Invoice No"
                value={invoice.invoiceNumber || "-"}
                bold
              />
              <MetaRow label="Date" value={invoiceDate} bold />
              <MetaRow label="Bill Type" value={billLabel} />
              <MetaRow
                label="GST Bill"
                value={invoice.isGstBill ? "Yes" : "No"}
              />
              <MetaRow
                label="Vehicle No"
                value={invoice.vehicleNumber || "-"}
              />
            </View>
          </View>

          {/* ④ ITEMS TABLE */}
          <View style={S.divider}>
            <View style={S.tableOuter}>
              {/* Header row */}
              <View style={S.tableHeader}>
                {HEADER_LABELS.map((label, i) => (
                  <TableCell
                    key={i}
                    width={COL_WIDTHS[i]}
                    align={HEADER_ALIGNS[i]}
                    isLast={i === HEADER_LABELS.length - 1}
                    isHeader
                  >
                    {label}
                  </TableCell>
                ))}
              </View>

              {/* Data rows */}
              {paddedItems.map((item, idx) =>
                item ? (
                  <ItemRow
                    key={idx}
                    item={item}
                    idx={idx}
                    isGstBill={invoice.isGstBill}
                  />
                ) : (
                  <View
                    key={idx}
                    style={idx % 2 === 1 ? S.tableRowAlt : S.tableRow}
                  >
                    {COL_WIDTHS.map((w, i) => (
                      <TableCell
                        key={i}
                        width={w}
                        isLast={i === COL_WIDTHS.length - 1}
                      >
                        {" "}
                      </TableCell>
                    ))}
                  </View>
                ),
              )}
            </View>
          </View>

          {/* ⑤ TOTALS + WORDS */}
          <View
            style={[
              S.splitRow,
              S.divider,
              { borderBottomWidth: 1.5, borderBottomColor: "#3730a3" },
            ]}
          >
            {/* Left: amount in words */}
            <View style={S.splitLeft55}>
              <Text style={S.wordsLabel}>Amount in Words</Text>
              <Text style={S.wordsText}>{convertToWords(grandTotal)}</Text>
            </View>

            {/* Right: totals breakdown */}
            <View style={S.splitRight45}>
              <View style={S.totalsRow}>
                <Text style={S.totalsLabel}>Subtotal</Text>
                <Text style={S.totalsValue}>{fmt(subtotal)}</Text>
              </View>
              {gstBreakdownRows.map(([label, value], i) => (
                <View key={i} style={S.totalsRow}>
                  <Text style={S.totalsLabel}>{label}</Text>
                  <Text style={S.totalsValue}>{value}</Text>
                </View>
              ))}
              <View style={S.grandTotalRow}>
                <Text style={S.grandTotalLabel}>Grand Total</Text>
                <Text style={S.grandTotalValue}>{fmt(grandTotal)}</Text>
              </View>
            </View>
          </View>

          {/* Spacer */}
          <View style={S.spacer} />

          {/* ⑥ DECLARATION */}
          <View style={[S.declSection, S.divider]}>
            <Text style={S.declTitle}>DECLARATION</Text>
            <Text style={S.declText}>
              We declare that this invoice shows the actual price of the goods
              described and that all particulars are true and correct.
            </Text>
          </View>

          {/* ⑦ E.&O.E. (Errors and Omissions Excepted) */}
          <View style={[S.eoeSection, S.divider]}>
            <Text style={S.eoeTitle}>E.&O.E.</Text>
            <Text style={S.eoeText}>Errors and Omissions Excepted.</Text>
          </View>

          {/* ⑧ BANK + SIGNATURE + QR */}
          <View style={[S.splitRow, S.divider]}>
            <View style={S.splitLeft55}>
              <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                <View style={{ flex: 1 }}>
                  <Text style={[S.sectionLabel, { marginBottom: 4 }]}>
                    Account Details
                  </Text>
                  <BankRow label="A/C Holder" value={bank.account_holder} />
                  <BankRow label="Account No" value={bank.account_number} />
                  <BankRow label="IFSC" value={bank.ifsc_code} />
                  <BankRow label="Branch" value={bank.branch_name} />
                  <BankRow label="Bank Name" value={bank.bank_name} />
                </View>
                <View style={S.qrWrapper}>
                  <Image style={S.qrImage} src={assetUrl("/gpay-qr.png")} />
                </View>
              </View>
            </View>
            <View style={S.splitRight45}>
              <Text style={S.forText}>For {biz.business_name}</Text>
              <View style={S.sigLine} />
              <Text style={S.sigLabel}>{decl.signature_label}</Text>
            </View>
          </View>

          {/* ⑨ FOOTER */}
          <View style={[S.footer, S.divider]}>
            <Text style={S.footerText}>{decl.thank_you_note}</Text>
            <Text
              style={S.footerText}
              render={({ pageNumber, totalPages }) =>
                `Page ${pageNumber} of ${totalPages}`
              }
            />
          </View>
        </View>
      </Page>
    </Document>
  );
}
