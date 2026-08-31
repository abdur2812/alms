import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";

// ─── Styles — simple, no colors, no logos ───────────────────────────────────
const S = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    paddingTop: 24,
    paddingBottom: 24,
    paddingLeft: 24,
    paddingRight: 24,
    backgroundColor: "#ffffff",
  },
  outer: {
    borderWidth: 1.5,
    borderColor: "#000000",
    flex: 1,
    width: "100%",
    height: "100%",
  },
  divider: {
    borderTopWidth: 0.5,
    borderTopColor: "#000000",
  },
  // Title
  titleSection: {
    paddingVertical: 6,
    paddingHorizontal: 9,
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderBottomWidth: 0.5,
    borderBottomColor: "#000000",
  },
  titleText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    letterSpacing: 1,
    color: "#000000",
    textAlign: "center",
  },
  vendorBox: {
    marginHorizontal: 9,
    marginTop: 6,
    marginBottom: 4,
    paddingVertical: 2,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  vendorName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    color: "#000000",
    textAlign: "center",
  },
  vendorSub: {
    fontSize: 7,
    color: "#000000",
    textAlign: "center",
    marginTop: 1,
  },
  // Meta — single divider below, no double line
  metaSection: {
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderBottomWidth: 0.5,
    borderBottomColor: "#000000",
  },
  metaRow: { flexDirection: "row", marginBottom: 2 },
  metaLabel: {
    fontSize: 8,
    color: "#000000",
    width: 80,
    fontFamily: "Helvetica-Bold",
  },
  metaValue: { fontSize: 8, flex: 1, color: "#000000" },
  // Table — no extra top border (meta bottom is the divider)
  tableOuter: {
    borderTopWidth: 0,
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
    backgroundColor: "#ffffff",
  },
  thCell: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    paddingVertical: 4,
    paddingHorizontal: 3,
    borderRightWidth: 0.5,
    borderRightColor: "#000000",
    borderBottomWidth: 0.5,
    borderBottomColor: "#000000",
    color: "#000000",
    backgroundColor: "#ffffff",
  },
  thLast: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    paddingVertical: 4,
    paddingHorizontal: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: "#000000",
    color: "#000000",
    backgroundColor: "#ffffff",
  },
  tdCell: {
    fontSize: 7.5,
    paddingVertical: 4,
    paddingHorizontal: 3,
    borderRightWidth: 0.5,
    borderRightColor: "#000000",
    borderBottomWidth: 0.5,
    borderBottomColor: "#000000",
    color: "#000000",
  },
  tdLast: {
    fontSize: 7.5,
    paddingVertical: 4,
    paddingHorizontal: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: "#000000",
    color: "#000000",
  },
  // Summary — no extra top border (table bottom is divider), single line above Total only
  summarySection: {
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderTopWidth: 0,
  },
  summaryTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    marginBottom: 4,
    color: "#000000",
  },
  summaryRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#000000",
    paddingVertical: 2,
  },
  summaryLabel: {
    flex: 1,
    fontSize: 8,
    paddingRight: 8,
    color: "#000000",
  },
  summaryCount: {
    fontSize: 8,
    textAlign: "right",
    paddingRight: 8,
    color: "#000000",
    width: 40,
  },
  summaryValue: {
    fontSize: 8,
    textAlign: "right",
    paddingRight: 6,
    color: "#000000",
    fontFamily: "Helvetica-Bold",
    width: 90,
  },
  grandTotalRow: {
    flexDirection: "row",
    borderTopWidth: 0.5,
    borderTopColor: "#000000",
    paddingVertical: 3,
    marginTop: 4,
  },
  grandTotalLabel: {
    flex: 1,
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: "#000000",
    paddingRight: 8,
  },
  grandTotalValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    textAlign: "right",
    paddingRight: 6,
    color: "#000000",
    width: 90,
  },
  spacer: { flexGrow: 1 },
  footer: {
    borderTopWidth: 1,
    borderTopColor: "#000000",
    paddingVertical: 5,
    paddingHorizontal: 9,
    flexDirection: "row",
    alignItems: "center",
  },
  footerText: {
    fontSize: 7,
    color: "#000000",
    textAlign: "center",
  },
  footerPageText: {
    fontSize: 7,
    color: "#000000",
    fontFamily: "Helvetica-Bold",
  },
});

function fmt(n) {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n || 0);
}

function MetaRow({ label, value }) {
  return (
    <View style={S.metaRow}>
      <Text style={S.metaLabel}>{label}</Text>
      <Text style={S.metaValue}>{value}</Text>
    </View>
  );
}

function chunkRows(items, chunkSize) {
  if (!items.length) return [[]];
  const chunks = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
}

// Order: S.No, Date, Invoice No, Amount, Cheque Details (wider), Cheque Amount, Status, Passed Date
// Shrunk Date/Invoice/Passed to expand Cheque Details per request
const COL_WIDTHS = ["6%", "9%", "12%", "12%", "29%", "11%", "10%", "11%"];

function TableCell({ children, width, align, isLast, isHeader, bg }) {
  const base = isHeader ? (isLast ? S.thLast : S.thCell) : isLast ? S.tdLast : S.tdCell;
  return (
    <View style={[base, { width }, bg ? { backgroundColor: bg } : {}]}>
      <Text style={{ textAlign: align || "left" }}>{children}</Text>
    </View>
  );
}

