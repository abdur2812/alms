"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { invoicesAPI, customersAPI, productsAPI } from "@/lib/api";
import { formatINR } from "@/lib/formatters";
import { FiArrowLeft, FiPlus, FiTrash2 } from "react-icons/fi";
import Link from "next/link";

export default function NewInvoicePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({
    customerId: "",
    items: [{ productId: "", quantity: 1, unitPrice: 0 }],
    isIGST: false,
    cgstRate: 9,
    sgstRate: 9,
    igstRate: 18,
    status: "Draft",
  });

  useEffect(() => {
    fetchCustomers();
    fetchProducts();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await customersAPI.getAll({ limit: 100 });
      setCustomers(response.data.data);
    } catch (err) {
      console.error("Failed to fetch customers", err);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await productsAPI.getAll({ limit: 100 });
      setProducts(response.data.data);
    } catch (err) {
      console.error("Failed to fetch products", err);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      setFormData({ ...formData, [name]: checked });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;

    // Auto-fill unit price when product is selected
    if (field === "productId" && value) {
      const product = products.find((p) => p._id === value);
      if (product) {
        newItems[index].unitPrice = product.price;
      }
    }

    setFormData({ ...formData, items: newItems });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { productId: "", quantity: 1, unitPrice: 0 }],
    });
  };

  const removeItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) => {
      return (
        sum +
        (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)
      );
    }, 0);
  };

  const calculateTax = () => {
    const subtotal = calculateSubtotal();
    if (formData.isIGST) {
      return (subtotal * parseFloat(formData.igstRate || 0)) / 100;
    } else {
      const cgst = (subtotal * parseFloat(formData.cgstRate || 0)) / 100;
      const sgst = (subtotal * parseFloat(formData.sgstRate || 0)) / 100;
      return cgst + sgst;
    }
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const invoiceData = {
        customerId: formData.customerId,
        items: formData.items.map((item) => ({
          productId: item.productId,
          quantity: parseInt(item.quantity),
          unitPrice: parseFloat(item.unitPrice),
        })),
        isIGST: formData.isIGST,
        cgstRate: parseFloat(formData.cgstRate),
        sgstRate: parseFloat(formData.sgstRate),
        igstRate: parseFloat(formData.igstRate),
        status: formData.status,
      };

      await invoicesAPI.create(invoiceData);
      router.push("/dashboard/invoices");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create invoice");
    } finally {
      setLoading(false);
    }
  };

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
        <h1 className="mt-2 text-2xl font-bold text-gray-900">
          Create New Invoice
        </h1>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow-md rounded-lg p-6 mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Invoice Details
              </h3>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="customerId"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Customer <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="customerId"
                    id="customerId"
                    required
                    value={formData.customerId}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <option value="">Select a customer</option>
                    {customers.map((customer) => (
                      <option key={customer._id} value={customer._id}>
                        {customer.name} - {customer.email}
                      </option>
                    ))}
                  </select>
                </div>

                {/* GST Toggle */}
                <div className="sm:col-span-2">
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
                      className="ml-2 block text-sm text-gray-900"
                    >
                      Interstate (IGST)
                    </label>
                  </div>
                </div>

                {/* IGST Field - shown when IGST is enabled */}
                {formData.isIGST ? (
                  <div className="sm:col-span-2">
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
                    {/* CGST and SGST Fields - shown when IGST is disabled */}
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
                        max="50"
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
                        max="50"
                        step="0.01"
                        value={formData.sgstRate}
                        onChange={handleChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    </div>
                  </>
                )}

                <div className="sm:col-span-2">
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
            </div>

            {/* Items */}
            <div className="bg-white shadow-md rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Invoice Items
                </h3>
                <button
                  type="button"
                  onClick={addItem}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-600 bg-indigo-50 hover:bg-indigo-100"
                >
                  <FiPlus className="mr-2" />
                  Add Item
                </button>
              </div>

              <div className="space-y-4">
                {formData.items.map((item, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-12 gap-4 items-end border-b pb-4"
                  >
                    <div className="col-span-12 sm:col-span-5">
                      <label className="block text-sm font-medium text-gray-700">
                        Product <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={item.productId}
                        onChange={(e) =>
                          handleItemChange(index, "productId", e.target.value)
                        }
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      >
                        <option value="">Select product</option>
                        {products.map((product) => (
                          <option key={product._id} value={product._id}>
                            {product.name} ({formatINR(product.price)})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-5 sm:col-span-3">
                      <label className="block text-sm font-medium text-gray-700">
                        Quantity <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange(index, "quantity", e.target.value)
                        }
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    </div>

                    <div className="col-span-5 sm:col-span-3">
                      <label className="block text-sm font-medium text-gray-700">
                        Unit Price <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) =>
                          handleItemChange(index, "unitPrice", e.target.value)
                        }
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      {formData.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="inline-flex items-center justify-center w-full px-3 py-2 border border-transparent text-sm font-medium rounded-md text-red-600 bg-red-50 hover:bg-red-100"
                        >
                          <FiTrash2 />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow-md rounded-lg p-6 sticky top-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Summary
              </h3>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">
                    {formatINR(calculateSubtotal())}
                  </span>
                </div>

                {formData.isIGST ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      IGST ({formData.igstRate}%):
                    </span>
                    <span className="font-medium">
                      {formatINR(calculateTax())}
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        CGST ({formData.cgstRate}%):
                      </span>
                      <span className="font-medium">
                        {formatINR(
                          (calculateSubtotal() *
                            parseFloat(formData.cgstRate || 0)) /
                            100,
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        SGST ({formData.sgstRate}%):
                      </span>
                      <span className="font-medium">
                        {formatINR(
                          (calculateSubtotal() *
                            parseFloat(formData.sgstRate || 0)) /
                            100,
                        )}
                      </span>
                    </div>
                  </>
                )}

                <div className="border-t pt-3 flex justify-between">
                  <span className="text-base font-semibold">Total:</span>
                  <span className="text-xl font-bold text-indigo-600">
                    {formatINR(calculateTotal())}
                  </span>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {loading ? "Creating..." : "Create Invoice"}
                </button>

                <Link
                  href="/dashboard/invoices"
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </Link>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
