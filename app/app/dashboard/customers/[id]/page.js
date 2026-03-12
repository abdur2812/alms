"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { customersAPI, invoicesAPI } from "@/lib/api";
import {
  FiUser,
  FiMapPin,
  FiSave,
  FiX,
  FiCheck,
  FiEye,
  FiEdit2,
  FiDollarSign,
  FiChevronDown,
  FiChevronUp,
  FiTruck,
} from "react-icons/fi";
import Link from "next/link";
import { PageHeader, Card, CardBody, Button } from "@/components/UI";

const inputClass =
  "w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-white";

const selectClass =
  "w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-white";

const labelClass = "block text-sm font-medium text-gray-700 mb-2";

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
    phone: "",
    gstNumber: "",
    permanentAddress: {
      companyAddress: "",
      city: "",
      state: "",
      postalCode: "",
      country: "India",
    },
    shippingAddress: {
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

      const hasPermanentDetails =
        customer.permanentAddress?.companyAddress ||
        customer.permanentAddress?.city ||
        customer.permanentAddress?.state;

      const permanentAddress = hasPermanentDetails
        ? customer.permanentAddress
        : customer.address || {
            companyAddress: "",
            city: "",
            state: "",
            postalCode: "",
            country: "India",
          };

      const hasShippingDetails =
        customer.shippingAddress?.companyAddress ||
        customer.shippingAddress?.city ||
        customer.shippingAddress?.state;

      const shippingAddress = hasShippingDetails
        ? customer.shippingAddress
        : customer.address || {
            companyAddress: "",
            city: "",
            state: "",
            postalCode: "",
            country: "India",
          };

      setFormData({
        customerType: customer.customerType || "individual",
        name: customer.name,
        phone: customer.phone,
        gstNumber: customer.gstNumber || "",
        permanentAddress,
        shippingAddress,
      });
      setLoading(false);
    } catch (err) {
      setError("Failed to fetch customer");
      setLoading(false);
    }
  };

  const fetchCreditInvoices = async () => {
    try {
      const response = await customersAPI.getCredit(id);
      if (response.data.success) {
        setCreditData(response.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch credit invoices:", err);
    }
  };

  const markAsPaid = async (invoiceId) => {
    if (!confirm("Mark this invoice as paid?")) return;
    try {
      await invoicesAPI.update(invoiceId, { status: "Paid" });
      fetchCreditInvoices();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to mark as paid");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith("permanentAddress.")) {
      const addressField = name.split(".")[1];
      setFormData({
        ...formData,
        permanentAddress: { ...formData.permanentAddress, [addressField]: value },
      });
    } else if (name.startsWith("shippingAddress.")) {
      const addressField = name.split(".")[1];
      setFormData({
        ...formData,
        shippingAddress: { ...formData.shippingAddress, [addressField]: value },
      });
    } else if (name.startsWith("address.")) {
      const addressField = name.split(".")[1];
      setFormData({
        ...formData,
        address: { ...formData.address, [addressField]: value },
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
      <div className="min-h-screen bg-linear-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-14 w-14 border-4 border-indigo-200 border-t-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading customer...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <PageHeader
        title="Edit Customer"
        subtitle={`Updating details for ${formData.name || "customer"}`}
        backLink="/dashboard/customers"
      />

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
          <FiX className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info Card */}
        <Card className="animate-fadeIn">
          <CardBody>
            <h3 className="text-base font-semibold text-gray-900 mb-5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
                <FiUser className="text-white h-4 w-4" />
              </div>
              Basic Information
            </h3>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className={labelClass}>
                  Customer Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="customerType"
                  required
                  value={formData.customerType}
                  onChange={handleChange}
                  className={selectClass}
                >
                  <option value="individual">Individual</option>
                  <option value="business">Business</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>
                  {formData.customerType === "business" ? "Business Name" : "Name"}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter name"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+91 1234567890"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>GST Number</label>
                <input
                  type="text"
                  name="gstNumber"
                  value={formData.gstNumber}
                  onChange={handleChange}
                  placeholder="e.g., 22AAAAA0000A1Z5"
                  className={`${inputClass} uppercase`}
                />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Permanent Address Card */}
        <Card className="animate-fadeIn">
          <CardBody>
            <h3 className="text-base font-semibold text-gray-900 mb-5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-linear-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-md">
                <FiMapPin className="text-white h-4 w-4" />
              </div>
              Permanent Address
            </h3>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelClass}>Company / Street Address</label>
                <input
                  type="text"
                  name="permanentAddress.companyAddress"
                  value={formData.permanentAddress.companyAddress}
                  onChange={handleChange}
                  placeholder="Full address"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>City</label>
                <input
                  type="text"
                  name="permanentAddress.city"
                  value={formData.permanentAddress.city}
                  onChange={handleChange}
                  placeholder="City name"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>State / Province</label>
                <input
                  type="text"
                  name="permanentAddress.state"
                  value={formData.permanentAddress.state}
                  onChange={handleChange}
                  placeholder="State or Province"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Postal Code</label>
                <input
                  type="text"
                  name="permanentAddress.postalCode"
                  value={formData.permanentAddress.postalCode}
                  onChange={handleChange}
                  placeholder="Postal / ZIP code"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Country</label>
                <input
                  type="text"
                  name="permanentAddress.country"
                  value={formData.permanentAddress.country}
                  onChange={handleChange}
                  placeholder="Country"
                  className={inputClass}
                />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Shipping Address Card */}
        <Card className="animate-fadeIn">
          <CardBody>
            <h3 className="text-base font-semibold text-gray-900 mb-5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-linear-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-md">
                <FiTruck className="text-white h-4 w-4" />
              </div>
              Shipping Address
            </h3>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelClass}>Company / Street Address</label>
                <input
                  type="text"
                  name="shippingAddress.companyAddress"
                  value={formData.shippingAddress.companyAddress}
                  onChange={handleChange}
                  placeholder="Full address"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>City</label>
                <input
                  type="text"
                  name="shippingAddress.city"
                  value={formData.shippingAddress.city}
                  onChange={handleChange}
                  placeholder="City name"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>State / Province</label>
                <input
                  type="text"
                  name="shippingAddress.state"
                  value={formData.shippingAddress.state}
                  onChange={handleChange}
                  placeholder="State or Province"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Postal Code</label>
                <input
                  type="text"
                  name="shippingAddress.postalCode"
                  value={formData.shippingAddress.postalCode}
                  onChange={handleChange}
                  placeholder="Postal / ZIP code"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Country</label>
                <input
                  type="text"
                  name="shippingAddress.country"
                  value={formData.shippingAddress.country}
                  onChange={handleChange}
                  placeholder="Country"
                  className={inputClass}
                />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pb-2">
          <Link href="/dashboard/customers">
            <Button variant="secondary">
              <FiX className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={saving} variant="primary">
            <FiSave className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>

      {/* Credit Invoices Section */}
      {creditData && creditData.totalCredit > 0 && (
        <Card className="mt-6 animate-fadeIn">
          <CardBody>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-linear-to-br from-orange-400 to-red-500 flex items-center justify-center shadow-md">
                  <FiDollarSign className="text-white h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    Credit Invoices
                  </h3>
                  <p className="text-sm text-gray-500">
                    Outstanding:{" "}
                    <span className="font-bold text-orange-600">
                      ₹{creditData.totalCredit.toFixed(2)}
                    </span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreditInvoices(!showCreditInvoices)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-orange-200 bg-orange-50 text-orange-700 text-sm font-semibold hover:bg-orange-100 transition-all duration-200"
              >
                {showCreditInvoices ? (
                  <>
                    <FiChevronUp className="h-4 w-4" />
                    Hide
                  </>
                ) : (
                  <>
                    <FiChevronDown className="h-4 w-4" />
                    Show ({creditData.creditInvoices.length})
                  </>
                )}
              </button>
            </div>

            {showCreditInvoices && (
              <div className="mt-5 overflow-x-auto rounded-xl border border-gray-100">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead>
                    <tr className="bg-linear-to-r from-indigo-600 to-purple-600">
                      <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                        Invoice #
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                        Due Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-white uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-white uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-50">
                    {creditData.creditInvoices.map((invoice) => (
                      <tr
                        key={invoice._id}
                        className="hover:bg-indigo-50/30 transition-colors duration-150"
                      >
                        <td className="px-4 py-3 text-sm font-semibold text-indigo-600">
                          <Link
                            href={`/dashboard/invoices/${invoice._id}`}
                            className="hover:text-indigo-900 transition-colors"
                          >
                            {invoice.invoiceNumber}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {new Date(invoice.date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {new Date(invoice.dueDate).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`px-2.5 py-1 inline-flex text-xs font-semibold rounded-full ${
                              invoice.status === "Overdue"
                                ? "bg-red-100 text-red-700"
                                : invoice.status === "Partially Paid"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-orange-100 text-orange-700"
                            }`}
                          >
                            {invoice.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-bold text-gray-900">
                          ₹{invoice.totalAmount.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            <button
                              type="button"
                              onClick={() => markAsPaid(invoice._id)}
                              className="inline-flex items-center px-2.5 py-1.5 bg-linear-to-r from-green-500 to-emerald-600 text-white text-xs font-semibold rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
                              title="Mark as Paid"
                            >
                              <FiCheck className="h-3 w-3 mr-1" />
                              Paid
                            </button>
                            <Link
                              href={`/dashboard/invoices/${invoice._id}/view`}
                              className="inline-flex items-center px-2.5 py-1.5 bg-linear-to-r from-indigo-500 to-purple-600 text-white text-xs font-semibold rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
                              title="View PDF"
                            >
                              <FiEye className="h-3 w-3 mr-1" />
                              PDF
                            </Link>
                            <Link
                              href={`/dashboard/invoices/${invoice._id}/edit`}
                              className="inline-flex items-center px-2.5 py-1.5 bg-linear-to-r from-gray-500 to-gray-600 text-white text-xs font-semibold rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
                              title="Edit Invoice"
                            >
                              <FiEdit2 className="h-3 w-3 mr-1" />
                              Edit
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
