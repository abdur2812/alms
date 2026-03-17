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
    paddingTop: 24,
    paddingBottom: 24,
    paddingLeft: 24,
    paddingRight: 24,
    backgroundColor: "#ffffff",
  },

  // Outer wrapper
  outer: {
    borderWidth: 2,
    borderColor: "#000000",
    flex: 1,
    width: "100%",
    height: "100%",
  },

  // ── Section divider ──────────────────────────────────────────────────────
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
    padding: 7,
  },
  splitRight: {
    width: "35%",
    padding: 7,
  },
  splitLeft60: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: "#d1d5db",
    padding: 7,
  },
  splitRight40: {
    width: "40%",
    padding: 7,
  },
  splitLeft55: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: "#d1d5db",
    padding: 7,
  },
  splitRight45: {
    width: "45%",
    padding: 7,
  },

  // ── Header — single unified bar ───────────────────────────────────────────
  headerBg: { backgroundColor: "#e0f2fe" },
  headerLeft: {
    width: "20%",
    paddingVertical: 8,
    paddingLeft: 8,
    alignItems: "center",
    justifyContent: "space-between",
    flexDirection: "column",
  },
  dealershipImg: {
    width: 80,
    height: 50,
    objectFit: "contain",
  },
  headerCenter: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  headerRight: {
    width: "20%",
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
  },
  bizName: {
    fontFamily: "Times-Bold",
    fontSize: 34,
    color: "#0f172a",
    marginBottom: 2,
    textAlign: "center",
  },
  bizTagline: {
    fontSize: 9,
    color: "#1f2937",
    marginBottom: 3,
    textAlign: "center",
  },
  bizAddress: {
    fontSize: 9,
    color: "#1f2937",
    marginBottom: 1,
    textAlign: "center",
  },
  bizPhone: { fontSize: 9, color: "#1f2937" },
  gstinLabel: { fontSize: 9, color: "#0f172a", fontFamily: "Helvetica-Bold" },
  gstinValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: "#0f172a",
    paddingRight: 20,
  },
  headerLogo: {
    width: 110,
    height: 70,
    marginBottom: 6,
    paddingRight: 20,
  },

  // ── Title ─────────────────────────────────────────────────────────────────
  titleSection: {
    paddingVertical: 3,
    paddingHorizontal: 9,
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  titleText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    letterSpacing: 2,
    color: "#000000",
  },

  // ── Customer ──────────────────────────────────────────────────────────────
  sectionLabel: {
    fontSize: 7,
    color: "#000000",
    marginBottom: 2,
    fontFamily: "Helvetica-Bold",
  },
  custName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
    marginBottom: 2,
    color: "#000000",
  },
  custDetail: { fontSize: 9, marginBottom: 1, color: "#111827" },
  metaRow: { flexDirection: "row", marginBottom: 2 },
  metaLabel: {
    fontSize: 8,
    color: "#000000",
    width: 60,
    fontFamily: "Helvetica-Bold",
  },
  metaValue: { fontSize: 9, flex: 1, color: "#111827" },
  metaValueBold: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    flex: 1,
    color: "#000000",
  },

  // ── Items table ───────────────────────────────────────────────────────────
  tableOuter: {
    borderTopWidth: 1,
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
    fontSize: 8,
    paddingVertical: 3,
    paddingHorizontal: 3,
    borderRightWidth: 1,
    borderRightColor: "#000000",
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    color: "#000000",
  },
  tdCell: {
    fontSize: 8.5,
    paddingVertical: 5,
    paddingHorizontal: 3,
    borderRightWidth: 1,
    borderRightColor: "#000000",
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    color: "#000000",
  },
  tdLast: {
    fontSize: 8.5,
    paddingVertical: 5,
    paddingHorizontal: 3,
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    color: "#000000",
  },
  thLast: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    paddingVertical: 3,
    paddingHorizontal: 3,
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    color: "#000000",
  },

  // ── Totals ─────────────────────────────────────────────────────────────────
  wordsLabel: {
    fontSize: 8,
    color: "#000000",
    marginBottom: 3,
    fontFamily: "Helvetica-Bold",
  },
  wordsText: {
    fontFamily: "Helvetica-Oblique",
    fontSize: 9,
    color: "#000000",
  },
  totalsRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#d1d5db",
    paddingVertical: 2,
  },
  totalsLabel: {
    flex: 1,
    fontSize: 9,
    textAlign: "right",
    paddingRight: 8,
    color: "#000000",
  },
  totalsValue: {
    fontSize: 9,
    textAlign: "right",
    paddingRight: 6,
    color: "#000000",
    fontFamily: "Helvetica-Bold",
  },
  grandTotalRow: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    paddingVertical: 4,
  },
  grandTotalLabel: {
    flex: 1,
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    color: "#000000",
    textAlign: "right",
    paddingRight: 8,
  },
  grandTotalValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    color: "#000000",
    textAlign: "right",
    paddingRight: 6,
  },

  // ── Spacer ────────────────────────────────────────────────────────────────
  spacer: { flexGrow: 1 },

  // ── E.&O.E. ───────────────────────────────────────────────────────────────
  eoeSection: {
    backgroundColor: "#ffffff",
    paddingVertical: 3,
    paddingHorizontal: 9,
  },
  eoeTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: "#000000",
  },

  // ── Bank + Signature ──────────────────────────────────────────────────────
  bankRow: { flexDirection: "row", marginBottom: 2 },
  bankLabel: {
    fontSize: 8,
    color: "#000000",
    width: 58,
    fontFamily: "Helvetica-Bold",
  },
  bankValue: { fontSize: 9, flex: 1, color: "#000000" },
  qrWrapper: {
    width: 70,
    alignItems: "center",
    alignSelf: "center",
    justifyContent: "center",
  },
  qrImage: { width: 62, height: 62 },
  forText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    textAlign: "center",
    marginBottom: 46,
    color: "#000000",
  },
  sigLine: {
    borderTopWidth: 1,
    borderTopColor: "#000000",
    marginHorizontal: 15,
  },
  sigLabel: {
    fontSize: 8,
    textAlign: "center",
    marginTop: 3,
    color: "#111827",
  },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    backgroundColor: "#ffffff",
    paddingVertical: 5,
    paddingHorizontal: 9,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  footerText: {
    fontFamily: "Helvetica-Oblique",
    fontSize: 8,
    color: "#4b5563",
    textAlign: "center",
  },
  footerPageText: {
    fontSize: 8,
    color: "#4b5563",
    fontFamily: "Helvetica-Bold",
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

function chunkItems(items, chunkSize) {
  if (!items.length) return [[]];

  const chunks = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
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
  const ls = item.quantity * item.unitPrice; // inclusive price
  const gstAmt = isGstBill ? (ls * item.gst) / (100 + item.gst) : 0;
  const total = ls - gstAmt; // base amount excluding GST
  const baseRate =
    item.unitPrice - (item.unitPrice * item.gst) / (100 + item.gst); // unit price ex-GST
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
    const ls = item.quantity * item.unitPrice; // inclusive
    if (invoice.isGstBill && item.gst > 0) {
      const gstAmt = (ls * item.gst) / (100 + item.gst);
      if (!gstGroups[item.gst]) gstGroups[item.gst] = 0;
      gstGroups[item.gst] += gstAmt;
      subtotal += ls - gstAmt; // base amount (ex-GST)
    } else {
      subtotal += ls;
    }
  });

  const totalGst = Object.values(gstGroups).reduce((s, v) => s + v, 0);
  const grandTotal = subtotal + totalGst; // = sum of entered prices

  // ── Address strings ──────────────────────────────────────────────────────
  const bizLine1 = `${addr.door_no_new}, ${addr.street}, ${addr.area},`;
  const bizLine2 = `${addr.landmark}, ${addr.district} - ${addr.pincode}`;

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
  const itemChunks = chunkItems(items, 20);

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
      {itemChunks.map((pageItems, pageIndex) => {
        const isLastPage = pageIndex === itemChunks.length - 1;

        return (
          <Page key={pageIndex} size="A4" style={S.page}>
            <View style={S.outer}>
              {/* ① HEADER — single unified bar */}
              <View style={[{ flexDirection: "row" }, S.headerBg]}>
                <View style={S.headerLeft}>
                  <Image
                    style={S.dealershipImg}
                    src={assetUrl("/dealership1.png")}
                  />
                  <Image
                    style={S.dealershipImg}
                    src={assetUrl("/dealership2.png")}
                  />
                </View>
                <View style={S.headerCenter}>
                  <Text style={S.bizName}>{biz.business_name}</Text>
                  <Text style={S.bizTagline}>{biz.tagline}</Text>
                  <Text style={S.bizAddress}>{bizLine1}</Text>
                  <Text style={S.bizAddress}>{bizLine2}</Text>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "center",
                      marginTop: 2,
                    }}
                  >
                    <Text style={S.bizPhone}>Ph: {biz.phone_numbers[0]}</Text>
                  </View>
                </View>
                <View style={S.headerRight}>
                  <Image
                    style={S.headerLogo}
                    src={assetUrl("/alms-logo.png")}
                  />
                  {invoice.isGstBill && (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Text style={S.gstinLabel}>GSTIN:</Text>
                      <Text style={S.gstinValue}>{biz.gst_number}</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* ② TAX INVOICE / ESTIMATE TITLE */}
              <View
                style={[
                  S.titleSection,
                  S.divider,
                  { flexDirection: "row", alignItems: "center" },
                ]}
              >
                <View style={{ flex: 1 }} />
                <Text style={S.titleText}>
                  {invoice.isGstBill ? "TAX INVOICE" : "ESTIMATE"}
                </Text>
                <View style={{ flex: 1 }}>
                  {invoice.isGstBill && (
                    <Text
                      style={{
                        fontFamily: "Helvetica-Bold",
                        fontSize: 7,
                        textAlign: "right",
                        paddingRight: 9,
                        color: "#000000",
                        letterSpacing: 1,
                      }}
                    >
                      {(invoice.copyType || "original").toUpperCase()}
                    </Text>
                  )}
                </View>
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
                  {pageItems.map((item, idx) => (
                    <ItemRow
                      key={idx}
                      item={item}
                      idx={pageIndex * 20 + idx}
                      isGstBill={invoice.isGstBill}
                    />
                  ))}
                </View>
              </View>

              {isLastPage ? (
                <>
                  {/* ⑤ TOTALS + WORDS */}
                  <View
                    style={[
                      S.splitRow,
                      S.divider,
                      {
                        borderBottomWidth: 1.5,
                        borderBottomColor: "#3730a3",
                      },
                    ]}
                  >
                    <View style={S.splitLeft55}>
                      <Text style={S.wordsLabel}>Amount in Words</Text>
                      <Text style={S.wordsText}>
                        {convertToWords(grandTotal)}
                      </Text>
                    </View>

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
                        <Text style={S.grandTotalValue}>
                          {fmt(Math.round(grandTotal))}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={S.spacer} />

                  <View style={[S.eoeSection, S.divider]}>
                    <Text style={S.eoeTitle}>E.&O.E.</Text>
                  </View>

                  {invoice.isGstBill && (
                    <View style={[S.splitRow, S.divider]}>
                      <View style={S.splitLeft55}>
                        <View
                          style={{ flexDirection: "row", alignItems: "center" }}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={[S.sectionLabel, { marginBottom: 3 }]}>
                              Account Details
                            </Text>
                            <BankRow
                              label="A/C Holder"
                              value={bank.account_holder}
                            />
                            <BankRow
                              label="Account No"
                              value={bank.account_number}
                            />
                            <BankRow label="IFSC" value={bank.ifsc_code} />
                            <BankRow label="Branch" value={bank.branch_name} />
                            <BankRow label="Bank Name" value={bank.bank_name} />
                          </View>
                          <View style={S.qrWrapper}>
                            <Image
                              style={S.qrImage}
                              src={assetUrl("/gpay-qr.png")}
                            />
                            <Text
                              style={{
                                fontSize: 7,
                                marginTop: 3,
                                color: "#000000",
                                textAlign: "center",
                              }}
                            >
                              GPay: {biz.phone_numbers[1]}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <View style={S.splitRight45}>
                        <Text style={S.forText}>For {biz.business_name}</Text>
                        <View style={S.sigLine} />
                        <Text style={S.sigLabel}>{decl.signature_label}</Text>
                      </View>
                    </View>
                  )}
                </>
              ) : (
                <View style={S.spacer} />
              )}

              {/* ⑨ FOOTER */}
              <View style={[S.footer, S.divider]}>
                {/* Customer Signature - only for credit bills */}
                <View
                  style={{
                    width: "30%",
                    paddingRight: 8,
                    justifyContent: "flex-start",
                  }}
                >
                  {invoice.billType === "credit" && (
                    <Text
                      style={{
                        fontSize: 7,
                        fontFamily: "Helvetica-Bold",
                        color: "#000000",
                      }}
                    >
                      Customer's Signature
                    </Text>
                  )}
                </View>
                {/* Center text */}
                <View style={{ flex: 1, alignItems: "center" }}>
                  <Text style={S.footerText}>Thank You for Your Business!</Text>
                  <Text style={S.footerText}>
                    This is a Computer Generated Bill
                  </Text>
                </View>
                <Text
                  style={[
                    S.footerPageText,
                    { width: "30%", textAlign: "right" },
                  ]}
                  render={({ pageNumber, totalPages }) =>
                    `Page ${pageNumber} of ${totalPages}`
                  }
                />
              </View>
            </View>
          </Page>
        );
      })}
    </Document>
  );
}
