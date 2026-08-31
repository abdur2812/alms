import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";

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
    borderWidth: 1,
    borderColor: "#000000",
    flex: 1,
    width: "100%",
  },
  shopHeader: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: "center",
    borderBottomWidth: 0.5,
    borderBottomColor: "#000000",
  },
  shopName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
    letterSpacing: 1,
    textAlign: "center",
  },
  titleSection: {
    paddingVertical: 6,
    paddingHorizontal: 9,
    alignItems: "center",
    borderBottomWidth: 0.5,
    borderBottomColor: "#000000",
  },
  titleText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    textAlign: "center",
  },
  metaSection: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#000000",
  },
  metaRow: { flexDirection: "row", marginBottom: 2 },
  metaLabel: {
    fontSize: 8,
    width: 110,
    fontFamily: "Helvetica-Bold",
  },
  metaValue: { fontSize: 8, flex: 1 },
  section: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#000000",
  },
  sectionTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
    borderBottomWidth: 0.25,
    borderBottomColor: "#cccccc",
  },
  rowLabel: { fontSize: 8, flex: 1 },
  rowValue: { fontSize: 8, fontFamily: "Helvetica-Bold", width: 110, textAlign: "right" },
  rowQty: { fontSize: 7, width: 80, textAlign: "right", color: "#555555" },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#000000",
    paddingVertical: 3,
    backgroundColor: "#f5f5f5",
  },
  th: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    paddingHorizontal: 4,
  },
  td: {
    fontSize: 7.5,
    paddingHorizontal: 4,
    paddingVertical: 3,
    borderBottomWidth: 0.25,
    borderBottomColor: "#e5e5e5",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: "#000000",
    paddingVertical: 4,
    marginTop: 4,
  },
  totalLabel: { fontFamily: "Helvetica-Bold", fontSize: 8, flex: 1 },
  totalValue: { fontFamily: "Helvetica-Bold", fontSize: 8, width: 110, textAlign: "right" },
  footer: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: "#000000",
  },
  footerText: { fontSize: 7, color: "#666666" },
});

function fmt(n) {
  return new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);
}
function fmtInt(n) {
  return new Intl.NumberFormat("en-IN").format(n || 0);
}

export default function AccountsReportPDF({ report }) {
  const data = report || {};
  const monthLabel = (() => {
    if (data.month && /^\d{4}-\d{2}$/.test(data.month)) {
      const [y, m] = data.month.split("-").map(Number);
      return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    }
    if (data.range) return `${data.range.start} to ${data.range.end}`;
    return "—";
  })();

  const generatedOn = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });

  return (
    <Document>
      <Page size="A4" style={S.page}>
        <View style={S.outer}>
          {/* Shop name only - simple */}
          <View style={S.shopHeader}>
            <Text style={S.shopName}>AL M.S. TRADERS</Text>
          </View>

          <View style={S.titleSection}>
            <Text style={S.titleText}>ACCOUNTS REPORT</Text>
          </View>

          <View style={S.metaSection}>
            <View style={S.metaRow}>
              <Text style={S.metaLabel}>Month</Text>
              <Text style={S.metaValue}>{monthLabel}</Text>
            </View>
            <View style={S.metaRow}>
              <Text style={S.metaLabel}>Period</Text>
              <Text style={S.metaValue}>{data.range ? `${data.range.start} to ${data.range.end}` : "—"}</Text>
            </View>
            <View style={S.metaRow}>
              <Text style={S.metaLabel}>Generated On</Text>
              <Text style={S.metaValue}>{generatedOn}</Text>
            </View>
          </View>

          {/* Opening / Closing / Purchases / Sales - stock valued as qty * price at period boundaries */}
          <View style={S.section}>
            <Text style={S.sectionTitle}>Stock & Sales Summary</Text>
            <View style={S.row}>
              <Text style={S.rowLabel}>Opening Stock (qty at start × price)</Text>
              <Text style={S.rowQty}>{data.openingStock?.qty != null ? `${fmtInt(data.openingStock.qty)} units` : "—"}</Text>
              <Text style={S.rowValue}>Rs. {fmt(data.openingStock?.value)}</Text>
            </View>
            <View style={S.row}>
              <Text style={S.rowLabel}>Closing Stock (qty at end × price)</Text>
              <Text style={S.rowQty}>{data.closingStock?.qty != null ? `${fmtInt(data.closingStock.qty)} units` : "—"}</Text>
              <Text style={S.rowValue}>{data.closingStock?.value != null ? `Rs. ${fmt(data.closingStock.value)}` : "Not yet available"}</Text>
            </View>
            <View style={S.row}>
              <Text style={S.rowLabel}>Purchases ({data.purchases?.count || 0} bills)</Text>
              <Text style={S.rowQty}></Text>
              <Text style={S.rowValue}>Rs. {fmt(data.purchases?.total)}</Text>
            </View>
            <View style={[S.row, { borderBottomWidth: 0 }]}>
              <Text style={S.rowLabel}>Sales ({data.sales?.count || 0} invoices)</Text>
              <Text style={S.rowQty}></Text>
              <Text style={S.rowValue}>Rs. {fmt(data.sales?.total)}</Text>
            </View>
          </View>

          {/* Salaries - single line — daily only */}
          <View style={S.section}>
            <Text style={S.sectionTitle}>Salaries & Staff Expenses</Text>
            <View style={S.row}>
              <Text style={S.rowLabel}>Staff Salaries ({data.salaries?.count || 0} daily settlements)</Text>
              <Text style={S.rowValue}>Rs. {fmt(data.salaries?.total)}</Text>
            </View>
          </View>

          {/* Administrative Expenses - by category */}
          <View style={S.section}>
            <Text style={S.sectionTitle}>Administrative Expenses</Text>
            <View style={S.tableHeader}>
              <Text style={[S.th, { flex: 1, textAlign: "left" }]}>Category</Text>
              <Text style={[S.th, { width: 60, textAlign: "right" }]}>Entries</Text>
              <Text style={[S.th, { width: 110, textAlign: "right" }]}>Total Amount</Text>
            </View>
            {(data.expenses?.byCategory || []).length === 0 ? (
              <View style={{ paddingVertical: 8, alignItems: "center" }}>
                <Text style={{ fontSize: 7.5, color: "#6b7280" }}>No administrative expenses for this month</Text>
              </View>
            ) : (
              (data.expenses.byCategory || []).map((c, i) => (
                <View key={i} style={{ flexDirection: "row", paddingVertical: 3, borderBottomWidth: 0.25, borderBottomColor: "#e5e5e5" }}>
                  <Text style={[S.td, { flex: 1 }]}>{c.category}</Text>
                  <Text style={[S.td, { width: 60, textAlign: "right" }]}>{c.count}</Text>
                  <Text style={[S.td, { width: 110, textAlign: "right", fontFamily: "Helvetica-Bold" }]}>Rs. {fmt(c.total)}</Text>
                </View>
              ))
            )}
            <View style={S.totalRow}>
              <Text style={S.totalLabel}>Total Administrative Expenses ({data.expenses?.count || 0} entries)</Text>
              <Text style={S.totalValue}>Rs. {fmt(data.expenses?.total)}</Text>
            </View>
          </View>

          <View style={{ flex: 1 }} />

          <View style={S.footer}>
            <Text style={S.footerText}>Computer Generated Report</Text>
            <Text style={S.footerText}>{generatedOn}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
