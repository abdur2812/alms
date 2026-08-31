"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FiTrendingUp, FiDollarSign, FiShoppingBag, FiCreditCard, FiAlertCircle, FiPlus, FiX, FiCalendar, FiUsers, FiTrash2, FiHash, FiPieChart } from "react-icons/fi";
import { PageHeader, Card, Badge, ConfirmDialog } from "@/components/UI";
import DateRangePicker from "@/components/DateRangePicker";
import { accountsAPI, expensesAPI, expenseCategoriesAPI } from "@/lib/api";
import AccountsReportPDF from "@/components/AccountsReportPDF";
import { PDFDownloadLink, PDFViewer } from "@react-pdf/renderer";

const toDateInput = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const formatINR = (amount) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 }).format(amount);

const chequeStatusBadge = (s) => {
  const m = { Cleared: "success", Bounced: "danger", Pending: "warning" };
  return <Badge variant={m[s] || "default"}>{s}</Badge>;
};

const TABS = [
  { id: "overview", label: "Overview", icon: FiPieChart },
  { id: "report", label: "Report", icon: FiTrendingUp },
  { id: "hsn", label: "HSN Codes", icon: FiHash },
  { id: "purchases", label: "Purchases", icon: FiShoppingBag },
  { id: "expenses", label: "Expenses", icon: FiPlus },
  { id: "salaries", label: "Salaries", icon: FiUsers },
];

function StatTile({ icon: Icon, label, value, idx, format = formatINR }) {
  const gradients = [
    "from-blue-500 to-cyan-500",
    "from-purple-500 to-pink-500",
    "from-orange-500 to-red-500",
    "from-green-500 to-emerald-500",
    "from-teal-500 to-cyan-500",
  ];
  const g = gradients[idx % gradients.length];
  return (
    <div className="bg-white overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-5">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">{label}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{format(value)}</p>
        </div>
        <div className={`shrink-0 bg-gradient-to-br ${g} rounded-2xl p-4 shadow-md`}>
          <Icon className="h-7 w-7 text-white" />
        </div>
      </div>
    </div>
  );
}

