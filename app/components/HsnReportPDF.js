import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import businessConfig from "@/lib/businessConfig";

const S = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    paddingTop: 20,
    paddingBottom: 20,
    paddingLeft: 20,
    paddingRight: 20,
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
  shopTagline: {
    fontSize: 7,
    color: "#333333",
    textAlign: "center",
    marginTop: 2,
  },
  shopMeta: {
    fontSize: 7,
    color: "#555555",
    textAlign: "center",
    marginTop: 1,
  },
  titleSection: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: "center",
    borderBottomWidth: 0.5,
    borderBottomColor: "#000000",
    backgroundColor: "#f9fafb",
  },
  titleText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    textAlign: "center",
  },
  subtitleText: {
    fontSize: 7,
    color: "#6b7280",
    textAlign: "center",
    marginTop: 2,
  },
  metaSection: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#000000",
    backgroundColor: "#ffffff",
  },
  metaRow: { flexDirection: "row", marginBottom: 2 },
  metaLabel: { fontSize: 8, width: 90, fontFamily: "Helvetica-Bold" },
  metaValue: { fontSize: 8, flex: 1 },
  summarySection: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#000000",
    backgroundColor: "#f9fafb",
  },
  summaryTitle: { fontFamily: "Helvetica-Bold", fontSize: 8, marginBottom: 3 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  summaryLabel: { fontSize: 7.5, color: "#374151" },
  summaryValue: { fontSize: 7.5, fontFamily: "Helvetica-Bold" },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#000000",
    paddingVertical: 4,
    backgroundColor: "#f3f4f6",
  },
  th: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    paddingHorizontal: 3,
    textAlign: "center",
  },
  td: {
    fontSize: 7,
    paddingHorizontal: 3,
    paddingVertical: 3,
    borderBottomWidth: 0.25,
    borderBottomColor: "#e5e7eb",
    textAlign: "right",
  },
  tdLeft: {
    fontSize: 7,
    paddingHorizontal: 3,
    paddingVertical: 3,
    borderBottomWidth: 0.25,
    borderBottomColor: "#e5e7eb",
    textAlign: "left",
  },
  tdCenter: {
    fontSize: 7,
    paddingHorizontal: 3,
    paddingVertical: 3,
    borderBottomWidth: 0.25,
    borderBottomColor: "#e5e7eb",
    textAlign: "center",
  },
  totalRow: {
    flexDirection: "row",
    borderTopWidth: 0.5,
    borderTopColor: "#000000",
    backgroundColor: "#f9fafb",
    paddingVertical: 4,
  },
  footer: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: "#000000",
  },
  footerText: { fontSize: 7, color: "#6b7280" },
});

function fmt(n) {
  return new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);
}
function fmtInt(n) {
  return new Intl.NumberFormat("en-IN").format(n || 0);
}

