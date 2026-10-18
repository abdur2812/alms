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
    fontSize: 8,
    color: "#000000",
    textAlign: "center",
    marginTop: 1,
  },
  pendingText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    textAlign: "center",
    marginBottom: 4,
    color: "#000000",
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

const COL_WIDTHS = ["8%", "18%", "34%", "16%", "24%"];
const HEADER_LABELS = ["S.No", "Date", "Bill Ref", "Type", "Amount"];
const HEADER_ALIGNS = ["center", "center", "center", "center", "right"];
const ROWS_PER_PAGE = 20;

function TableCell({ children, width, align, isLast, isHeader }) {
  const base = isHeader ? (isLast ? S.thLast : S.thCell) : isLast ? S.tdLast : S.tdCell;
  return (
    <View style={[base, { width }]}>
      <Text style={{ textAlign: align || "left" }}>{children}</Text>
    </View>
  );
}

function InvoiceRow({ invoice, idx }) {
  const date = invoice.date
    ? new Date(invoice.date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        timeZone: "Asia/Kolkata",
      })
    : "-";
  const cells = [
    [String(idx + 1), "center"],
    [date, "center"],
    [invoice.invoiceNumber || "-", "center"],
    [invoice.billType === "credit" ? "Credit" : "Cash", "center"],
    [fmt(invoice.amount), "right"],
  ];
  return (
    <View style={S.tableRow}>
      {cells.map(([text, align], i) => (
        <TableCell key={i} width={COL_WIDTHS[i]} align={align} isLast={i === cells.length - 1}>
          {text}
        </TableCell>
      ))}
    </View>
  );
}

export default function CustomerReportDocument({ report }) {
  const data = report || {};
  const rows = data.invoices || [];
  const total = data.total || { count: 0, amount: 0 };
  const cash = data.cash || { count: 0, amount: 0 };
  const credit = data.credit || { count: 0, amount: 0 };
  const customer = data.customer || null;

  const fmtDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          timeZone: "Asia/Kolkata",
        })
      : "—";

  const pendingLabel = (() => {
    if (data.startDate && data.endDate) return `Purchases ${fmtDate(data.startDate)} - ${fmtDate(data.endDate)}`;
    if (data.endDate) return `Purchases up to ${fmtDate(data.endDate)}`;
    if (data.startDate) return `Purchases from ${fmtDate(data.startDate)}`;
    return "Purchases";
  })();

  const generatedOn = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const rowChunks = chunkRows(rows, ROWS_PER_PAGE);

  return (
    <Document>
      {rowChunks.map((pageRows, pageIndex) => {
        const isLastPage = pageIndex === rowChunks.length - 1;
        return (
          <Page key={pageIndex} size="A4" style={S.page}>
            <View style={S.outer}>
              <View style={S.titleSection}>
                <Text style={S.titleText}>CUSTOMER REPORT</Text>
              </View>

              <View style={S.vendorBox}>
                <Text style={S.vendorName}>{customer ? customer.name : "Customer"}</Text>
                {customer?.address ? <Text style={S.vendorSub}>{customer.address}</Text> : null}
                {customer?.gstNumber ? <Text style={S.vendorSub}>GSTIN: {customer.gstNumber}</Text> : null}
              </View>

              <Text style={S.pendingText}>{pendingLabel}</Text>

              <View style={S.metaSection}>
                <MetaRow label="Generated On" value={generatedOn} />
                <MetaRow label="Total Bills" value={String(total.count)} />
              </View>

              <View style={S.tableOuter}>
                <View style={S.tableHeader}>
                  {HEADER_LABELS.map((label, i) => (
                    <TableCell key={i} width={COL_WIDTHS[i]} align={HEADER_ALIGNS[i]} isLast={i === HEADER_LABELS.length - 1} isHeader>
                      {label}
                    </TableCell>
                  ))}
                </View>
                {pageRows.map((invoice, idx) => (
                  <InvoiceRow key={invoice._id || idx} invoice={invoice} idx={pageIndex * ROWS_PER_PAGE + idx} />
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
                  <View style={S.summarySection}>
                    <Text style={S.summaryTitle}>Summary</Text>
                    <View style={S.summaryRow}>
                      <Text style={S.summaryLabel}>Cash (Paid)</Text>
                      <Text style={S.summaryCount}>({cash.count})</Text>
                      <Text style={S.summaryValue}>{fmt(cash.amount)}</Text>
                    </View>
                    <View style={[S.summaryRow, { borderBottomWidth: 0 }]}>
                      <Text style={S.summaryLabel}>Credit (Pending)</Text>
                      <Text style={S.summaryCount}>({credit.count})</Text>
                      <Text style={S.summaryValue}>{fmt(credit.amount)}</Text>
                    </View>
                    <View style={S.grandTotalRow}>
                      <Text style={S.grandTotalLabel}>Total Purchases</Text>
                      <Text style={S.summaryCount}>({total.count})</Text>
                      <Text style={S.grandTotalValue}>{fmt(total.amount)}</Text>
                    </View>
                  </View>
                  <View style={S.spacer} />
                </>
              ) : (
                <View style={S.spacer} />
              )}

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
