"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { FiShoppingBag, FiSave, FiX, FiCheck, FiPlus, FiTrash2 } from "react-icons/fi";
import Link from "next/link";
import { PageHeader, Card, CardBody, Input, Select, Dropdown, Button, LoadingSpinner } from "@/components/UI";
import { purchasesAPI, vendorsAPI } from "@/lib/api";

const PAYMENT_METHODS = ["cheque", "gpay", "NEFT"];
const PAYMENT_STATUSES = ["Pending", "Cleared", "Bounced"];

const emptyPayment = () => ({
  method: "cheque",
  details: "",
  amount: "",
  status: "Pending",
  passedDate: "",
});

const toDateInput = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export default function EditPurchasePage() {
  const router = useRouter();
  const params = useParams();
  const [form, setForm] = useState(null);
  const [payments, setPayments] = useState([emptyPayment()]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [purchaseRes, vendorsRes] = await Promise.all([
          purchasesAPI.getById(params.id),
          vendorsAPI.getAll({ limit: 500 }),
        ]);
        if (cancelled) return;
        const p = purchaseRes.data.data;
        setForm({
          vendorId: p.vendorId?._id || "",
          purchaseNumber: p.purchaseNumber,
          invoiceNumber: p.invoiceNumber,
          date: toDateInput(new Date(p.date)),
          amount: p.amount,
        });
        if (Array.isArray(p.payments) && p.payments.length) {
          setPayments(
            p.payments.map((pay) => ({
              method: PAYMENT_METHODS.includes(pay.method) ? pay.method : "cheque",
              details: pay.details || "",
              amount: pay.amount ?? "",
              status: pay.status || "Pending",
              passedDate: pay.passedDate ? toDateInput(new Date(pay.passedDate)) : "",
            })),
          );
        } else {
          // Migrate legacy single-payment fields into one entry
          setPayments([
            {
              method: "cheque",
              details: p.chequeDetails || "",
              amount: p.chequeAmount || "",
              status: p.chequeStatus || "Pending",
              passedDate: p.passedDate ? toDateInput(new Date(p.passedDate)) : "",
            },
          ]);
        }
        setVendors(vendorsRes.data.data || []);
      } catch (e) {
        if (!cancelled) setError(e.response?.data?.message || "Failed to load purchase");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  const setField = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const updatePayment = (idx, field, value) =>
    setPayments((prev) => prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));
  const addPayment = () => setPayments((prev) => [...prev, emptyPayment()]);
  const removePayment = (idx) =>
    setPayments((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));

  const searchVendors = async (searchTerm) => {
    const response = await vendorsAPI.getAll({ limit: 50, search: searchTerm });
    const results = response.data.data.map((v) => ({
      value: v._id,
      label: v.name,
    }));
    return [{ value: "", label: "— None / Walk-in —" }, ...results];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      setSaving(true);
      const cleanPayments = payments.map((p) => ({
        method: p.method,
        details: (p.details || "").trim(),
        amount: p.amount === "" ? 0 : parseFloat(p.amount) || 0,
        status: p.status || "Pending",
        passedDate: p.passedDate || null,
      }));
      const first = cleanPayments[0];
      const payload = {
        ...form,
        vendorId: form.vendorId || null,
        amount: parseFloat(form.amount) || 0,
        payments: cleanPayments,
        chequeDetails: first?.details || "",
        chequeAmount: first?.amount || 0,
        chequeStatus: first?.status || "Pending",
        passedDate: first?.passedDate || null,
      };
      await purchasesAPI.update(params.id, payload);
      setSaved(true);
      setTimeout(() => router.push("/dashboard/purchases"), 800);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update purchase");
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiCheck className="h-8 w-8 text-green-600" />
          </div>
          <p className="text-lg font-semibold text-gray-900">Purchase updated successfully!</p>
        </div>
      </div>
    );
  }

  const labelClass = "block text-sm font-medium text-gray-700 mb-2";
  const inputClass = "w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-white";
  const selectClass = "w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-white";

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <PageHeader title="Edit Purchase" subtitle={form ? `Editing purchase ${form.purchaseNumber}` : "Editing purchase"} backLink="/dashboard/purchases" />

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">{error}</div>
      )}

      <Card className="animate-fadeIn">
        {loading || !form ? (
          <LoadingSpinner />
        ) : (
          <CardBody>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mr-3">
                      <FiShoppingBag className="text-white" />
                    </div>
                    Purchase Details
                  </h3>
                </div>

                <div className="sm:col-span-2">
                  <Dropdown
                    label="Vendor"
                    name="vendorId"
                    value={form.vendorId}
                    onChange={setField("vendorId")}
                    placeholder="— None / Walk-in —"
                    options={[
                      { value: "", label: "— None / Walk-in —" },
                      ...vendors.map((v) => ({ value: v._id, label: v.name })),
                    ]}
                    onSearch={searchVendors}
                  />
                </div>

                <div>
                  <label className={labelClass}>Purchase No.</label>
                  <div className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 font-mono">{form.purchaseNumber || "—"}</div>
                </div>
                <div>
                  <label className={labelClass}>Vendor Invoice No. <span className="text-red-500">*</span></label>
                  <input type="text" name="invoiceNumber" required value={form.invoiceNumber} onChange={setField("invoiceNumber")} className={inputClass} placeholder="e.g., VN/2026/001" />
                </div>
                <div>
                  <label className={labelClass}>Date <span className="text-red-500">*</span></label>
                  <input type="date" name="date" required value={form.date} onChange={setField("date")} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Amount (₹) <span className="text-red-500">*</span></label>
                  <input type="number" name="amount" required min="0" step="0.01" value={form.amount} onChange={setField("amount")} className={inputClass} placeholder="0.00" />
                </div>

                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-2 mt-2">
                    <h3 className="text-lg font-semibold text-gray-900">Payment Details</h3>
                    <Button type="button" variant="secondary" onClick={addPayment}>
                      <FiPlus className="mr-2 h-4 w-4" />Add Payment
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mb-4">
                    Choose method per entry (cheque / gpay / NEFT) with its price. Same method can be added multiple times.
                  </p>
                </div>

                {payments.map((p, idx) => (
                  <div key={idx} className="sm:col-span-2 rounded-xl border border-gray-200 bg-gray-50/60 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold text-gray-700">
                        Payment #{idx + 1}
                        <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                          {p.method}
                        </span>
                      </span>
                      {payments.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePayment(idx)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Remove this payment"
                        >
                          <FiTrash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className={labelClass}>Method *</label>
                        <select
                          value={p.method}
                          onChange={(e) => updatePayment(idx, "method", e.target.value)}
                          className={selectClass}
                        >
                          {PAYMENT_METHODS.map((m) => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Price (₹) *</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={p.amount}
                          onChange={(e) => updatePayment(idx, "amount", e.target.value)}
                          className={inputClass}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className={labelClass}>
                          {p.method === "cheque" ? "Cheque Details (no, bank, etc.)" : p.method === "gpay" ? "GPay Details (UTR / mobile)" : "NEFT Details (UTR / ref)"}
                        </label>
                        <input
                          type="text"
                          value={p.details}
                          onChange={(e) => updatePayment(idx, "details", e.target.value)}
                          className={inputClass}
                          placeholder={
                            p.method === "cheque"
                              ? "Cheque number, bank, etc."
                              : p.method === "gpay"
                                ? "GPay UTR / transaction id"
                                : "NEFT UTR / reference"
                          }
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Status</label>
                        <select
                          value={p.status}
                          onChange={(e) => updatePayment(idx, "status", e.target.value)}
                          className={selectClass}
                        >
                          {PAYMENT_STATUSES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Passed Date</label>
                        <input
                          type="date"
                          value={p.passedDate}
                          onChange={(e) => updatePayment(idx, "passedDate", e.target.value)}
                          className={inputClass}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex justify-end space-x-3">
                <Link href="/dashboard/purchases"><Button variant="secondary" type="button"><FiX className="mr-2 h-4 w-4" />Cancel</Button></Link>
                <Button type="submit" disabled={saving}><FiSave className="mr-2 h-4 w-4" />{saving ? "Saving..." : "Save Changes"}</Button>
              </div>
            </form>
          </CardBody>
        )}
      </Card>
    </div>
  );
}