import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";

// Clean Estimate PDF — designed natively for A5 portrait (148 × 210 mm).
// Print this PDF on A5 sheets at 100% scale (not "fit to page").
// Fonts/sizes are chosen for A5 readability — NOT a shrunk A4 layout.
const S = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 11,
    paddingTop: 30,
    paddingBottom: 28,
    paddingLeft: 28,
    paddingRight: 28,
    backgroundColor: "#ffffff",
  },
  outer: {
    borderWidth: 1,
    borderColor: "#000000",
    flex: 1,
    width: "100%",
  },
  titleSection: {
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
  },
  titleText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 18,
    letterSpacing: 3,
    textAlign: "center",
  },
  titleSub: {
    fontSize: 10,
    color: "#333333",
    marginTop: 4,
    textAlign: "center",
  },
  metaRow: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
  },
  metaCol: { flex: 1, paddingRight: 8 },
  metaLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#000000",
    marginBottom: 3,
    letterSpacing: 0.5,
  },
  metaValue: {
    fontSize: 11,
    color: "#000000",
  },
  metaRight: {
    width: 140,
    borderLeftWidth: 1,
    borderLeftColor: "#000000",
    paddingLeft: 10,
    justifyContent: "center",
  },
  sectionLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    marginBottom: 3,
    letterSpacing: 0.5,
  },
  custName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    marginBottom: 3,
  },
  custDetail: { fontSize: 10, color: "#000000", marginBottom: 2, lineHeight: 1.3 },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    backgroundColor: "#ffffff",
    minHeight: 26,
  },
  thCell: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10.5,
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderRightWidth: 0.5,
    borderRightColor: "#000000",
    textAlign: "center",
    justifyContent: "center",
  },
  tdCell: {
    fontSize: 10.5,
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderRightWidth: 0.5,
    borderRightColor: "#000000",
    borderBottomWidth: 0.4,
    borderBottomColor: "#999999",
    minHeight: 27,
    justifyContent: "center",
  },
  tdCellLast: {
    fontSize: 10.5,
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderBottomWidth: 0.4,
    borderBottomColor: "#999999",
    minHeight: 27,
    justifyContent: "center",
  },
  totalRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#000000",
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: "center",
  },
  totalLabel: {
    flex: 1,
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    textAlign: "right",
    paddingRight: 10,
  },
  totalValue: {
    width: 95,
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
    textAlign: "right",
  },
  footer: {
    paddingVertical: 8,
    alignItems: "center",
    borderTopWidth: 0.5,
    borderTopColor: "#000000",
  },
  footerText: { fontSize: 8, color: "#666666", textAlign: "center" },
});

function fmt(n) {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n || 0);
}

