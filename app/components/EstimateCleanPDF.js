import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";

// Clean Estimate PDF — A5, no shop details, no colours, no GST
// Only: Date, Customer, Items (S.No | Particulars | Qty | Rate | Amount), Grand Total
const S = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    paddingTop: 18,
    paddingBottom: 18,
    paddingLeft: 18,
    paddingRight: 18,
    backgroundColor: "#ffffff",
  },
  outer: {
    borderWidth: 0.7,
    borderColor: "#000000",
    flex: 1,
    width: "100%",
  },
  titleSection: {
    paddingVertical: 8,
    alignItems: "center",
    borderBottomWidth: 0.7,
    borderBottomColor: "#000000",
  },
  titleText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    letterSpacing: 1,
    textAlign: "center",
  },
  titleSub: {
    fontSize: 7,
    color: "#333333",
    marginTop: 2,
    textAlign: "center",
  },
  metaRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 0.7,
    borderBottomColor: "#000000",
  },
  metaCol: { flex: 1 },
  metaLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#000000",
    marginBottom: 1,
  },
  metaValue: {
    fontSize: 8,
    color: "#000000",
  },
  metaRight: {
    width: 140,
    borderLeftWidth: 0.7,
    borderLeftColor: "#000000",
    paddingLeft: 8,
    justifyContent: "center",
  },
  customerSection: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 0.7,
    borderBottomColor: "#000000",
  },
  sectionLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    marginBottom: 2,
  },
  custName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    marginBottom: 1,
  },
  custDetail: { fontSize: 7.5, color: "#000000", marginBottom: 1 },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 0.7,
    borderBottomColor: "#000000",
    backgroundColor: "#ffffff",
  },
  thCell: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderRightWidth: 0.5,
    borderRightColor: "#000000",
    textAlign: "center",
  },
  tdCell: {
    fontSize: 7.5,
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderRightWidth: 0.5,
    borderRightColor: "#000000",
    borderBottomWidth: 0.3,
    borderBottomColor: "#999999",
  },
  tdCellLast: {
    fontSize: 7.5,
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderBottomWidth: 0.3,
    borderBottomColor: "#999999",
  },
  totalRow: {
    flexDirection: "row",
    borderTopWidth: 0.7,
    borderTopColor: "#000000",
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  totalLabel: {
    flex: 1,
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    textAlign: "right",
    paddingRight: 8,
  },
  totalValue: {
    width: 70,
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    textAlign: "right",
  },
  footer: {
    paddingVertical: 6,
    alignItems: "center",
    borderTopWidth: 0.5,
    borderTopColor: "#000000",
  },
  footerText: { fontSize: 6, color: "#666666", textAlign: "center" },
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

  const custAddrStr = [
    permAddr.companyAddress,
    [permAddr.city, permAddr.postalCode].filter(Boolean).join(" "),
    permAddr.state,
  ]
    .filter(Boolean)
    .join(", ");

  // Column widths for A5 — totals to 100%
  // S.No 7% | Particulars 53% | Qty 12% | Rate 14% | Amount 14%
  const COLS = ["7%", "53%", "12%", "14%", "14%"];
  const HEADERS = ["S.No", "Particulars", "Qty", "Rate", "Amount"];
  const ALIGNS = ["center", "left", "center", "right", "right"];

  // Chunk for pagination — ~25 rows per A5 page
  const chunkSize = 22;
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
          <Page key={pageIndex} size="A5" style={S.page}>
            <View style={S.outer}>
              {/* Title */}
              <View style={S.titleSection}>
                <Text style={S.titleText}>ESTIMATE</Text>
                <Text style={S.titleSub}>{inv.invoiceNumber || "ESTIMATE"}</Text>
              </View>

              {/* Date + Customer row */}
              <View style={S.metaRow}>
                <View style={S.metaCol}>
                  <Text style={S.metaLabel}>Customer</Text>
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
                      <Text style={[S.metaLabel, { marginTop: 4 }]}>Estimate No</Text>
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

              {/* Fill empty rows to keep border consistent */}
              {isLastPage && pageItems.length < chunkSize
                ? Array.from({ length: chunkSize - pageItems.length }).map((_, i) => (
                    <View key={`empty-${i}`} style={{ flexDirection: "row", height: 14 }}>
                      {COLS.map((w, ci) => (
                        <View
                          key={ci}
                          style={[
                            ci === COLS.length - 1 ? S.tdCellLast : S.tdCell,
                            { width: w, borderBottomWidth: 0.3 },
                          ]}
                        >
                          <Text> </Text>
                        </View>
                      ))}
                    </View>
                  ))
                : null}

              {/* Grand total — only on last page */}
              {isLastPage ? (
                <View style={S.totalRow}>
                  <Text style={S.totalLabel}>Grand Total</Text>
                  <Text style={S.totalValue}>Rs. {fmt(grandTotal)}</Text>
                </View>
              ) : (
                <View style={{ flex: 1 }} />
              )}

              {/* Footer */}
              <View style={S.footer}>
                <Text style={S.footerText}>This is a computer generated estimate</Text>
              </View>

              {/* Page number */}
              <View style={{ paddingVertical: 2, alignItems: "center" }}>
                <Text style={{ fontSize: 6, color: "#999999" }}>
                  Page {pageIndex + 1} of {chunks.length}
                </Text>
              </View>
            </View>
          </Page>
        );
      })}
    </Document>
  );
}
