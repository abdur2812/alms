"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FiShoppingBag, FiSave, FiCheck } from "react-icons/fi";
import Link from "next/link";
import { PageHeader, Card, CardBody, Input, Select, Dropdown, Button, LoadingSpinner } from "@/components/UI";
import { purchasesAPI, vendorsAPI } from "@/lib/api";

const toDateInput = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export default function NewPurchasePage() {
  const router = useRouter();
  const [vendors, setVendors] = useState([]);
  const [vendorsLoading, setVendorsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [nextPurchaseNumber, setNextPurchaseNumber] = useState("");

  const [form, setForm] = useState({
    vendorId: "",
    invoiceNumber: "",
    date: toDateInput(new Date()),
    amount: "",
    chequeDetails: "",
    chequeAmount: "",
    chequeStatus: "Pending",
    passedDate: "",
  });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await vendorsAPI.getAll({ limit: 500 });
        if (!cancelled) setVendors(res.data.data || []);
      } catch (e) {
        if (!cancelled) setError(e.response?.data?.message || "Failed to load vendors");
      } finally {
        if (!cancelled) setVendorsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await purchasesAPI.getNextNumber();
        if (!cancelled) setNextPurchaseNumber(res.data.data?.purchaseNumber || "");
      } catch (e) {
        // Non-fatal: purchase number will be assigned by the server on create.
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

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
      await purchasesAPI.create(payload);
      setSaved(true);
      setTimeout(() => router.push("/dashboard/purchases"), 800);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create purchase");
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
          <p className="text-lg font-semibold text-gray-900">Purchase created successfully!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <PageHeader title="Add Purchase" subtitle="Record a new purchase invoice" backLink="/dashboard/purchases" />

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      <Card className="animate-fadeIn">
        {vendorsLoading ? (
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Purchase No.</label>
                  <div className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 font-mono">
                    {nextPurchaseNumber || "Auto-assigned on save"}
                  </div>
                </div>
                <Input label="Vendor Invoice No. *" name="invoiceNumber" required value={form.invoiceNumber} onChange={setField("invoiceNumber")} placeholder="e.g., VN/2026/001" />
                <Input label="Date *" type="date" name="date" required value={form.date} onChange={setField("date")} />
                <Input label="Amount (₹) *" type="number" name="amount" required min="0" step="0.01" value={form.amount} onChange={setField("amount")} placeholder="0.00" />

                <div className="sm:col-span-2">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 mt-2">Cheque / Payment Details</h3>
                </div>

                <Input label="Cheque Details" name="chequeDetails" value={form.chequeDetails} onChange={setField("chequeDetails")} placeholder="Cheque number, bank, etc." />
                <Input label="Cheque Amount (₹)" type="number" name="chequeAmount" min="0" step="0.01" value={form.chequeAmount} onChange={setField("chequeAmount")} placeholder="0.00" />

                <Select label="Cheque Status" name="chequeStatus" value={form.chequeStatus} onChange={setField("chequeStatus")}>
                  <option value="Pending">Pending</option>
                  <option value="Cleared">Cleared</option>
                  <option value="Bounced">Bounced</option>
                </Select>

                <Input label="Passed Date" type="date" name="passedDate" value={form.passedDate} onChange={setField("passedDate")} />
              </div>

              <div className="mt-8 flex justify-end space-x-3">
                <Link href="/dashboard/purchases"><Button variant="secondary" type="button">Cancel</Button></Link>
                <Button type="submit" disabled={saving}><FiSave className="mr-2" />{saving ? "Saving..." : "Create Purchase"}</Button>
              </div>
            </form>
          </CardBody>
        )}
      </Card>
    </div>
  );
}