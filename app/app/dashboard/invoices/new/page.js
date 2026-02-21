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
  NumberInput,
} from "@/components/UI";

export default function NewInvoicePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({
    customerId: "",
    items: [
      {
        productId: "",
        name: "",
        quantity: 1,
        unitPrice: 0,
        gst: 0,
        hsnCode: "",
        isNewProduct: false,
      },
    ],
    isGstBill: true,
    billType: "pay",
  });
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [usePermanentAddress, setUsePermanentAddress] = useState(true);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({
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
  });

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

  const handleItemChange = async (index, field, value) => {
    console.log(
      `=== HANDLE ITEM CHANGE: index=${index}, field=${field}, value=${value} ===`,
    );
    const newItems = [...formData.items];
    newItems[index][field] = value;

    // Auto-fill unit price, name, and GST when product is selected
    if (field === "productId" && value) {
      let product = products.find((p) => p._id === value);
      console.log("Product found in local array:", product);

      // If product not found in local array, fetch it from API
      if (!product) {
        try {
          console.log("Fetching product from API...");
          const response = await productsAPI.getById(value);
          product = response.data.data;
          console.log("Fetched product from API:", product);
          // Add to local products array for future use
          setProducts((prev) => [...prev, product]);
        } catch (err) {
          console.error("Failed to fetch product details", err);
        }
      }

      if (product) {
        console.log("Auto-filling product details:", {
          name: product.name,
          price: product.price,
          gst: product.gst,
          hsnCode: product.hsnCode,
          gstType: typeof product.gst,
          productData: product,
        });
        newItems[index].unitPrice = Number(product.price) || 0;
        newItems[index].name = product.name || "";
        newItems[index].gst = Number(product.gst) || 0;
        newItems[index].hsnCode = product.hsnCode || "";
        console.log("Updated item after auto-fill:", newItems[index]);
      } else {
        console.warn("Product not found!");
      }
    }

    console.log("Final items array:", newItems);
    setFormData({ ...formData, items: newItems });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          productId: "",
          name: "",
          quantity: 1,
          unitPrice: 0,
          gst: 0,
          hsnCode: "",
          isNewProduct: false,
        },
      ],
    });
  };

  const handleNewCustomerChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith("address.")) {
      const addressField = name.split(".")[1];
      setNewCustomerData({
        ...newCustomerData,
        address: {
          ...newCustomerData.address,
          [addressField]: value,
        },
      });
    } else {
      setNewCustomerData({ ...newCustomerData, [name]: value });
    }
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
    setLoading(true);
    setError("");

    try {
      // Validate customer data
      if (!isNewCustomer && !formData.customerId) {
        setError("Please select a customer or enter new customer details");
        setLoading(false);
        return;
      }

      if (isNewCustomer && !newCustomerData.name) {
        setError("Please enter customer name");
        setLoading(false);
        return;
      }

      // Filter out empty items - either has productId OR is new product with required fields
      const validItems = formData.items.filter((item) => {
        if (item.isNewProduct) {
          return item.name && item.quantity > 0 && item.unitPrice >= 0;
        }
        return item.productId && item.quantity > 0;
      });

      if (validItems.length === 0) {
        setError("Please add at least one product to the invoice");
        setLoading(false);
        return;
      }

      // Prepare customer data snapshot
      let customerData;
      if (isNewCustomer) {
        customerData = {
          name: newCustomerData.name,
          phone: newCustomerData.phone,
          gstNumber: newCustomerData.gstNumber,
          address: newCustomerData.address,
          shippingAddress: newCustomerData.address,
          sameAsPermanent: true,
        };
      } else {
        customerData = selectedCustomer
          ? {
              name: selectedCustomer.name,
              phone: selectedCustomer.phone,
              gstNumber: selectedCustomer.gstNumber,
              address:
                selectedCustomer.permanentAddress || selectedCustomer.address,
              shippingAddress: usePermanentAddress
                ? selectedCustomer.permanentAddress || selectedCustomer.address
                : selectedCustomer.shippingAddress ||
                  selectedCustomer.permanentAddress ||
                  selectedCustomer.address,
              sameAsPermanent: usePermanentAddress,
            }
          : null;
      }

      const invoiceData = {
        customerId: isNewCustomer ? null : formData.customerId,
        customerData,
        items: validItems.map((item) => ({
          productId: item.isNewProduct ? null : item.productId,
          name: item.name,
          quantity: parseInt(item.quantity),
          unitPrice: parseFloat(item.unitPrice),
          gst: parseFloat(item.gst) || 0,
          hsnCode: item.hsnCode || "",
        })),
        isGstBill: formData.isGstBill,
        billType: formData.billType,
      };

      console.log("=== SUBMITTING INVOICE ===");
      console.log("Form data:", formData);
      console.log("Invoice data to submit:", invoiceData);
      console.log(
        "Items with GST:",
        invoiceData.items.map((item) => ({
          name: item.name,
          gst: item.gst,
          gstType: typeof item.gst,
        })),
      );

      const response = await invoicesAPI.create(invoiceData);
      console.log("Invoice created successfully:", response.data);
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
                  {/* Customer Type Toggle */}
                  <div className="sm:col-span-2">
                    <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <label className="flex items-center cursor-pointer group">
                        <input
                          type="radio"
                          name="customerType"
                          checked={!isNewCustomer}
                          onChange={() => setIsNewCustomer(false)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <span className="ml-2 text-sm font-medium text-gray-900">
                          Existing Customer
                        </span>
                      </label>
                      <label className="flex items-center cursor-pointer group">
                        <input
                          type="radio"
                          name="customerType"
                          checked={isNewCustomer}
                          onChange={() => setIsNewCustomer(true)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <span className="ml-2 text-sm font-medium text-gray-900">
                          New Customer (One-time)
                        </span>
                      </label>
                    </div>
                  </div>

                  {!isNewCustomer ? (
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
                  ) : (
                    <>
                      <Input
                        label="Customer Name"
                        name="name"
                        value={newCustomerData.name}
                        onChange={handleNewCustomerChange}
                        placeholder="Enter customer name"
                        required
                      />
                      <Input
                        label="Phone Number"
                        name="phone"
                        value={newCustomerData.phone}
                        onChange={handleNewCustomerChange}
                        placeholder="+91 1234567890"
                      />
                      <Input
                        label="GST Number"
                        name="gstNumber"
                        value={newCustomerData.gstNumber}
                        onChange={handleNewCustomerChange}
                        placeholder="22AAAAA0000A1Z5"
                        className="uppercase"
                      />
                      <div className="sm:col-span-2">
                        <Input
                          label="Address"
                          name="address.companyAddress"
                          value={newCustomerData.address.companyAddress}
                          onChange={handleNewCustomerChange}
                          placeholder="Full address"
                        />
                      </div>
                      <Input
                        label="City"
                        name="address.city"
                        value={newCustomerData.address.city}
                        onChange={handleNewCustomerChange}
                        placeholder="City"
                      />
                      <Input
                        label="State"
                        name="address.state"
                        value={newCustomerData.address.state}
                        onChange={handleNewCustomerChange}
                        placeholder="State"
                      />
                    </>
                  )}

                  {/* Customer Auto-filled Details */}
                  {!isNewCustomer && selectedCustomer && (
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
                        {(selectedCustomer.permanentAddress ||
                          selectedCustomer.address) && (
                          <div className="col-span-2">
                            <span className="text-gray-600">
                              Permanent Address:
                            </span>
                            <p className="font-medium text-gray-900">
                              {[
                                (
                                  selectedCustomer.permanentAddress ||
                                  selectedCustomer.address
                                ).companyAddress,
                                (
                                  selectedCustomer.permanentAddress ||
                                  selectedCustomer.address
                                ).city,
                                (
                                  selectedCustomer.permanentAddress ||
                                  selectedCustomer.address
                                ).state,
                                (
                                  selectedCustomer.permanentAddress ||
                                  selectedCustomer.address
                                ).postalCode,
                                (
                                  selectedCustomer.permanentAddress ||
                                  selectedCustomer.address
                                ).country,
                              ]
                                .filter(Boolean)
                                .join(", ")}
                            </p>
                          </div>
                        )}
                        {selectedCustomer.shippingAddress && (
                          <div className="col-span-2">
                            <span className="text-gray-600">
                              Shipping Address:
                            </span>
                            <p className="font-medium text-gray-900">
                              {[
                                selectedCustomer.shippingAddress.companyAddress,
                                selectedCustomer.shippingAddress.city,
                                selectedCustomer.shippingAddress.state,
                                selectedCustomer.shippingAddress.postalCode,
                                selectedCustomer.shippingAddress.country,
                              ]
                                .filter(Boolean)
                                .join(", ")}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Shipping Address Selection */}
                      <div className="mt-3 pt-3 border-t border-blue-200">
                        <label className="flex items-center cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={usePermanentAddress}
                            onChange={(e) =>
                              setUsePermanentAddress(e.target.checked)
                            }
                            className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-all group-hover:scale-110"
                          />
                          <span className="ml-3 text-sm font-medium text-gray-900">
                            Use Permanent Address for Shipping
                          </span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Bill Type */}
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
                        GST Bill (GST rates will be taken from individual
                        products)
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
                      {/* Product Type Toggle */}
                      <div className="flex items-center gap-4 p-2 bg-white rounded-lg border border-gray-200">
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            checked={!item.isNewProduct}
                            onChange={() => {
                              const newItems = [...formData.items];
                              newItems[index].isNewProduct = false;
                              newItems[index].productId = "";
                              setFormData({ ...formData, items: newItems });
                            }}
                            className="h-4 w-4 text-purple-600 focus:ring-purple-500"
                          />
                          <span className="ml-2 text-sm font-medium text-gray-800">
                            Existing Product
                          </span>
                        </label>
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            checked={item.isNewProduct}
                            onChange={() => {
                              const newItems = [...formData.items];
                              newItems[index].isNewProduct = true;
                              newItems[index].productId = "";
                              newItems[index].name = "";
                              newItems[index].unitPrice = 0;
                              newItems[index].gst = 0;
                              newItems[index].hsnCode = "";
                              setFormData({ ...formData, items: newItems });
                            }}
                            className="h-4 w-4 text-purple-600 focus:ring-purple-500"
                          />
                          <span className="ml-2 text-sm font-medium text-gray-800">
                            New Product (One-time)
                          </span>
                        </label>
                      </div>

                      <div className="flex items-end gap-4">
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {!item.isNewProduct ? (
                            <>
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
                                  handleItemChange(
                                    index,
                                    "name",
                                    e.target.value,
                                  )
                                }
                                placeholder="Product name on invoice"
                                required
                              />
                            </>
                          ) : (
                            <>
                              <Input
                                label="Product Name"
                                type="text"
                                value={item.name}
                                onChange={(e) =>
                                  handleItemChange(
                                    index,
                                    "name",
                                    e.target.value,
                                  )
                                }
                                placeholder="Enter product name"
                                required
                              />
                              <Input
                                label="HSN Code"
                                type="text"
                                value={item.hsnCode}
                                onChange={(e) =>
                                  handleItemChange(
                                    index,
                                    "hsnCode",
                                    e.target.value,
                                  )
                                }
                                placeholder="HSN Code"
                              />
                            </>
                          )}
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
