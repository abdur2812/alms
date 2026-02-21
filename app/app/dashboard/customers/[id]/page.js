"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { customersAPI } from "@/lib/api";
import { FiArrowLeft, FiChevronDown, FiChevronUp } from "react-icons/fi";
import Link from "next/link";

export default function EditCustomerPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [creditData, setCreditData] = useState(null);
  const [showCreditInvoices, setShowCreditInvoices] = useState(false);
  const [formData, setFormData] = useState({
    customerType: "individual",
    name: "",
    pocName: "",
    phone: "",
    gstNumber: "",
    address: {
      companyAddress: "",
      city: "",
      state: "",
      postalCode: "",
      country: "India",
    },
  });

  useEffect(() => {
    fetchCustomer();
    fetchCreditInvoices();
  }, []);

  const fetchCustomer = async () => {
    try {
      const response = await customersAPI.getById(id);
      const customer = response.data.data;
      setFormData({
        customerType: customer.customerType || "individual",
        name: customer.name,
        pocName: customer.pocName || "",
        phone: customer.phone,
        gstNumber: customer.gstNumber || "",
        address: customer.address || {
          companyAddress: "",
          city: "",
          state: "",
          postalCode: "",
          country: "India",
        },
      });
      setLoading(false);
    } catch (err) {
      setError("Failed to fetch customer");
      setLoading(false);
    }
  };

  const fetchCreditInvoices = async () => {
    try {
      const response = await fetch(
        `http://localhost:3000/api/customers/${id}/credit`,
      );
      const data = await response.json();
      if (data.success) {
        setCreditData(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch credit invoices:", err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith("address.")) {
      const addressField = name.split(".")[1];
      setFormData({
        ...formData,
        address: {
          ...formData.address,
          [addressField]: value,
        },
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      await customersAPI.update(id, formData);
      router.push("/dashboard/customers");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update customer");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading customer...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link
          href="/dashboard/customers"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <FiArrowLeft className="mr-2" />
          Back to Customers
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Edit Customer</h1>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="bg-white shadow-md rounded-lg p-6">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Basic Information */}
            <div className="sm:col-span-2">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Basic Information
              </h3>
            </div>

            <div>
              <label
                htmlFor="customerType"
                className="block text-sm font-medium text-gray-700"
              >
                Customer Type <span className="text-red-500">*</span>
              </label>
              <select
                name="customerType"
                id="customerType"
                required
                value={formData.customerType}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 bg-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="individual">Individual</option>
                <option value="business">Business</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700"
              >
                {formData.customerType === "business"
                  ? "Business Name"
                  : "Name"}{" "}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                id="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 bg-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="pocName"
                className="block text-sm font-medium text-gray-700"
              >
                POC Name{" "}
                {formData.customerType === "business" && (
                  <span className="text-red-500">*</span>
                )}
              </label>
              <input
                type="text"
                name="pocName"
                id="pocName"
                required={formData.customerType === "business"}
                value={formData.pocName}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 bg-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-gray-700"
              >
                Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                id="phone"
                required
                value={formData.phone}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 bg-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="gstNumber"
                className="block text-sm font-medium text-gray-700"
              >
                GST Number
              </label>
              <input
                type="text"
                name="gstNumber"
                id="gstNumber"
                value={formData.gstNumber}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 bg-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm uppercase"
              />
            </div>

            {/* Address Information */}
            <div className="sm:col-span-2">
              <h3 className="text-lg font-medium text-gray-900 mb-4 mt-4">
                Address
              </h3>
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="address.companyAddress"
                className="block text-sm font-medium text-gray-700"
              >
                Company Address
              </label>
              <input
                type="text"
                name="address.companyAddress"
                id="address.companyAddress"
                value={formData.address.companyAddress}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 bg-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="address.city"
                className="block text-sm font-medium text-gray-700"
              >
                City
              </label>
              <input
                type="text"
                name="address.city"
                id="address.city"
                value={formData.address.city}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 bg-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="address.state"
                className="block text-sm font-medium text-gray-700"
              >
                State/Province
              </label>
              <input
                type="text"
                name="address.state"
                id="address.state"
                value={formData.address.state}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 bg-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="address.postalCode"
                className="block text-sm font-medium text-gray-700"
              >
                Postal Code
              </label>
              <input
                type="text"
                name="address.postalCode"
                id="address.postalCode"
                value={formData.address.postalCode}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 bg-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="address.country"
                className="block text-sm font-medium text-gray-700"
              >
                Country
              </label>
              <input
                type="text"
                name="address.country"
                id="address.country"
                value={formData.address.country}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 bg-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <Link
              href="/dashboard/customers"
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

      {/* Credit Invoices Section */}
      {creditData && creditData.totalCredit > 0 && (
        <div className="mt-6 bg-white shadow-md rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Credit Invoices
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Total Outstanding Credit:{" "}
                <span className="font-bold text-orange-600">
                  ₹{creditData.totalCredit.toFixed(2)}
                </span>
              </p>
            </div>
            <button
              onClick={() => setShowCreditInvoices(!showCreditInvoices)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              {showCreditInvoices ? (
                <>
                  <FiChevronUp className="mr-2" />
                  Hide Invoices
                </>
              ) : (
                <>
                  <FiChevronDown className="mr-2" />
                  Show Invoices ({creditData.creditInvoices.length})
                </>
              )}
            </button>
          </div>

          {showCreditInvoices && (
            <div className="border-t border-gray-200 pt-4">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invoice Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Due Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {creditData.creditInvoices.map((invoice) => (
                    <tr key={invoice._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <Link
                          href={`/dashboard/invoices/${invoice._id}`}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          {invoice.invoiceNumber}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(invoice.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(invoice.dueDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            invoice.status === "Overdue"
                              ? "bg-red-100 text-red-800"
                              : invoice.status === "Partially Paid"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-orange-100 text-orange-800"
                          }`}
                        >
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                        ₹{invoice.totalAmount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