function Section({ title, subtitle, accent = "indigo", children }) {
  const accents = {
    green: "bg-green-100 text-green-600",
    indigo: "bg-indigo-100 text-indigo-600",
    blue: "bg-blue-100 text-blue-600",
    orange: "bg-orange-100 text-orange-600",
    cyan: "bg-cyan-100 text-cyan-600",
    violet: "bg-violet-100 text-violet-600",
    slate: "bg-slate-100 text-slate-600",
  };
  return (
    <section className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden animate-fadeIn">
      <header className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
        <div className={`shrink-0 p-2 rounded-lg ${accents[accent] || accents.indigo}`}>
          <span className="block h-2.5 w-2.5 rounded-full bg-current" />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-bold text-gray-900 leading-tight">{title}</h2>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Tbl({ headers, rows }) {
  return (
    <table className="min-w-full divide-y divide-gray-100">
      <thead className="bg-gray-50">
        <tr>
          {headers.map((h, i) => (
            <th key={i} className={`px-4 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider ${i === headers.length - 1 ? "text-right" : "text-left"}`}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-50">{rows}</tbody>
    </table>
  );
}

function HsnSection({ range }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load HSN data when the tab is opened (component mounts) and when the range changes.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      const params = {};
      if (range?.startDate) params.startDate = toDateInput(range.startDate);
      if (range?.endDate) params.endDate = toDateInput(range.endDate);
      try {
        const res = await accountsAPI.getHsnSummary(params);
        if (!cancelled) setData(res.data.data);
      } catch (e) {
        if (!cancelled) setError("Failed to load HSN summary");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [range]);

  if (loading) {
    return (
      <div className="py-12 text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-sm text-gray-500">Loading HSN summary...</p>
      </div>
    );
  }

  if (error) {
    return <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">{error}</div>;
  }

  return (
    <Section title="HSN Code Summary" subtitle="Total quantity, GST-inclusive individual & total value sold grouped by HSN code" accent="violet">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-5">
        <StatTile icon={FiPieChart} label="Total Items Sold" value={data?.total || 0} idx={2} format={(v) => String(v)} />
        <StatTile icon={FiHash} label="HSN Codes Used" value={data?.count || 0} idx={3} format={(v) => String(v)} />
        <StatTile icon={FiDollarSign} label="Total Value" value={data?.totalValue || 0} idx={0} />
      </div>
      {!data || data.rows.length === 0 ? (
        <div className="p-8 text-center text-sm text-gray-500">No HSN data for this period.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-left">HSN Code</th>
                <th className="px-4 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Total Quantity Sold</th>
                <th className="px-4 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Individual Price</th>
                <th className="px-4 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Total Price</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {data.rows.map((r, i) => {
                // Fallback for older API shape without unitPrice (backward compat)
                const unitPrice = r.unitPrice ?? (r.quantity ? Math.round((r.totalPrice / r.quantity) * 100) / 100 : 0);
                const hasRange = r.hasMultiplePrices && r.minUnitPrice !== r.maxUnitPrice;
                return (
                  <tr key={r.hsnCode || i} className="hover:bg-indigo-50/30 transition-colors">
                    <td className="px-4 py-2.5 text-sm font-bold text-indigo-600">{r.hsnCode}</td>
                    <td className="px-4 py-2.5 text-sm font-bold text-gray-900 text-right">{r.quantity}</td>
                    <td className="px-4 py-2.5 text-sm font-bold text-gray-900 text-right">
                      <span>{formatINR(unitPrice || 0)}</span>
                      {hasRange && (
                        <span className="block text-[11px] font-medium text-gray-500">
                          {formatINR(r.minUnitPrice)} – {formatINR(r.maxUnitPrice)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-sm font-bold text-gray-900 text-right">{formatINR(r.totalPrice || 0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}

function ReportSection() {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [month, setMonth] = useState(defaultMonth);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasGenerated, setHasGenerated] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleGenerate = async () => {
    setShowConfirm(false);
    setLoading(true);
    setError("");
    setHasGenerated(true);
    try {
      const res = await accountsAPI.getReport({ month });
      setData(res.data.data);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to load report");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const monthLabel = month ? new Date(`${month}-01T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" }) : "—";

  return (
    <div className="space-y-6 animate-fadeIn">
      <Section title="Monthly Accounts Report" subtitle={hasGenerated && data ? `For ${monthLabel} • ${data.range.start} to ${data.range.end}` : "Select a month and generate the report"} accent="indigo">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Select Month</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
          </div>
          <button
            onClick={() => setShowConfirm(true)}
            disabled={!month || loading}
            className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-bold rounded-xl shadow-md hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 transition-all"
          >
            {loading ? "Generating..." : hasGenerated ? "Regenerate Report" : "Generate Report"}
          </button>
        </div>

        {!hasGenerated ? (
          <div className="p-8 text-center text-sm text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            Choose a month and click <span className="font-bold">Generate Report</span> to view the accounts report. A confirmation is required.
          </div>
        ) : loading ? (
          <div className="py-12 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-sm text-gray-500">Loading report for {monthLabel}...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">{error}</div>
        ) : !data ? (
          <div className="p-8 text-center text-sm text-gray-500">No report data.</div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-end">
              <PDFDownloadLink document={<AccountsReportPDF report={data} />} fileName={`ALMS-Accounts-Report-${month}.pdf`} className="px-5 py-2.5 bg-white border border-indigo-200 text-indigo-700 text-sm font-bold rounded-xl hover:bg-indigo-50 shadow-sm">
                {({ loading: pdfLoading }) => (pdfLoading ? "Preparing PDF..." : "Download PDF")}
              </PDFDownloadLink>
            </div>
            <div className="border border-gray-200 rounded-xl overflow-hidden" style={{ height: "800px" }}>
              <PDFViewer width="100%" height="100%" showToolbar={true} style={{ border: "none" }}>
                <AccountsReportPDF report={data} />
              </PDFViewer>
            </div>
          </div>
        )}
      </Section>

      <ConfirmDialog
        isOpen={showConfirm}
        title="Generate Report"
        message={`Generate accounts report for ${monthLabel}? This will fetch opening/closing stock, purchases, sales and expenses for that month.`}
        onConfirm={handleGenerate}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}

export default function AccountsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const [tab, setTab] = useState("overview");
  const [range, setRange] = useState({ startDate: monthStart, endDate: monthEnd });
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ date: new Date().toISOString().split("T")[0], description: "", category: "Miscellaneous", amount: "", paidBy: "Cash" });
  const [expenseSaving, setExpenseSaving] = useState(false);
  const [expenseError, setExpenseError] = useState("");
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDesc, setNewCategoryDesc] = useState("");
  const [editingCategory, setEditingCategory] = useState(null);
  const [categorySaving, setCategorySaving] = useState(false);
  const [categoryError, setCategoryError] = useState("");

  // Keep the active tab in sync with the URL (?tab=hsn) so it survives a reload.
  useEffect(() => {
    const t = searchParams.get("tab");
    setTab(TABS.some((x) => x.id === t) ? t : "overview");
  }, [searchParams]);

  const switchTab = (t) => {
    setTab(t);
    const params = new URLSearchParams(searchParams.toString());
    if (t === "overview") params.delete("tab");
    else params.set("tab", t);
    const qs = params.toString();
    router.replace(qs ? `/dashboard/accounts?${qs}` : "/dashboard/accounts", { scroll: false });
  };

  // Load the full accounts summary whenever the date range changes.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const params = {};
        if (range.startDate) params.startDate = toDateInput(range.startDate);
        if (range.endDate) params.endDate = toDateInput(range.endDate);
        const res = await accountsAPI.getSummary(params);
        if (!cancelled) setSummary(res.data.data);
      } catch (e) {
        if (!cancelled) setError("Failed to load accounts summary");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [range]);

  // Load expense categories
  useEffect(() => {
    let cancelled = false;
    const loadCats = async () => {
      setCategoriesLoading(true);
      try {
        const res = await expenseCategoriesAPI.getAll();
        if (!cancelled) {
          const cats = res.data.data || [];
          setCategories(cats);
          // Ensure default category exists in list; otherwise keep Miscellaneous
          if (cats.length && !cats.some((c) => c.name === expenseForm.category)) {
            // keep current selection, but ensure dropdown has it
          }
        }
      } catch (e) {
        if (!cancelled) setCategoryError("Failed to load categories");
      } finally {
        if (!cancelled) setCategoriesLoading(false);
      }
    };
    loadCats();
    return () => { cancelled = true; };
  }, []);

  const sales = summary?.sales || { total: 0, paid: 0, credit: 0, count: 0 };
  const purchases = summary?.purchases || { total: 0, paid: 0, credit: 0, count: 0, purchases: [] };
  const expenses = summary?.expenses || { total: 0, count: 0, list: [] };
  const staff = summary?.staff || { totalPaid: 0, count: 0, payments: [] };

  const refreshSummary = () => {
    const params = {};
    if (range.startDate) params.startDate = toDateInput(range.startDate);
    if (range.endDate) params.endDate = toDateInput(range.endDate);
    accountsAPI
      .getSummary(params)
      .then((res) => setSummary(res.data.data))
      .catch((e) => setError("Failed to load accounts summary"));
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    setExpenseSaving(true);
    setExpenseError("");
    try {
      await expensesAPI.create({
        date: expenseForm.date,
        description: expenseForm.description,
        category: expenseForm.category,
        amount: parseFloat(expenseForm.amount) || 0,
        paidBy: expenseForm.paidBy,
      });
      setExpenseForm({ date: new Date().toISOString().split("T")[0], description: "", category: "Miscellaneous", amount: "", paidBy: "Cash" });
      setShowExpenseForm(false);
      refreshSummary();
    } catch (err) {
      setExpenseError(err.response?.data?.message || "Failed to add expense");
    } finally {
      setExpenseSaving(false);
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!confirm("Delete this expense?")) return;
    try {
      await expensesAPI.delete(id);
      refreshSummary();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete expense");
    }
  };

  const refreshCategories = async () => {
    try {
      const res = await expenseCategoriesAPI.getAll();
      setCategories(res.data.data || []);
    } catch (e) {
      setCategoryError(e.response?.data?.message || "Failed to refresh categories");
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      setCategoryError("Category name is required");
      return;
    }
    setCategorySaving(true);
    setCategoryError("");
    try {
      await expenseCategoriesAPI.create({ name: newCategoryName.trim(), description: newCategoryDesc.trim() });
      setNewCategoryName("");
      setNewCategoryDesc("");
      await refreshCategories();
    } catch (err) {
      setCategoryError(err.response?.data?.message || "Failed to create category");
    } finally {
      setCategorySaving(false);
    }
  };

  const handleUpdateCategory = async (e) => {
    e.preventDefault();
    if (!editingCategory) return;
    if (!editingCategory.name.trim()) {
      setCategoryError("Category name is required");
      return;
    }
    setCategorySaving(true);
    setCategoryError("");
    try {
      await expenseCategoriesAPI.update(editingCategory._id, { name: editingCategory.name.trim(), description: editingCategory.description?.trim() || "" });
      setEditingCategory(null);
      await refreshCategories();
      // If the currently selected expense category was renamed, update the form
      if (expenseForm.category === editingCategory._id || expenseForm.category === editingCategory.name) {
        // keep as string name; no need to change
      }
    } catch (err) {
      setCategoryError(err.response?.data?.message || "Failed to update category");
    } finally {
      setCategorySaving(false);
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!confirm("Delete this category? Expenses using it will block deletion.")) return;
    try {
      await expenseCategoriesAPI.delete(id);
      await refreshCategories();
      if (expenseForm.category && categories.find(c => c._id === id)?.name === expenseForm.category) {
        setExpenseForm(f => ({ ...f, category: "Miscellaneous" }));
      }
    } catch (err) {
      setCategoryError(err.response?.data?.message || "Failed to delete category");
      alert(err.response?.data?.message || "Failed to delete category");
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-purple-50 to-pink-50 p-6 space-y-6">
      <PageHeader title="Accounts" subtitle="Financial overview and summaries" />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      {/* Date Range Filter */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 animate-fadeIn">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Date Range</label>
            <DateRangePicker startDate={range.startDate} endDate={range.endDate} onChange={setRange} />
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-4 py-3 rounded-xl">
            <FiCalendar className="h-4 w-4 text-indigo-500" />
            <span>
              {range.startDate?.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) || "—"}
              {" — "}
              {range.endDate?.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) || "—"}
            </span>
            {loading && <span className="ml-1 animate-spin h-4 w-4 border-b-2 border-indigo-500 rounded-full inline-block" />}
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-1.5 flex flex-wrap gap-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => switchTab(t.id)}
              className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                active
                  ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Only the active tab renders */}
      {tab === "overview" && (
        <>
          {/* Net Balance */}
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl shadow-lg p-6 flex flex-wrap items-center justify-between gap-4 animate-fadeIn">
            <div>
              <p className="text-sm font-medium text-indigo-200 uppercase tracking-wide">Net Balance</p>
              <p className="mt-1 text-3xl font-bold text-white">{formatINR(summary?.netBalance ?? 0)}</p>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-indigo-100">
              <span>Sales <strong className="text-white">{formatINR(sales.total)}</strong></span>
              <span className="text-indigo-300">−</span>
              <span>Purchases <strong className="text-white">{formatINR(purchases.total)}</strong></span>
              <span className="text-indigo-300">−</span>
              <span>Expenses <strong className="text-white">{formatINR(expenses.total)}</strong></span>
              <span className="text-indigo-300">−</span>
              <span>Salaries <strong className="text-white">{formatINR(staff.totalPaid)}</strong></span>
            </div>
          </div>

          <Section title="Sales Summary" subtitle="Revenue from GST invoices and estimates" accent="green">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <StatTile icon={FiTrendingUp} label="Total Sales" value={sales.total} idx={0} />
              <StatTile icon={FiCreditCard} label="Credits in Sales" value={sales.credit} idx={1} />
            </div>
          </Section>

          <Section title="Purchases Summary" subtitle="Purchases, payments and cheque status" accent="blue">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <StatTile icon={FiShoppingBag} label="Total Purchases" value={purchases.total} idx={2} />
              <StatTile icon={FiDollarSign} label="Total Paid" value={purchases.paid} idx={3} />
              <StatTile icon={FiAlertCircle} label="Credits in Purchases" value={purchases.credit} idx={4} />
            </div>
          </Section>
        </>
      )}

      {tab === "report" && <ReportSection />}

      {tab === "hsn" && <HsnSection range={range} />}

      {tab === "purchases" && (
        <Section title="Purchases" subtitle="Purchase invoices and cheque tracking" accent="blue">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-5">
            <StatTile icon={FiShoppingBag} label="Total Purchases" value={purchases.total} idx={2} />
            <StatTile icon={FiDollarSign} label="Total Paid" value={purchases.paid} idx={3} />
            <StatTile icon={FiAlertCircle} label="Credits in Purchases" value={purchases.credit} idx={4} />
          </div>
          {purchases.purchases.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">No purchase invoices in this period.</div>
          ) : (
            <Tbl
              headers={["Invoice #", "Date", "Amount", "Cheque", "Chq Amt", "Status", "Passed"]}
              rows={purchases.purchases.map((p) => (
                <tr key={p._id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-4 py-2.5 text-sm font-bold text-indigo-600">{p.invoiceNumber}</td>
                  <td className="px-4 py-2.5 text-sm text-gray-600">{new Date(p.date).toLocaleDateString()}</td>
                  <td className="px-4 py-2.5 text-sm font-bold text-gray-900">{formatINR(p.amount)}</td>
                  <td className="px-4 py-2.5 text-sm text-gray-600 max-w-[120px] truncate">{p.chequeDetails}</td>
                  <td className="px-4 py-2.5 text-sm font-bold text-gray-900">{formatINR(p.chequeAmount)}</td>
                  <td className="px-4 py-2.5">{chequeStatusBadge(p.chequeStatus)}</td>
                  <td className="px-4 py-2.5 text-sm text-gray-600">{p.passedDate ? new Date(p.passedDate).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
            />
          )}
        </Section>
      )}

      {tab === "expenses" && (
        <Section
          title="General Expenses"
          subtitle={`${expenses.count} entries · ${formatINR(expenses.total)}`}
          accent="orange"
        >
          <div className="flex justify-end mb-5 -mt-1 gap-2">
            <button
              onClick={() => setShowCategoryManager(!showCategoryManager)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm border ${showCategoryManager ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"}`}
            >
              <FiHash className="h-4 w-4" /> {showCategoryManager ? "Hide Categories" : "Manage Categories"}
            </button>
            <button
              onClick={() => setShowExpenseForm(!showExpenseForm)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm ${
                showExpenseForm
                  ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  : "bg-gradient-to-r from-orange-500 to-amber-600 text-white hover:from-orange-600 hover:to-amber-700"
              }`}
            >
              {showExpenseForm ? <><FiX className="h-4 w-4" /> Cancel</> : <><FiPlus className="h-4 w-4" /> Add Expense</>}
            </button>
          </div>

          {showCategoryManager && (
            <div className="mb-5 rounded-xl border border-indigo-100 bg-white p-4 shadow-sm">
              <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2"><FiHash className="h-4 w-4 text-indigo-600" /> Expense Categories</h4>
              {categoryError && <div className="mb-3 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">{categoryError}</div>}
              <form onSubmit={editingCategory ? handleUpdateCategory : handleCreateCategory} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end mb-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Category Name *</label>
                  <input
                    type="text"
                    value={editingCategory ? editingCategory.name : newCategoryName}
                    onChange={(e) => editingCategory ? setEditingCategory({ ...editingCategory, name: e.target.value }) : setNewCategoryName(e.target.value)}
                    placeholder="e.g. Utilities"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Description (optional)</label>
                  <input
                    type="text"
                    value={editingCategory ? editingCategory.description || "" : newCategoryDesc}
                    onChange={(e) => editingCategory ? setEditingCategory({ ...editingCategory, description: e.target.value }) : setNewCategoryDesc(e.target.value)}
                    placeholder="Short description"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={categorySaving} className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5">
                    {categorySaving ? "Saving..." : editingCategory ? "Update" : "Add"}
                  </button>
                  {editingCategory && (
                    <button type="button" onClick={() => setEditingCategory(null)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                  )}
                </div>
              </form>
              <div className="max-h-48 overflow-y-auto divide-y divide-gray-100 border border-gray-100 rounded-lg">
                {categoriesLoading ? (
                  <div className="p-4 text-center text-sm text-gray-500">Loading categories...</div>
                ) : categories.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500">No categories yet. Add one above.</div>
                ) : (
                  categories.map((cat) => (
                    <div key={cat._id} className="flex items-center justify-between px-3 py-2 hover:bg-gray-50">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{cat.name}</p>
                        {cat.description && <p className="text-xs text-gray-500 truncate">{cat.description}</p>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => setEditingCategory(cat)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Edit"><FiHash className="h-3.5 w-3.5" /></button>
                        <button onClick={() => handleDeleteCategory(cat._id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Delete"><FiTrash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {showExpenseForm && (
            <Card className="animate-fadeIn mb-5">
              <form onSubmit={handleAddExpense} className="p-5">
                <h4 className="text-sm font-bold text-gray-900 mb-4">New Expense Entry</h4>
                {expenseError && (
                  <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
                    {expenseError}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Date</label>
                    <input type="date" value={expenseForm.date} onChange={(e) => setExpenseForm((f) => ({ ...f, date: e.target.value }))} required className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
                    <input type="text" placeholder="e.g. Electricity bill" value={expenseForm.description} onChange={(e) => setExpenseForm((f) => ({ ...f, description: e.target.value }))} required className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-gray-600">Category</label>
                      <button type="button" onClick={() => setShowCategoryManager(!showCategoryManager)} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">Manage</button>
                    </div>
                    <select value={expenseForm.category} onChange={(e) => setExpenseForm((f) => ({ ...f, category: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white">
                      {categoriesLoading ? (
                        <option>Loading categories...</option>
                      ) : categories.length === 0 ? (
                        <option value="Miscellaneous">Miscellaneous</option>
                      ) : (
                        <>
                          {categories.map((c) => (
                            <option key={c._id} value={c.name}>{c.name}</option>
                          ))}
                          {/* Preserve legacy selected value if not in list */}
                          {!categories.some((c) => c.name === expenseForm.category) && expenseForm.category && (
                            <option value={expenseForm.category}>{expenseForm.category} (legacy)</option>
                          )}
                        </>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Amount (₹)</label>
                    <input type="number" placeholder="0.00" min="0" step="0.01" value={expenseForm.amount} onChange={(e) => setExpenseForm((f) => ({ ...f, amount: e.target.value }))} required className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Paid By</label>
                    <select value={expenseForm.paidBy} onChange={(e) => setExpenseForm((f) => ({ ...f, paidBy: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white">
                      <option>Cash</option><option>UPI</option><option>Cheque</option><option>Card</option>
                    </select>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button type="submit" disabled={expenseSaving} className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 text-white text-sm font-bold rounded-xl hover:from-orange-600 hover:to-amber-700 shadow-md transition-all disabled:opacity-50">
                    <FiPlus className="inline mr-1.5 h-4 w-4" />{expenseSaving ? "Saving..." : "Add Expense"}
                  </button>
                </div>
              </form>
            </Card>
          )}

          {expenses.list.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">No expenses recorded in this period.</div>
          ) : (
            <Tbl
              headers={["Date", "Description", "Category", "Amount", "Paid By", ""]}
              rows={expenses.list.map((e) => (
                <tr key={e._id} className="hover:bg-orange-50/30 transition-colors">
                  <td className="px-4 py-2.5 text-sm text-gray-600">{new Date(e.date).toLocaleDateString()}</td>
                  <td className="px-4 py-2.5 text-sm font-semibold text-gray-900">{e.description}</td>
                  <td className="px-4 py-2.5"><span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">{e.category}</span></td>
                  <td className="px-4 py-2.5 text-sm font-bold text-gray-900">{formatINR(e.amount)}</td>
                  <td className="px-4 py-2.5 text-sm text-gray-600">{e.paidBy}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => handleDeleteExpense(e._id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                      title="Delete expense"
                    >
                      <FiTrash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            />
          )}
        </Section>
      )}

      {tab === "salaries" && (
        <Section title="Staff Salaries" subtitle="Daily salary settlements per staff (per-day tracked via Attendance/Calendar)" accent="cyan">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
            <StatTile icon={FiUsers} label="Total Salary Paid" value={staff.dailyPayments?.reduce((s, p) => s + (p.amount || 0), 0) ?? 0} idx={4} />
            <StatTile icon={FiCalendar} label="Daily Settlements" value={staff.dailyCount ?? staff.dailyPayments?.length ?? 0} idx={3} format={(v) => String(v)} />
          </div>
          {(staff.dailyPayments?.length || 0) === 0 ? (
            <div className="text-center py-8 text-sm text-gray-500">No salary payments recorded in this period.</div>
          ) : (
            <div>
              <Tbl
                headers={["Staff", "Date", "Status", "Amount", "Paid On"]}
                rows={staff.dailyPayments.map((p) => (
                  <tr key={p._id} className="hover:bg-cyan-50/30 transition-colors">
                    <td className="px-4 py-2.5 text-sm font-bold text-gray-900">{p.staffId?.name || "—"}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-600">{p.date ? new Date(p.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-600">
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${p.status === "present" ? "bg-green-100 text-green-700" : p.status === "half" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>{p.status || "—"}</span>
                    </td>
                    <td className="px-4 py-2.5 text-sm font-bold text-gray-900">{formatINR(p.amount)}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-600">
                      {p.paidAt ? new Date(p.paidAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                    </td>
                  </tr>
                ))}
              />
            </div>
          )}
        </Section>
      )}
    </div>
  );
}