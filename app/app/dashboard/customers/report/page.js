"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { FiDownload, FiClock, FiShoppingBag, FiCheckCircle, FiFilter, FiCalendar } from "react-icons/fi";
import { PageHeader, Card, CardBody, Button, LoadingSpinner, Dropdown } from "@/components/UI";
import { customersAPI } from "@/lib/api";

const formatINR = (amount) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 }).format(amount);

const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

export default function CustomerReportPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const customerId = searchParams.get("customerId") || "";

  const [customers, setCustomers] = useState([]);
  const [customerDetails, setCustomerDetails] = useState(null);
  const [month, setMonth] = useState(currentMonth());
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [report, setReport] = useState(null);
  const [pdfComponents, setPdfComponents] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasGenerated, setHasGenerated] = useState(false);
  const pdfRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    customersAPI
      .getAll({ limit: 20 })
      .then((res) => !cancelled && setCustomers(res.data.data || []))
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!customerId) {
      setCustomerDetails(null);
      return;
    }
    let cancelled = false;
    customersAPI
      .getById(customerId)
      .then((res) => !cancelled && setCustomerDetails(res.data.data))
      .catch(() => !cancelled && setCustomerDetails(null));
    return () => { cancelled = true; };
  }, [customerId]);

  const selectCustomer = (id) => {
    setHasGenerated(false);
    setReport(null);
    router.push(id ? `/dashboard/customers/report?customerId=${id}` : "/dashboard/customers/report");
  };

  const ensurePdf = useCallback(async () => {
    if (pdfRef.current) return pdfRef.current;
    const [pdfLib, reportDoc] = await Promise.all([
      import("@react-pdf/renderer"),
      import("@/components/CustomerReportPDF"),
    ]);
    const comps = { PDFViewer: pdfLib.PDFViewer, pdf: pdfLib.pdf, ReportDoc: reportDoc.default };
    pdfRef.current = comps;
    setPdfComponents(comps);
    return comps;
  }, []);

  const handleGenerate = async () => {
    if (!customerId) {
      setError("Please select a customer");
      return;
    }
    const q = {};
    if (startDate || endDate) {
      if (startDate) q.startDate = startDate;
      if (endDate) q.endDate = endDate;
    } else {
      q.month = month || currentMonth();
    }
    setHasGenerated(true);
    setLoading(true);
    setError("");
    try {
      const res = await customersAPI.getReport(customerId, q);
      setReport(res.data.data);
      await ensurePdf();
    } catch (e) {
      setError(e.response?.data?.message || "Failed to load customer report");
    } finally {
      setLoading(false);
    }
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
      const namePart = report.customer?.name ? `-${report.customer.name.replace(/\s+/g, "_")}` : "";
      const datePart = report.month
        ? report.month
        : `${startDate || "all"}_to_${endDate || "now"}`;
      const { pdfBlobToJpgs, saveJpgs } = await import("@/lib/pdfToJpg");
      await saveJpgs(await pdfBlobToJpgs(blob), `Customer-Report${namePart}-${datePart}`);
    } catch (err) {
      alert("Download failed. Please try again.");
    }
  };

  const searchCustomers = async (term) => {
    const response = await customersAPI.getAll({ limit: 20, search: term });
    return response.data.data.map((c) => ({
      value: c._id,
      label: `${c.name}${c.phone ? ` • ${c.phone}` : ""}`,
    }));
  };

  const { PDFViewer, ReportDoc } = pdfComponents || {};
  const total = report?.total || { count: 0, amount: 0 };
  const cash = report?.cash || { count: 0, amount: 0 };
  const credit = report?.credit || { count: 0, amount: 0 };
  const reportCustomer = report?.customer || customerDetails;

  const resetOutput = () => {
    setHasGenerated(false);
    setReport(null);
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <PageHeader
        title="Customer Report"
        subtitle={reportCustomer ? `Customer: ${reportCustomer.name}` : "Select a customer and date range to generate report"}
        backLink="/dashboard/customers"
        action={
          <Button variant="primary" onClick={handleDownload} disabled={!report}>
            <FiDownload className="mr-2" />Download JPG
          </Button>
        }
      />

      {error && (
        <div className="mb-6 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
          <span>{error}</span>
          <button onClick={() => setError("")} className="ml-auto text-red-400 hover:text-red-600 font-bold">✕</button>
        </div>
      )}

      <Card className="mb-6 animate-fadeIn">
        <CardBody>
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-xl bg-indigo-100 flex items-center justify-center">
              <FiFilter className="h-4 w-4 text-indigo-600" />
            </div>
            <h3 className="text-sm font-bold text-gray-800">Filters</h3>
            <span className="text-xs text-gray-500">Customer + date — all purchases, cash and credit</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div>
              <Dropdown
                label="Customer"
                name="customerId"
                value={customerId}
                onChange={(e) => selectCustomer(e.target.value)}
                placeholder="— Select customer —"
                options={[
                  ...(customerDetails && !customers.some((c) => c._id === customerDetails._id)
                    ? [{ value: customerDetails._id, label: customerDetails.name }]
                    : []),
                  ...customers.map((c) => ({ value: c._id, label: `${c.name}${c.phone ? ` • ${c.phone}` : ""}` })),
                ]}
                onSearch={searchCustomers}
              />
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
                  resetOutput();
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
                  resetOutput();
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
                  resetOutput();
                }}
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="primary" onClick={handleGenerate}>
              <FiCalendar className="mr-2" />Generate Report
            </Button>
            <Button variant="secondary" onClick={handleClearDates}>
              Clear Dates
            </Button>
          </div>
        </CardBody>
      </Card>

      {hasGenerated && report && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
          {[
            { label: "Total Purchases", data: total, icon: FiShoppingBag, gradient: "from-indigo-500 to-purple-600" },
            { label: "Cash (Paid)", data: cash, icon: FiCheckCircle, gradient: "from-green-500 to-emerald-600" },
            { label: "Credit (Pending)", data: credit, icon: FiClock, gradient: "from-amber-500 to-orange-600" },
          ].map((t) => (
            <div key={t.label} className="bg-white overflow-hidden rounded-2xl shadow-lg p-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">{t.label}</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">{formatINR(t.data.amount)}</p>
                <p className="mt-1 text-xs font-medium text-gray-500">{t.data.count} bill{t.data.count === 1 ? "" : "s"}</p>
              </div>
              <div className={`shrink-0 bg-gradient-to-br ${t.gradient} rounded-2xl p-4 shadow-md`}>
                <t.icon className="h-7 w-7 text-white" />
              </div>
            </div>
          ))}
        </div>
      )}

      <Card className="animate-fadeIn">
        <CardBody>
          <h3 className="text-base font-semibold text-gray-900 mb-4">Report Preview</h3>
          {!hasGenerated ? (
            <div className="text-center py-12 text-gray-500">
              <FiFilter className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">Select a customer and date range, then click Generate Report</p>
            </div>
          ) : loading ? (
            <LoadingSpinner />
          ) : PDFViewer && ReportDoc && report ? (
            <div className="h-[calc(100vh-320px)] min-h-[480px] rounded-xl overflow-hidden border border-gray-200">
              <PDFViewer width="100%" height="100%" style={{ border: "none" }}>
                <ReportDoc report={report} />
              </PDFViewer>
            </div>
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}
