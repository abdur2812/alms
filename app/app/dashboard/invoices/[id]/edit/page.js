"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { invoicesAPI, customersAPI, productsAPI } from "@/lib/api";
import { formatINR } from "@/lib/formatters";
import { FiPlus, FiTrash2, FiFileText } from "react-icons/fi";
import Link from "next/link";
import {
  PageHeader,
  Card,
  CardBody,
  Input,
  Button,
  NumberInput,
  Dropdown,
} from "@/components/UI";

export default function FullEditInvoicePage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({
    customerData: {
      name: "",
      phone: "",
      gstNumber: "",
      address: {
        companyAddress: "",
        city: "",
        state: "",
        postalCode: "",
        country: "India",
      },
    },
    items: [],
    isGstBill: true,
    billType: "pay",
  });

  useEffect(() => {
    fetchInvoice();
    fetchCustomers();
    fetchProducts();
  }, []);

  const fetchInvoice = async () => {
    try {
      const response = await invoicesAPI.getById(id);
      const invoice = response.data.data;

      // Populate form with invoice data
      const customerData = invoice.customerData || {
        name: invoice.customerId?.name || "",
        phone: invoice.customerId?.phone || "",
        gstNumber: invoice.customerId?.gstNumber || "",
        address: {
          companyAddress: "",
          city: "",
          state: "",
          postalCode: "",
          country: "India",
        },
      };

      // Ensure address object exists with all properties
      if (!customerData.address) {
        customerData.address = {
          companyAddress: "",
          city: "",
          state: "",
          postalCode: "",
          country: "India",
        };
      } else {
        customerData.address = {
          companyAddress:
            customerData.address.companyAddress ||
            invoice.customerId?.address?.companyAddress ||
            "",
          city:
            customerData.address.city ||
            invoice.customerId?.address?.city ||
            "",
          state:
            customerData.address.state ||
            invoice.customerId?.address?.state ||
            "",
          postalCode:
            customerData.address.postalCode ||
            invoice.customerId?.address?.postalCode ||
            "",
          country:
            customerData.address.country ||
            invoice.customerId?.address?.country ||
            "India",
        };
      }

      setFormData({
        customerData,
        items: invoice.items.map((item) => ({
          productId: item.productId?._id || null,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          gst: item.gst,
          hsnCode: item.hsnCode || "",
        })),
        isGstBill: invoice.isGstBill !== undefined ? invoice.isGstBill : true,
        billType: invoice.billType || "pay",
      });
      setLoading(false);
    } catch (err) {
      setError("Failed to fetch invoice");
      setLoading(false);
    }
  };

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

  const handleCustomerDataChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith("address.")) {
      const addressField = name.split(".")[1];
      setFormData({
        ...formData,
        customerData: {
          ...formData.customerData,
          address: {
            ...formData.customerData.address,
            [addressField]: value,
          },
        },
      });
    } else {
      setFormData({
        ...formData,
        customerData: {
          ...formData.customerData,
          [name]: value,
        },
      });
    }
  };

  const handleItemChange = async (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;

    // Auto-fill product details when product is selected
    if (field === "productId" && value) {
      try {
        const response = await productsAPI.getById(value);
        const product = response.data.data;
        newItems[index].name = product.name;
        newItems[index].unitPrice = product.price;
        newItems[index].gst = product.gst;
        newItems[index].hsnCode = product.hsnCode || "";
      } catch (err) {
        console.error("Failed to fetch product details", err);
      }
    }

    setFormData({ ...formData, items: newItems });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          productId: null,
          name: "",
          quantity: 1,
          unitPrice: 0,
          gst: 0,
          hsnCode: "",
        },
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
      const itemSubtotal =
        (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0);
      const itemGst = (itemSubtotal * (parseFloat(item.gst) || 0)) / 100;
      return sum + itemGst;
    }, 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      // Validate
      if (!formData.customerData.name) {
        setError("Customer name is required");
        setSaving(false);
        return;
      }

      if (formData.items.length === 0) {
        setError("At least one item is required");
        setSaving(false);
        return;
      }

      const updateData = {
        customerData: formData.customerData,
        items: formData.items.map((item) => ({
          productId: item.productId,
          name: item.name,
          quantity: parseInt(item.quantity),
          unitPrice: parseFloat(item.unitPrice),
          gst: parseFloat(item.gst),
          hsnCode: item.hsnCode,
        })),
        billType: formData.billType,
      };

      await invoicesAPI.update(id, updateData);
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
        subtitle="Update customer details, products, and invoice settings"
        backLink="/dashboard/invoices"
      />

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg animate-shake">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Details */}
            <Card>
              <CardBody>
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  Customer Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Customer Name"
                    name="name"
                    value={formData.customerData.name}
                    onChange={handleCustomerDataChange}
                    placeholder="Enter customer name"
                    required
                  />
                  <Input
                    label="Phone"
                    name="phone"
                    value={formData.customerData.phone}
                    onChange={handleCustomerDataChange}
                    placeholder="Phone number"
                  />
                  <Input
                    label="GST Number"
                    name="gstNumber"
                    value={formData.customerData.gstNumber}
                    onChange={handleCustomerDataChange}
                    placeholder="GST Number"
                  />
                  <Input
                    label="Company Address"
                    name="address.companyAddress"
                    value={formData.customerData.address.companyAddress}
                    onChange={handleCustomerDataChange}
                    placeholder="Company address"
                  />
                  <Input
                    label="City"
                    name="address.city"
                    value={formData.customerData.address.city}
                    onChange={handleCustomerDataChange}
                    placeholder="City"
                  />
                  <Input
                    label="State"
                    name="address.state"
                    value={formData.customerData.address.state}
                    onChange={handleCustomerDataChange}
                    placeholder="State"
                  />
                  <Input
                    label="Postal Code"
                    name="address.postalCode"
                    value={formData.customerData.address.postalCode}
                    onChange={handleCustomerDataChange}
                    placeholder="Postal code"
                  />
                  <Input
                    label="Country"
                    name="address.country"
                    value={formData.customerData.address.country}
                    onChange={handleCustomerDataChange}
                    placeholder="Country"
                  />
                </div>
              </CardBody>
            </Card>

            {/* Invoice Items */}
            <Card>
              <CardBody>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">
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
                            label="Product (optional)"
                            value={item.productId || ""}
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
                          />
                          <Input
                            label="Product Name"
                            type="text"
                            value={item.name}
                            onChange={(e) =>
                              handleItemChange(index, "name", e.target.value)
                            }
                            placeholder="Enter product name"
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

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <NumberInput
                          label="Quantity"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            handleItemChange(index, "quantity", e.target.value)
                          }
                          required
                        />
                        <NumberInput
                          label="Unit Price (₹)"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) =>
                            handleItemChange(index, "unitPrice", e.target.value)
                          }
                          prefix="₹"
                          required
                        />
                        <NumberInput
                          label="GST (%)"
                          min="0"
                          max="100"
                          step="0.01"
                          value={item.gst}
                          onChange={(e) =>
                            handleItemChange(index, "gst", e.target.value)
                          }
                          required
                        />
                        <Input
                          label="HSN Code"
                          type="text"
                          value={item.hsnCode}
                          onChange={(e) =>
                            handleItemChange(index, "hsnCode", e.target.value)
                          }
                          placeholder="HSN"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>

            {/* Invoice Settings */}
            <Card>
              <CardBody>
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  Invoice Settings
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Dropdown
                    label="Bill Type"
                    name="billType"
                    value={formData.billType}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        billType: e.target.value,
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
              </CardBody>
            </Card>
          </div>

          {/* Summary Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
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
                  <Button type="submit" disabled={saving} className="w-full">
                    {saving ? "Saving..." : "Save Changes"}
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
