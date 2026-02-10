"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { invoicesAPI, customersAPI, productsAPI } from "@/lib/api";
import { formatINR } from "@/lib/formatters";
import { FiFileText, FiPlus, FiTrash2 } from "react-icons/fi";
import Link from "next/link";
import {
  PageHeader,
  Card,
  CardBody,
  Input,
  Select,
  Dropdown,
  Button,
} from "@/components/UI";

export default function NewInvoicePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({
    customerId: "",
    items: [{ productId: "", name: "", quantity: 1, unitPrice: 0, gst: 0 }],
    isGstBill: true,
    billType: "pay",
    status: "Draft",
  });
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  useEffect(() => {
    fetchCustomers();
    fetchProducts();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await customersAPI.getAll({ limit: 3 });
      setCustomers(response.data.data);
    } catch (err) {
      console.error("Failed to fetch customers", err);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await productsAPI.getAll({ limit: 3 });
      setProducts(response.data.data);
    } catch (err) {
      console.error("Failed to fetch products", err);
    }
  };

  const searchCustomers = async (searchTerm) => {
    const response = await customersAPI.getAll({
      limit: 50,
      search: searchTerm,
    });
    return response.data.data.map((customer) => ({
      value: customer._id,
      label: `${customer.name}${customer.phone ? ` - ${customer.phone}` : ""}`,
    }));
  };

  const searchProducts = async (searchTerm) => {
    const response = await productsAPI.getAll({
      limit: 50,
      search: searchTerm,
    });
    return response.data.data.map((product) => ({
      value: product._id,
      label: `${product.name} (${formatINR(product.price)})`,
    }));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      setFormData({ ...formData, [name]: checked });
    } else {
      setFormData({ ...formData, [name]: value });

      // Auto-fill customer details when customer is selected
      if (name === "customerId" && value) {
        const customer = customers.find((c) => c._id === value);
        setSelectedCustomer(customer);
      }
    }
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;

    // Auto-fill unit price, name, and GST when product is selected
    if (field === "productId" && value) {
      const product = products.find((p) => p._id === value);
      if (product) {
        newItems[index].unitPrice = product.price;
        newItems[index].name = product.name;
        newItems[index].gst = product.gst || 0;
      }
    }

    setFormData({ ...formData, items: newItems });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        { productId: "", name: "", quantity: 1, unitPrice: 0, gst: 0 },
      ],
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
    return formData.items.reduce((sum, item) => {
      const itemSubtotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0);
      const itemGst = (itemSubtotal * (parseFloat(item.gst) || 0)) / 100;
      return sum + itemGst;
    }, 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Filter out empty items
      const validItems = formData.items.filter(
        (item) => item.productId && item.quantity > 0,
      );

      if (validItems.length === 0) {
        setError("Please add at least one product to the invoice");
        setLoading(false);
        return;
      }

      const invoiceData = {
        customerId: formData.customerId,
        items: validItems.map((item) => ({
          productId: item.productId,
          name: item.name,
          quantity: parseInt(item.quantity),
          unitPrice: parseFloat(item.unitPrice),
          gst: parseFloat(item.gst) || 0,
        })),
        isGstBill: formData.isGstBill,
        billType: formData.billType,
        status: formData.status,
      };

      console.log("Submitting invoice data:", invoiceData);

      await invoicesAPI.create(invoiceData);
      router.push("/dashboard/invoices");
    } catch (err) {
      console.error("Invoice creation error:", err);
      setError(err.response?.data?.message || "Failed to create invoice");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <PageHeader
        title="Create New Invoice"
        subtitle="Generate a new invoice for customer"
        backLink="/dashboard/invoices"
      />

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg animate-shake">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="animate-fadeIn">
              <CardBody>
                <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mr-3">
                    <FiFileText className="text-white" />
                  </div>
                  Invoice Details
                </h3>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Dropdown
                      label="Customer"
                      name="customerId"
                      value={formData.customerId}
                      onChange={handleChange}
                      placeholder="Select a customer"
                      options={customers.map((customer) => ({
                        value: customer._id,
                        label: `${customer.name}${customer.phone ? ` - ${customer.phone}` : ""}`,
                      }))}
                      onSearch={searchCustomers}
                      required
                    />
                  </div>

                  {/* Customer Auto-filled Details */}
                  {selectedCustomer && (
                    <div className="sm:col-span-2 p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">
                        Customer Details
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-600">Name:</span>
                          <p className="font-medium text-gray-900">
                            {selectedCustomer.name}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600">Phone:</span>
                          <p className="font-medium text-gray-900">
                            {selectedCustomer.phone || "-"}
                          </p>
                        </div>
                        {selectedCustomer.gstNumber && (
                          <div>
                            <span className="text-gray-600">GST Number:</span>
                            <p className="font-medium text-gray-900 uppercase">
                              {selectedCustomer.gstNumber}
                            </p>
                          </div>
                        )}
                        {selectedCustomer.address && (
                          <div className="col-span-2">
                            <span className="text-gray-600">Address:</span>
                            <p className="font-medium text-gray-900">
                              {[
                                selectedCustomer.address.companyAddress,
                                selectedCustomer.address.city,
                                selectedCustomer.address.state,
                                selectedCustomer.address.postalCode,
                                selectedCustomer.address.country,
                              ]
                                .filter(Boolean)
                                .join(", ")}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Bill Type */}
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

                  {/* GST Bill Toggle */}
                  <div className="sm:col-span-2">
                    <label className="flex items-center cursor-pointer group">
                      <input
                        type="checkbox"
                        name="isGstBill"
                        id="isGstBill"
                        checked={formData.isGstBill}
                        onChange={handleChange}
                        className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-all group-hover:scale-110"
                      />
                      <span className="ml-3 text-sm font-medium text-gray-900">
                        GST Bill (GST rates will be taken from individual products)
                      </span>
                    </label>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Items */}
            <Card>
              <CardBody>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mr-3">
                      <FiPlus className="text-white" />
                    </div>
                    Invoice Items
                  </h3>
                  <Button
                    type="button"
                    onClick={addItem}
                    variant="secondary"
                    size="sm"
                  >
                    <FiPlus className="mr-2" />
                    Add Item
                  </Button>
                </div>

                <div className="space-y-4">
                  {formData.items.map((item, index) => (
                    <div
                      key={index}
                      className="p-4 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl border border-gray-200 space-y-4"
                    >
                      <div className="flex items-end gap-4">
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <Dropdown
                            label="Search Product"
                            name="productId"
                            value={item.productId}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "productId",
                                e.target.value,
                              )
                            }
                            placeholder="Select product"
                            options={products.map((product) => ({
                              value: product._id,
                              label: `${product.name} (${formatINR(product.price)})`,
                            }))}
                            onSearch={searchProducts}
                            required
                          />
                          <Input
                            label="Item Name / Description"
                            type="text"
                            value={item.name}
                            onChange={(e) =>
                              handleItemChange(index, "name", e.target.value)
                            }
                            placeholder="Product name on invoice"
                            required
                          />
                        </div>

                        {formData.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="h-10 px-3 flex items-center justify-center text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-100"
                            title="Remove item"
                          >
                            <FiTrash2 />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <Input
                          label="Quantity"
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            handleItemChange(index, "quantity", e.target.value)
                          }
                          required
                        />
                        <Input
                          label="Unit Price (₹)"
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) =>
                            handleItemChange(index, "unitPrice", e.target.value)
                          }
                          required
                        />
                        <Input
                          label="GST (%)"
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={item.gst}
                          onChange={(e) =>
                            handleItemChange(index, "gst", e.target.value)
                          }
                          required
                          disabled
                          className="bg-gray-50"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Summary Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6 animate-fadeIn">
              <CardBody>
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  Summary
                </h3>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-semibold text-gray-900">
                      {formatINR(calculateSubtotal())}
                    </span>
                  </div>

                  {formData.isGstBill && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Tax:</span>
                      <span className="font-semibold text-gray-900">
                        {formatINR(calculateTax())}
                      </span>
                    </div>
                  )}

                  <div className="border-t border-gray-200 pt-3 mt-3 flex justify-between">
                    <span className="text-base font-semibold text-gray-900">
                      Total:
                    </span>
                    <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      {formatINR(calculateTotal())}
                    </span>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Creating...
                      </>
                    ) : (
                      <>
                        <FiFileText className="mr-2" />
                        Create Invoice
                      </>
                    )}
                  </Button>

                  <Link href="/dashboard/invoices" className="block">
                    <Button variant="secondary" className="w-full">
                      Cancel
                    </Button>
                  </Link>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
