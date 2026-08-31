"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { FiShoppingBag, FiSave, FiX, FiCheck } from "react-icons/fi";
import Link from "next/link";
import { PageHeader, Card, CardBody, Input, Select, Dropdown, Button, LoadingSpinner } from "@/components/UI";
import { purchasesAPI, vendorsAPI } from "@/lib/api";

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
          chequeDetails: p.chequeDetails || "",
          chequeAmount: p.chequeAmount || "",
          chequeStatus: p.chequeStatus || "Pending",
          passedDate: p.passedDate ? toDateInput(new Date(p.passedDate)) : "",
        });
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
      const payload = {
        ...form,
        vendorId: form.vendorId || null,
        amount: parseFloat(form.amount) || 0,
        chequeAmount: form.chequeAmount === "" ? 0 : parseFloat(form.chequeAmount) || 0,
        passedDate: form.passedDate || null,
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
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 mt-2">Cheque / Payment Details</h3>
                </div>

                <div>
                  <label className={labelClass}>Cheque Details</label>
                  <input type="text" name="chequeDetails" value={form.chequeDetails} onChange={setField("chequeDetails")} className={inputClass} placeholder="Cheque number, bank, etc." />
                </div>
                <div>
                  <label className={labelClass}>Cheque Amount (₹)</label>
                  <input type="number" name="chequeAmount" min="0" step="0.01" value={form.chequeAmount} onChange={setField("chequeAmount")} className={inputClass} placeholder="0.00" />
                </div>
                <div>
                  <label className={labelClass}>Cheque Status</label>
                  <select name="chequeStatus" value={form.chequeStatus} onChange={setField("chequeStatus")} className={selectClass}>
                    <option value="Pending">Pending</option>
                    <option value="Cleared">Cleared</option>
                    <option value="Bounced">Bounced</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Passed Date</label>
                  <input type="date" name="passedDate" value={form.passedDate} onChange={setField("passedDate")} className={inputClass} />
                </div>
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