export default function EstimateCleanPDF({ invoice }) {
  const inv = invoice || {};
  const items = inv.items || [];
  const customer = inv.customerData || {};
  const permAddr = customer.permanentAddress || {};

  const invoiceDate = inv.createdAt
    ? new Date(inv.createdAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

  const grandTotal = items.reduce(
    (s, it) => s + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0),
    0
  );
  const totalQty = items.reduce((s, it) => s + (Number(it.quantity) || 0), 0);

  const custAddrStr = [
    permAddr.companyAddress,
    [permAddr.city, permAddr.postalCode].filter(Boolean).join(" "),
    permAddr.state,
  ]
    .filter(Boolean)
    .join(", ");

  // Column widths for A5 portrait — totals to 100%.
  // Give Rate/Amount extra room since fonts are now larger.
  const COLS = ["8%", "48%", "13%", "15%", "16%"];
  const HEADERS = ["S.No", "Particulars", "Qty", "Rate", "Amount"];
  const ALIGNS = ["center", "left", "center", "right", "right"];

  // ~13 roomy rows fill one A5 page at 11pt with 27pt row height.
  const chunkSize = 13;
  const chunks = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  if (chunks.length === 0) chunks.push([]);

  return (
    <Document>
      {chunks.map((pageItems, pageIndex) => {
        const isLastPage = pageIndex === chunks.length - 1;
        const startIdx = pageIndex * chunkSize;
        return (
          <Page key={pageIndex} size="A5" orientation="portrait" style={S.page}>
            <View style={S.outer}>
              {/* Title */}
              <View style={S.titleSection}>
                <Text style={S.titleText}>ESTIMATE</Text>
                <Text style={S.titleSub}>{inv.invoiceNumber || "ESTIMATE"}</Text>
              </View>

              {/* Date + Customer row */}
              <View style={S.metaRow}>
                <View style={S.metaCol}>
                  <Text style={S.sectionLabel}>Customer</Text>
                  <Text style={S.custName}>{customer.name || "-"}</Text>
                  {customer.phone ? (
                    <Text style={S.custDetail}>Ph: {customer.phone}</Text>
                  ) : null}
                  {custAddrStr ? (
                    <Text style={S.custDetail}>{custAddrStr}</Text>
                  ) : null}
                </View>
                <View style={S.metaRight}>
                  <Text style={S.metaLabel}>Date</Text>
                  <Text style={S.metaValue}>{invoiceDate}</Text>
                  {inv.invoiceNumber ? (
                    <>
                      <Text style={[S.metaLabel, { marginTop: 6 }]}>Estimate No</Text>
                      <Text style={S.metaValue}>{inv.invoiceNumber}</Text>
                    </>
                  ) : null}
                </View>
              </View>

              {/* Items table header */}
              <View style={S.tableHeader}>
                {HEADERS.map((h, i) => (
                  <View
                    key={i}
                    style={[
                      S.thCell,
                      { width: COLS[i] },
                      i === HEADERS.length - 1 ? { borderRightWidth: 0 } : {},
                    ]}
                  >
                    <Text style={{ textAlign: ALIGNS[i] }}>{h}</Text>
                  </View>
                ))}
              </View>

              {/* Items */}
              {pageItems.map((item, idx) => {
                const globalIdx = startIdx + idx;
                const lineTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
                return (
                  <View key={idx} style={{ flexDirection: "row" }}>
                    <View style={[S.tdCell, { width: COLS[0] }]}>
                      <Text style={{ textAlign: "center" }}>{globalIdx + 1}</Text>
                    </View>
                    <View style={[S.tdCell, { width: COLS[1] }]}>
                      <Text style={{ textAlign: "left" }}>{item.name || ""}</Text>
                    </View>
                    <View style={[S.tdCell, { width: COLS[2] }]}>
                      <Text style={{ textAlign: "center" }}>{item.quantity}</Text>
                    </View>
                    <View style={[S.tdCell, { width: COLS[3] }]}>
                      <Text style={{ textAlign: "right" }}>{fmt(item.unitPrice)}</Text>
                    </View>
                    <View style={[S.tdCellLast, { width: COLS[4] }]}>
                      <Text style={{ textAlign: "right" }}>{fmt(lineTotal)}</Text>
                    </View>
                  </View>
                );
              })}

              {/* Fill remaining space so the total block sits at the bottom
                  on the last page without shrinking fonts */}
              {isLastPage && pageItems.length < chunkSize ? (
                <View style={{ flex: 1, minHeight: (chunkSize - pageItems.length) * 12 }} />
              ) : !isLastPage ? (
                <View style={{ flex: 1 }} />
              ) : null}

              {/* Grand total — only on last page */}
              {isLastPage ? (
                <View>
                  <View style={{ flexDirection: "row", paddingVertical: 6, paddingHorizontal: 6 }}>
                    <Text style={{ flex: 1, fontSize: 10.5, textAlign: "right", paddingRight: 10 }}>
                      Total Qty: {totalQty}
                    </Text>
                    <Text style={{ width: 95 }} />
                  </View>
                  <View style={S.totalRow}>
                    <Text style={S.totalLabel}>Grand Total</Text>
                    <Text style={S.totalValue}>Rs. {fmt(grandTotal)}</Text>
                  </View>
                </View>
              ) : (
                <View style={{ flex: 1 }} />
              )}

              {/* Footer */}
              <View style={S.footer}>
                <Text style={S.footerText}>This is a computer generated estimate</Text>
                <Text style={[S.footerText, { marginTop: 2 }]}>
                  Print on A5 • 100% scale
                </Text>
              </View>

              {/* Page number */}
              {chunks.length > 1 ? (
                <View style={{ paddingVertical: 3, alignItems: "center" }}>
                  <Text style={{ fontSize: 8, color: "#999999" }}>
                    Page {pageIndex + 1} of {chunks.length}
                  </Text>
                </View>
              ) : null}
            </View>
          </Page>
        );
      })}
    </Document>
  );
}
