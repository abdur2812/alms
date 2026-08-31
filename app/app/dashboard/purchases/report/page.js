"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { FiDownload, FiShoppingBag, FiCheckCircle, FiClock, FiAlertCircle, FiFilter, FiCalendar } from "react-icons/fi";
import { PageHeader, Card, CardBody, Button, LoadingSpinner, Dropdown } from "@/components/UI";
import { purchasesAPI, vendorsAPI } from "@/lib/api";

const formatINR = (amount) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 }).format(amount);

const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const toDateInput = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

function StatTile({ icon: Icon, label, value, count, gradient }) {
  return (
    <div className="bg-white overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-5">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">{label}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
          <p className="mt-1 text-xs font-medium text-gray-500">{count} purchase{count === 1 ? "" : "s"}</p>
        </div>
        <div className={`shrink-0 bg-gradient-to-br ${gradient} rounded-2xl p-4 shadow-md`}>
          <Icon className="h-7 w-7 text-white" />
        </div>
      </div>
    </div>
  );
}

export default function PurchaseReportPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialVendorId = searchParams.get("vendorId") || "";

  const [vendorId, setVendorId] = useState(initialVendorId);
  const [vendors, setVendors] = useState([]);
  const [vendorsLoading, setVendorsLoading] = useState(true);
  const [vendorDetails, setVendorDetails] = useState(null);
  const [month, setMonth] = useState(currentMonth());
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [report, setReport] = useState(null);
  const [pdfComponents, setPdfComponents] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasGenerated, setHasGenerated] = useState(false);
  const pdfRef = useRef(null);

  // Load vendors for dropdown
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await vendorsAPI.getAll({ limit: 500 });
        if (!cancelled) setVendors(res.data.data || []);
      } catch (e) {
        // ignore
      } finally {
        if (!cancelled) setVendorsLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // Sync vendorId from query on mount (already set via initialVendorId) and when searchParams changes
  useEffect(() => {
    const qVendorId = searchParams.get("vendorId") || "";
    if (qVendorId !== vendorId) setVendorId(qVendorId);
  }, [searchParams]);

  // Fetch vendor details when vendorId changes
  useEffect(() => {
    if (!vendorId) {
      setVendorDetails(null);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const res = await vendorsAPI.getById(vendorId);
        if (!cancelled) setVendorDetails(res.data.data);
      } catch (e) {
        if (!cancelled) setVendorDetails(null);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [vendorId]);

  // Keep URL in sync when vendorId changes via dropdown
  const updateVendorIdInUrl = (newVendorId) => {
    setVendorId(newVendorId);
    setHasGenerated(false);
    setReport(null);
    const params = new URLSearchParams(searchParams.toString());
    if (newVendorId) params.set("vendorId", newVendorId);
    else params.delete("vendorId");
    router.push(`/dashboard/purchases/report?${params.toString()}`);
  };

  // Lazy-load the PDF renderer + report document (keeps bundle small).
  const ensurePdf = useCallback(async () => {
    if (pdfRef.current) return pdfRef.current;
    const [pdfLib, reportDoc] = await Promise.all([
      import("@react-pdf/renderer"),
      import("@/components/PurchaseReportPDF"),
    ]);
    const comps = { PDFViewer: pdfLib.PDFViewer, pdf: pdfLib.pdf, ReportDoc: reportDoc.default };
    pdfRef.current = comps;
    setPdfComponents(comps);
    return comps;
  }, []);

  const buildQuery = useCallback(() => {
    const q = {};
    if (vendorId) q.vendorId = vendorId;
    // Date-range takes precedence over month when either bound is present
    if (startDate || endDate) {
      if (startDate) q.startDate = startDate;
      if (endDate) q.endDate = endDate;
    } else if (month) {
      q.month = month;
    }
    return q;
  }, [vendorId, month, startDate, endDate]);

  const loadReport = useCallback(
    async (overrideQuery) => {
      setLoading(true);
      setError("");
      try {
        const q = overrideQuery || buildQuery();
        // Require at least vendorId? Allow all-vendors if no vendorId but need date filter
        if (!q.vendorId && !q.month && !q.startDate && !q.endDate) {
          setError("Please select a vendor or date filter");
          setLoading(false);
          return;
        }
        // If vendor selected but no date at all, default to current month
        if (q.vendorId && !q.month && !q.startDate && !q.endDate) {
          q.month = month || currentMonth();
        }
        if (!q.month && !q.startDate && !q.endDate) {
          setError("Please provide a month or start/end date");
          setLoading(false);
          return;
        }
        const res = await purchasesAPI.getMonthlyReport(q);
        setReport(res.data.data);
        await ensurePdf();
      } catch (e) {
        setError(e.response?.data?.message || "Failed to load purchase report");
      } finally {
        setLoading(false);
      }
    },
    [buildQuery, ensurePdf, month],
  );

  const handleApplyFilters = () => {
    setHasGenerated(true);
    loadReport();
  };

  const handleClearDates = () => {
    setStartDate("");
    setEndDate("");
    setMonth(currentMonth());
    setHasGenerated(false);
    setReport(null);
  };

  const handleDownload = async () => {
    if (!report) return;
    try {
      const comps = await ensurePdf();
      const blob = await comps.pdf(<comps.ReportDoc report={report} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // Filename: Purchase-Report-VendorName-YYYY-MM or date-range
      const vendorPart = report.vendor?.name ? `-${report.vendor.name.replace(/\s+/g, "_")}` : vendorDetails ? `-${vendorDetails.name.replace(/\s+/g, "_")}` : "";
      const datePart = report.month ? report.month : `${report.startDate ? new Date(report.startDate).toISOString().slice(0,10) : "all"}_to_${report.endDate ? new Date(report.endDate).toISOString().slice(0,10) : "now"}`;
      a.download = `Purchase-Report${vendorPart}-${datePart}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Download failed. Please try again.");
    }
  };

  const searchVendors = async (searchTerm) => {
    const response = await vendorsAPI.getAll({ limit: 50, search: searchTerm });
    const results = response.data.data.map((v) => ({
      value: v._id,
      label: `${v.name}${v.gstNumber ? ` • ${v.gstNumber}` : ""}`,
    }));
    return [{ value: "", label: "— All Vendors —" }, ...results];
  };

  const { PDFViewer, ReportDoc } = pdfComponents || {};
  const total = report?.total || { count: 0, amount: 0 };
  const cleared = report?.cleared || { count: 0, amount: 0 };
  const pending = report?.pending || { count: 0, amount: 0 };
  const bounced = report?.bounced || { count: 0, amount: 0 };

  const reportVendor = report?.vendor || vendorDetails;

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <PageHeader
        title="Purchase Report"
        subtitle={reportVendor ? `Vendor: ${reportVendor.name} — ${reportVendor.gstNumber || "No GST"}` : "Select a vendor and date range to generate report"}
        backLink="/dashboard/purchases"
        action={
          <div className="flex gap-2">
            <Button variant="primary" onClick={handleDownload} disabled={!report}>
              <FiDownload className="mr-2" />Download PDF
            </Button>
          </div>
        }
      />

      {error && (
        <div className="mb-6 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
          <span>{error}</span>
          <button onClick={() => setError("")} className="ml-auto text-red-400 hover:text-red-600 font-bold">✕</button>
        </div>
      )}

      {/* Filters — per vendor + date */}
      <Card className="mb-6 animate-fadeIn">
        <CardBody>
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-xl bg-indigo-100 flex items-center justify-center">
              <FiFilter className="h-4 w-4 text-indigo-600" />
            </div>
            <h3 className="text-sm font-bold text-gray-800">Filters</h3>
            <span className="text-xs text-gray-500">Vendor + date — report updates on Apply</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-1">
              <Dropdown
                label="Vendor"
                name="vendorId"
                value={vendorId}
                onChange={(e) => updateVendorIdInUrl(e.target.value)}
                placeholder="— All Vendors —"
                options={[
                  { value: "", label: "— All Vendors —" },
                  ...vendors.map((v) => ({ value: v._id, label: `${v.name}${v.gstNumber ? ` • ${v.gstNumber}` : ""}` })),
                ]}
                onSearch={searchVendors}
              />
              {vendorsLoading && <p className="text-xs text-gray-400 mt-1">Loading vendors...</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Month (shortcut)</label>
              <input
                type="month"
                value={month}
                onChange={(e) => {
                  setMonth(e.target.value);
                  if (e.target.value) {
                    setStartDate("");
                    setEndDate("");
                  }
                  setHasGenerated(false);
                  setReport(null);
                }}
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              />
              <p className="text-xs text-gray-400 mt-1">Cleared when range used</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (e.target.value) setMonth("");
                  setHasGenerated(false);
                  setReport(null);
                }}
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  if (e.target.value) setMonth("");
                  setHasGenerated(false);
                  setReport(null);
                }}
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="primary" onClick={handleApplyFilters}>
              <FiCalendar className="mr-2" />Generate Report
            </Button>
            <Button variant="secondary" onClick={handleClearDates}>
              Clear Dates
            </Button>
            {reportVendor && (
              <div className="ml-auto flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
                <div className="text-sm">
                  <p className="font-bold text-gray-900">{reportVendor.name}</p>
                  <p className="text-xs text-gray-600">{reportVendor.gstNumber || "No GST"} • {reportVendor.phone || "No phone"}</p>
                </div>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Vendor details card when filtered — only after Generate */}
      {hasGenerated && reportVendor && (
        <Card className="mb-6 animate-fadeIn">
          <CardBody>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Vendor</h4>
                <p className="text-base font-bold text-gray-900">{reportVendor.name}</p>
                <p className="text-sm text-gray-600">{reportVendor.phone || "—"}</p>
                {reportVendor.gstNumber && <p className="text-xs font-mono font-semibold text-gray-700 bg-gray-50 border border-gray-200 px-2 py-1 rounded-lg inline-block mt-1">{reportVendor.gstNumber}</p>}
                {reportVendor.address && <p className="text-sm text-gray-600 mt-1">{reportVendor.address}</p>}
              </div>
              <div className="lg:col-span-2">
                {(reportVendor.bankDetails?.bankName || reportVendor.bankDetails?.accountNumber) ? (
                  <>
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Bank Details</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {reportVendor.bankDetails.accountHolder && <div><p className="text-xs text-gray-500">A/C Holder</p><p className="font-semibold">{reportVendor.bankDetails.accountHolder}</p></div>}
                      {reportVendor.bankDetails.bankName && <div><p className="text-xs text-gray-500">Bank</p><p className="font-semibold">{reportVendor.bankDetails.bankName}{reportVendor.bankDetails.branchName ? ` • ${reportVendor.bankDetails.branchName}` : ""}</p></div>}
                      {reportVendor.bankDetails.accountNumber && <div><p className="text-xs text-gray-500">Account No</p><p className="font-mono font-semibold">{reportVendor.bankDetails.accountNumber}</p></div>}
                      {reportVendor.bankDetails.ifscCode && <div><p className="text-xs text-gray-500">IFSC</p><p className="font-mono font-semibold">{reportVendor.bankDetails.ifscCode}</p></div>}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-400">No bank details for this vendor</p>
                )}
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Summary tiles — only after Generate */}
      {hasGenerated && report && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
          <StatTile icon={FiShoppingBag} label="Total Purchases" value={formatINR(total.amount)} count={total.count} gradient="from-indigo-500 to-purple-600" />
          <StatTile icon={FiCheckCircle} label="Cleared" value={formatINR(cleared.amount)} count={cleared.count} gradient="from-green-500 to-emerald-600" />
          <StatTile icon={FiClock} label="Pending" value={formatINR(pending.amount)} count={pending.count} gradient="from-amber-500 to-orange-600" />
          <StatTile icon={FiAlertCircle} label="Bounced" value={formatINR(bounced.amount)} count={bounced.count} gradient="from-red-500 to-pink-600" />
        </div>
      )}

      {/* PDF preview — only after Generate */}
      <Card className="animate-fadeIn">
        <CardBody>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900">Report Preview</h3>
            <span className="text-sm text-gray-500">
              {hasGenerated && report ? `${total.count} purchases ${reportVendor ? `for ${reportVendor.name}` : ""} ${report.month ? `for ${report.month}` : report.startDate ? `from ${new Date(report.startDate).toLocaleDateString()} to ${new Date(report.endDate).toLocaleDateString()}` : ""}` : ""}
            </span>
          </div>

          {!hasGenerated ? (
            <div className="text-center py-12 text-gray-500">
              <FiFilter className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">Select a vendor and date range, then click Generate Report</p>
              <p className="text-xs text-gray-400 mt-1">Report will appear here after you click Generate</p>
            </div>
          ) : loading ? (
            <LoadingSpinner />
          ) : PDFViewer && ReportDoc && report ? (
            <div className="h-[calc(100vh-320px)] min-h-[480px] rounded-xl overflow-hidden border border-gray-200">
              <PDFViewer width="100%" height="100%" style={{ border: "none" }}>
                <ReportDoc report={report} />
              </PDFViewer>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <FiFilter className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">No report generated yet</p>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