export default function HsnReportPDF({ data, range }) {
  const rows = data?.rows || [];
  const totalQty = data?.total || 0;
  const totalBase = data?.totalBase ?? 0;
  const totalGst = data?.totalGst ?? 0;
  const totalValue = data?.totalValue ?? 0;
  const count = data?.count || rows.length;

  const rangeLabel = (() => {
    if (range?.startDate && range?.endDate) {
      const s = range.startDate instanceof Date ? range.startDate : new Date(range.startDate);
      const e = range.endDate instanceof Date ? range.endDate : new Date(range.endDate);
      const sStr = isNaN(s.getTime()) ? "" : s.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
      const eStr = isNaN(e.getTime()) ? "" : e.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
      if (sStr && eStr) return `${sStr} — ${eStr}`;
    }
    return "All time";
  })();

  const generatedOn = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const bd = businessConfig.business_details;

  return (
    <Document>
      <Page size="A4" style={S.page}>
        <View style={S.outer}>
          <View style={S.shopHeader}>
            <Text style={S.shopName}>{bd.business_name}</Text>
            <Text style={S.shopTagline}>{bd.tagline}</Text>
            <Text style={S.shopMeta}>
              {`${bd.address.door_no_old}/${bd.address.door_no_new}, ${bd.address.street}, ${bd.address.area}, ${bd.address.district} - ${bd.address.pincode}`} • GSTIN: {bd.gst_number}
            </Text>
            <Text style={S.shopMeta}>Ph: {bd.phone_numbers.join(" / ")}</Text>
          </View>

          <View style={S.titleSection}>
            <Text style={S.titleText}>HSN CODE WISE SALES REPORT</Text>
            <Text style={S.subtitleText}>GST-inclusive prices split: Base = Inclusive / 1.18, GST = Inclusive − Base</Text>
          </View>

          <View style={S.metaSection}>
            <View style={S.metaRow}>
              <Text style={S.metaLabel}>Date Range</Text>
              <Text style={S.metaValue}>{rangeLabel}</Text>
            </View>
            <View style={S.metaRow}>
              <Text style={S.metaLabel}>Generated On</Text>
              <Text style={S.metaValue}>{generatedOn}</Text>
            </View>
            <View style={S.metaRow}>
              <Text style={S.metaLabel}>HSN Codes</Text>
              <Text style={S.metaValue}>{count} codes • {fmtInt(totalQty)} units</Text>
            </View>
          </View>

          <View style={S.summarySection}>
            <Text style={S.summaryTitle}>Summary</Text>
            <View style={S.summaryRow}>
              <Text style={S.summaryLabel}>Total Quantity Sold</Text>
              <Text style={S.summaryValue}>{fmtInt(totalQty)}</Text>
            </View>
            <View style={S.summaryRow}>
              <Text style={S.summaryLabel}>Value Before GST (Base)</Text>
              <Text style={S.summaryValue}>Rs. {fmt(totalBase)}</Text>
            </View>
            <View style={S.summaryRow}>
              <Text style={S.summaryLabel}>Total GST Amount</Text>
              <Text style={S.summaryValue}>Rs. {fmt(totalGst)}</Text>
            </View>
            <View style={S.summaryRow}>
              <Text style={S.summaryLabel}>Total Value (Incl. GST)</Text>
              <Text style={S.summaryValue}>Rs. {fmt(totalValue)}</Text>
            </View>
          </View>

          <View style={S.tableHeader}>
            <Text style={[S.th, { width: 30, textAlign: "center" }]}>S.No</Text>
            <Text style={[S.th, { flex: 1, textAlign: "left" }]}>HSN Code</Text>
            <Text style={[S.th, { width: 60, textAlign: "right" }]}>Qty</Text>
            <Text style={[S.th, { width: 90, textAlign: "right" }]}>Before GST</Text>
            <Text style={[S.th, { width: 90, textAlign: "right" }]}>GST Amt</Text>
            <Text style={[S.th, { width: 95, textAlign: "right" }]}>Total (Incl)</Text>
          </View>

          {rows.length === 0 ? (
            <View style={{ paddingVertical: 12, alignItems: "center" }}>
              <Text style={{ fontSize: 8, color: "#6b7280" }}>No HSN data for this period</Text>
            </View>
          ) : (
            rows.map((r, i) => {
              const totalPrice = r.totalPrice ?? 0;
              const totalBaseRow = r.totalBase ?? totalPrice / 1.18;
              const totalGstRow = r.totalGst ?? totalPrice - totalBaseRow;
              return (
                <View key={r.hsnCode || i} style={{ flexDirection: "row" }}>
                  <Text style={[S.tdCenter, { width: 30 }]}>{i + 1}</Text>
                  <Text style={[S.tdLeft, { flex: 1, fontFamily: "Helvetica-Bold" }]}>{r.hsnCode}</Text>
                  <Text style={[S.td, { width: 60 }]}>{fmtInt(r.quantity)}</Text>
                  <Text style={[S.td, { width: 90 }]}>{fmt(totalBaseRow)}</Text>
                  <Text style={[S.td, { width: 90 }]}>{fmt(totalGstRow)}</Text>
                  <Text style={[S.td, { width: 95, fontFamily: "Helvetica-Bold" }]}>{fmt(totalPrice)}</Text>
                </View>
              );
            })
          )}

          <View style={S.totalRow}>
            <Text style={[S.th, { flex: 1, textAlign: "left", paddingHorizontal: 3 }]}>TOTAL</Text>
            <Text style={[S.th, { width: 60, textAlign: "right", paddingHorizontal: 3 }]}>{fmtInt(totalQty)}</Text>
            <Text style={[S.th, { width: 90, textAlign: "right", paddingHorizontal: 3 }]}>{fmt(totalBase)}</Text>
            <Text style={[S.th, { width: 90, textAlign: "right", paddingHorizontal: 3 }]}>{fmt(totalGst)}</Text>
            <Text style={[S.th, { width: 95, textAlign: "right", paddingHorizontal: 3 }]}>{fmt(totalValue)}</Text>
          </View>

          <View style={{ flex: 1 }} />

          <View style={S.footer}>
            <Text style={S.footerText}>Computer Generated Report • AL M.S. TRADERS</Text>
            <Text style={S.footerText}>{generatedOn}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