function PurchaseRow({ purchase, idx }) {
  const date = purchase.date
    ? new Date(purchase.date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      })
    : "-";
  const passed = purchase.passedDate
    ? new Date(purchase.passedDate).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      })
    : "-";
  const cells = [
    [String(idx + 1), "center"],
    [date, "center"],
    [purchase.invoiceNumber || "-", "center"],
    [fmt(purchase.amount), "right"],
    [purchase.chequeDetails || "-", "left"],
    [purchase.chequeAmount != null ? fmt(purchase.chequeAmount) : "-", "right"],
    [purchase.chequeStatus || "-", "center"],
    [passed, "center"],
  ];
  return (
    <View style={idx % 2 === 1 ? S.tableRowAlt : S.tableRow}>
      {cells.map(([text, align], i) => (
        <TableCell key={i} width={COL_WIDTHS[i]} align={align} isLast={i === cells.length - 1}>
          {text}
        </TableCell>
      ))}
    </View>
  );
}

export default function PurchaseReportDocument({ report }) {
  const data = report || {};
  const rows = data.purchases || [];
  const total = data.total || { count: 0, amount: 0 };
  const cleared = data.cleared || { count: 0, amount: 0 };
  const pending = data.pending || { count: 0, amount: 0 };
  const bounced = data.bounced || { count: 0, amount: 0 };
  const vendor = data.vendor || null;

  const fmtDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : "—";

  const periodLabel = (() => {
    if (data.month) {
      const [y, m] = data.month.split("-").map(Number);
      if (m) return new Date(Date.UTC(y || new Date().getFullYear(), (m || 1) - 1, 1)).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    }
    if (data.startDate || data.endDate) {
      const s = data.startDate ? fmtDate(data.startDate) : "—";
      const e = data.endDate ? fmtDate(data.endDate) : "—";
      return `${s}  to  ${e}`;
    }
    return "—";
  })();

  const generatedOn = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const rowChunks = chunkRows(rows, 20);

  const HEADER_LABELS = ["S.No", "Date", "Invoice No", "Amount", "Cheque Details", "Cheque Amt", "Status", "Passed Date"];
  const HEADER_ALIGNS = ["center", "center", "center", "right", "left", "right", "center", "center"];

  return (
    <Document>
      {rowChunks.map((pageRows, pageIndex) => {
        const isLastPage = pageIndex === rowChunks.length - 1;
        return (
          <Page key={pageIndex} size="A4" style={S.page}>
            <View style={S.outer}>
              {/* Title */}
              <View style={S.titleSection}>
                <Text style={S.titleText}>PURCHASE REPORT</Text>
              </View>

              {/* Vendor name — bordered, no shop info */}
              <View style={S.vendorBox}>
                <Text style={S.vendorName}>{vendor ? vendor.name : "All Vendors"}</Text>
                {vendor?.gstNumber ? <Text style={S.vendorSub}>GSTIN: {vendor.gstNumber}</Text> : null}
              </View>

              {/* Meta — simple, no shop */}
              <View style={S.metaSection}>
                <MetaRow label="Period" value={periodLabel} />
                <MetaRow label="Generated On" value={generatedOn} />
                <MetaRow label="Total Entries" value={String(total.count)} />
              </View>

              {/* Table */}
              <View style={S.tableOuter}>
                <View style={S.tableHeader}>
                  {HEADER_LABELS.map((label, i) => (
                    <TableCell key={i} width={COL_WIDTHS[i]} align={HEADER_ALIGNS[i]} isLast={i === HEADER_LABELS.length - 1} isHeader>
                      {label}
                    </TableCell>
                  ))}
                </View>
                {pageRows.map((purchase, idx) => (
                  <PurchaseRow key={purchase._id || idx} purchase={purchase} idx={pageIndex * 20 + idx} />
                ))}
                {pageRows.length === 0 && (
                  <View style={S.tableRow}>
                    <View style={[S.tdLast, { width: "100%", paddingVertical: 12 }]}>
                      <Text style={{ textAlign: "center", color: "#6b7280" }}>No purchases in this period</Text>
                    </View>
                  </View>
                )}
              </View>

              {isLastPage ? (
                <>
                  {/* Summary — simple, no colors */}
                  <View style={S.summarySection}>
                    <Text style={S.summaryTitle}>Summary</Text>
                    <View style={S.summaryRow}>
                      <Text style={S.summaryLabel}>Cleared</Text>
                      <Text style={S.summaryCount}>({cleared.count})</Text>
                      <Text style={S.summaryValue}>{fmt(cleared.amount)}</Text>
                    </View>
                    <View style={S.summaryRow}>
                      <Text style={S.summaryLabel}>Pending</Text>
                      <Text style={S.summaryCount}>({pending.count})</Text>
                      <Text style={S.summaryValue}>{fmt(pending.amount)}</Text>
                    </View>
                    <View style={S.summaryRow}>
                      <Text style={S.summaryLabel}>Bounced</Text>
                      <Text style={S.summaryCount}>({bounced.count})</Text>
                      <Text style={S.summaryValue}>{fmt(bounced.amount)}</Text>
                    </View>
                    <View style={S.grandTotalRow}>
                      <Text style={S.grandTotalLabel}>Total</Text>
                      <Text style={S.summaryCount}>({total.count})</Text>
                      <Text style={S.grandTotalValue}>{fmt(Math.round(total.amount))}</Text>
                    </View>
                  </View>
                  <View style={S.spacer} />
                </>
              ) : (
                <View style={S.spacer} />
              )}

              {/* Footer — simple */}
              <View style={S.footer}>
                <View style={{ width: "30%" }} />
                <View style={{ flex: 1, alignItems: "center" }}>
                  <Text style={S.footerText}>Computer Generated Report</Text>
                </View>
                <Text style={[S.footerPageText, { width: "30%", textAlign: "right" }]} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
              </View>
            </View>
          </Page>
        );
      })}
    </Document>
  );
}
