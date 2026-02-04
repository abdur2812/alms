"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { invoicesAPI } from "@/lib/api";
import { FiArrowLeft } from "react-icons/fi";
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
    <div className="p-6">
      <div className="mb-6">
        <Link
          href="/dashboard/invoices"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <FiArrowLeft className="mr-2" />
          Back to Invoices
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Edit Invoice</h1>
        <p className="mt-1 text-sm text-gray-600">
          Note: Invoice items cannot be edited after creation. You can only
          update GST settings and status.
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="bg-white shadow-md rounded-lg p-6">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-6">
            {/* IGST Toggle */}
            <div className="flex items-center">
              <input
                type="checkbox"
                name="isIGST"
                id="isIGST"
                checked={formData.isIGST}
                onChange={handleChange}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label
                htmlFor="isIGST"
                className="ml-2 block text-sm font-medium text-gray-700"
              >
                Interstate Transaction (Use IGST)
              </label>
            </div>

            {/* Conditional GST Rate Fields */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              {formData.isIGST ? (
                <div className="sm:col-span-3">
                  <label
                    htmlFor="igstRate"
                    className="block text-sm font-medium text-gray-700"
                  >
                    IGST Rate (%)
                  </label>
                  <input
                    type="number"
                    name="igstRate"
                    id="igstRate"
                    min="0"
                    max="100"
                    step="0.01"
                    value={formData.igstRate}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label
                      htmlFor="cgstRate"
                      className="block text-sm font-medium text-gray-700"
                    >
                      CGST Rate (%)
                    </label>
                    <input
                      type="number"
                      name="cgstRate"
                      id="cgstRate"
                      min="0"
                      max="100"
                      step="0.01"
                      value={formData.cgstRate}
                      onChange={handleChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="sgstRate"
                      className="block text-sm font-medium text-gray-700"
                    >
                      SGST Rate (%)
                    </label>
                    <input
                      type="number"
                      name="sgstRate"
                      id="sgstRate"
                      min="0"
                      max="100"
                      step="0.01"
                      value={formData.sgstRate}
                      onChange={handleChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                </>
              )}
            </div>

            <div>
              <label
                htmlFor="status"
                className="block text-sm font-medium text-gray-700"
              >
                Status <span className="text-red-500">*</span>
              </label>
              <select
                name="status"
                id="status"
                required
                value={formData.status}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="Draft">Draft</option>
                <option value="Pending">Pending</option>
                <option value="Paid">Paid</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <Link
              href="/dashboard/invoices"
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
