"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { invoicesAPI } from "@/lib/api";
import { FiArrowLeft } from "react-icons/fi";
import {
  PageHeader,
  Card,
  CardBody,
  Input,
  Dropdown,
  Button,
} from "@/components/UI";
import Link from "next/link";

export default function EditInvoicePage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    isIGST: false,
    cgstRate: 9,
    sgstRate: 9,
    igstRate: 18,
    billType: "pay",
    status: "Draft",
  });

  useEffect(() => {
    fetchInvoice();
  }, []);

  const fetchInvoice = async () => {
    try {
      const response = await invoicesAPI.getById(id);
      const invoice = response.data.data;
      setFormData({
        isIGST: invoice.isIGST || false,
        cgstRate: invoice.cgstRate || 9,
        sgstRate: invoice.sgstRate || 9,
        igstRate: invoice.igstRate || 18,
        billType: invoice.billType || "pay",
        status: invoice.status,
      });
      setLoading(false);
    } catch (err) {
      setError("Failed to fetch invoice");
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      await invoicesAPI.update(id, {
        isIGST: formData.isIGST,
        cgstRate: parseFloat(formData.cgstRate),
        sgstRate: parseFloat(formData.sgstRate),
        igstRate: parseFloat(formData.igstRate),
        billType: formData.billType,
        status: formData.status,
      });
      router.push("/dashboard/invoices");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update invoice");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading invoice...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <PageHeader
        title="Edit Invoice"
        subtitle="Update GST settings and status. Note: Invoice items cannot be edited after creation."
        backLink="/dashboard/invoices"
      />

      <Card className="animate-fadeIn">
        <CardBody>
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg animate-shake">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-6">
              {/* IGST Toggle */}
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <input
                  type="checkbox"
                  name="isIGST"
                  id="isIGST"
                  checked={formData.isIGST}
                  onChange={handleChange}
                  className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded-md transition-all duration-200"
                />
                <label
                  htmlFor="isIGST"
                  className="text-sm font-semibold text-gray-700 cursor-pointer"
                >
                  Interstate Transaction (Use IGST)
                </label>
              </div>

              {/* Conditional GST Rate Fields */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                {formData.isIGST ? (
                  <div className="sm:col-span-3">
                    <Input
                      label="IGST Rate (%)"
                      type="number"
                      name="igstRate"
                      id="igstRate"
                      min="0"
                      max="100"
                      step="0.01"
                      value={formData.igstRate}
                      onChange={handleChange}
                      required
                    />
                  </div>
                ) : (
                  <>
                    <Input
                      label="CGST Rate (%)"
                      type="number"
                      name="cgstRate"
                      id="cgstRate"
                      min="0"
                      max="100"
                      step="0.01"
                      value={formData.cgstRate}
                      onChange={handleChange}
                      required
                    />
                    <Input
                      label="SGST Rate (%)"
                      type="number"
                      name="sgstRate"
                      id="sgstRate"
                      min="0"
                      max="100"
                      step="0.01"
                      value={formData.sgstRate}
                      onChange={handleChange}
                      required
                    />
                  </>
                )}
              </div>

              <Dropdown
                label="Bill Type"
                name="billType"
                value={formData.billType}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData({
                    ...formData,
                    billType: val,
                    status: val === "pay" ? "Paid" : "Pending",
                  });
                }}
                placeholder="Select bill type"
                options={[
                  { value: "pay", label: "Paid Bill" },
                  { value: "credit", label: "Credit Bill" },
                ]}
                required
              />
            </div>

            <div className="mt-8 flex justify-end space-x-4">
              <Button
                variant="secondary"
                type="button"
                onClick={() => router.push("/dashboard/invoices")}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
