"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { invoicesAPI, customersAPI, productsAPI } from "@/lib/api";
import { formatINR } from "@/lib/formatters";
import {
  FiFileText,
  FiPlus,
  FiTrash2,
  FiEdit3,
  FiCheck,
  FiX,
  FiShoppingCart,
  FiUser,
  FiCreditCard,
  FiSave,
} from "react-icons/fi";
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
    customerName: "", // For fast invoice with typed customer name
    items: [],
    isGstBill: true,
    billType: "pay",
  });

  // Item management states
  const [itemForm, setItemForm] = useState({
    productId: "",
    name: "",
    quantity: 1,
    unitPrice: 0,
    gst: 0,
    hsnCode: "",
  });
  const [editingIndex, setEditingIndex] = useState(-1);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [usePermanentAddress, setUsePermanentAddress] = useState(true);
  const [customerInput, setCustomerInput] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customerAutofill, setCustomerAutofill] = useState("");
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [productAutofill, setProductAutofill] = useState("");

  useEffect(() => {
    fetchCustomers();
    fetchProducts();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await customersAPI.getAll({ limit: 1000 });
      setCustomers(response.data.data);
    } catch (err) {
      console.error("Failed to fetch customers", err);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await productsAPI.getAll({ limit: 1000 });
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
    return response.data.data.map((customer) => {
      let location = "No location";

      // Build address from permanentAddress first (preferred), then address as fallback
      if (
        customer.permanentAddress &&
        (customer.permanentAddress.companyAddress ||
          customer.permanentAddress.city ||
          customer.permanentAddress.state)
      ) {
        const addressParts = [
          customer.permanentAddress.companyAddress,
          customer.permanentAddress.city,
          customer.permanentAddress.state,
        ].filter(Boolean);
        if (addressParts.length > 0) {
          location = addressParts.join(", ");
        }
      } else if (customer.address) {
        const addressParts = [
          customer.address.companyAddress,
          customer.address.city,
          customer.address.state,
        ].filter(Boolean);
        if (addressParts.length > 0) {
          location = addressParts.join(", ");
        } else if (customer.address.country) {
          location = customer.address.country;
        }
      } else if (
        customer.shippingAddress?.city ||
        customer.shippingAddress?.state
      ) {
        const shipParts = [
          customer.shippingAddress.city,
          customer.shippingAddress.state,
        ].filter(Boolean);
        if (shipParts.length > 0) {
          location = shipParts.join(", ");
        }
      }

      return {
        value: customer._id,
        label: `${customer.name}${customer.phone ? ` - ${customer.phone}` : ""} • ${location}`,
      };
    });
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

  // Item management functions
  const handleItemFormChange = (field, value) => {
    setItemForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleProductSelect = async (productId) => {
    if (!productId) return;

    try {
      const response = await productsAPI.getById(productId);
      const product = response.data.data;
      setItemForm((prev) => ({
        ...prev,
        productId: productId,
        name: product.name,
        unitPrice: product.price || 0,
        gst: product.gst || 0,
        hsnCode: product.hsnCode || "",
      }));
      setShowProductDropdown(false); // Close dropdown after selection
      setProductAutofill("");
    } catch (err) {
      console.error("Failed to fetch product details", err);
    }
  };

  const handleProductNameChange = (value) => {
    setItemForm((prev) => ({
      ...prev,
      name: value,
      productId: "", // Clear product ID when typing custom name
    }));
    if (!value) {
      setShowProductDropdown(false);
      setProductAutofill("");
      return;
    }

    // Find matching products
    const matchingProducts = products.filter((product) =>
      product.name.toLowerCase().includes(value.toLowerCase()),
    );

    if (matchingProducts.length > 0) {
      setShowProductDropdown(true);

      // Google-style autofill
      const exactMatch = matchingProducts.find((product) =>
        product.name.toLowerCase().startsWith(value.toLowerCase()),
      );

      if (exactMatch && value.length > 0) {
        setProductAutofill(exactMatch.name);
      } else {
        setProductAutofill("");
      }
    } else {
      setShowProductDropdown(false);
      setProductAutofill("");
    }
  };

  const handleProductKeyDown = (e) => {
    if (
      e.key === "Enter" &&
      productAutofill &&
      productAutofill !== itemForm.name
    ) {
      e.preventDefault();
      const matchingProduct = products.find(
        (p) => p.name.toLowerCase() === productAutofill.toLowerCase(),
      );
      if (matchingProduct) {
        handleProductSelect(matchingProduct._id);
      }
    }
  };

  const addOrUpdateItem = () => {
    if (!itemForm.name || itemForm.quantity <= 0 || itemForm.unitPrice < 0) {
      alert("Please fill all required fields");
      return;
    }

    const newItems = [...formData.items];

    if (editingIndex >= 0) {
      // Update existing item
      newItems[editingIndex] = { ...itemForm };
      setEditingIndex(-1);
    } else {
      // Add new item
      newItems.push({ ...itemForm });
    }

    setFormData((prev) => ({ ...prev, items: newItems }));

    // Reset form
    setItemForm({
      productId: "",
      name: "",
      quantity: 1,
      unitPrice: 0,
      gst: 0,
      hsnCode: "",
    });
    setShowProductDropdown(false);
    setProductAutofill("");
  };

  const editItem = (index) => {
    setItemForm({ ...formData.items[index] });
    setEditingIndex(index);
  };

  const removeItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, items: newItems }));
    if (editingIndex === index) {
      setEditingIndex(-1);
      setItemForm({
        productId: "",
        name: "",
        quantity: 1,
        unitPrice: 0,
        gst: 0,
        hsnCode: "",
      });
      setShowProductDropdown(false);
      setProductAutofill("");
    }
  };

  const cancelEdit = () => {
    setEditingIndex(-1);
    setItemForm({
      productId: "",
      name: "",
      quantity: 1,
      unitPrice: 0,
      gst: 0,
      hsnCode: "",
    });
    setShowProductDropdown(false);
    setProductAutofill("");
  };

  const handleCustomerInputChange = (value) => {
    setCustomerInput(value);
    setFormData({ ...formData, customerName: value });

    if (!value) {
      // Clear everything when input is empty
      setSelectedCustomer(null);
      setFormData({ ...formData, customerId: "", customerName: "" });
      setShowCustomerDropdown(false);
      setCustomerAutofill("");
      return;
    }

    // Find matching customers
    const matchingCustomers = customers.filter((customer) =>
      customer.name.toLowerCase().includes(value.toLowerCase()),
    );

    if (matchingCustomers.length > 0) {
      setShowCustomerDropdown(true);

      // Google-style autofill - find the first exact match that starts with the input
      const exactMatch = matchingCustomers.find((customer) =>
        customer.name.toLowerCase().startsWith(value.toLowerCase()),
      );

      if (exactMatch && value.length > 0) {
        setCustomerAutofill(exactMatch.name);
      } else {
        setCustomerAutofill("");
      }
    } else {
      setShowCustomerDropdown(false);
      setCustomerAutofill("");
    }
  };

  const handleCustomerKeyDown = (e) => {
    if (
      e.key === "Enter" &&
      customerAutofill &&
      customerAutofill !== customerInput
    ) {
      e.preventDefault();
      const matchingCustomer = customers.find(
        (c) => c.name.toLowerCase() === customerAutofill.toLowerCase(),
      );
      if (matchingCustomer) {
        handleCustomerSelect(matchingCustomer._id);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      // Handle arrow navigation if needed
    }
  };

  const handleCustomerSelect = async (customerId) => {
    if (!customerId) return;

    try {
      const response = await customersAPI.getById(customerId);
      const customer = response.data.data;
      setSelectedCustomer(customer);
      setFormData({ ...formData, customerId, customerName: customer.name });
      setCustomerInput(customer.name);
      setShowCustomerDropdown(false); // Close dropdown after selection
      setCustomerAutofill("");
    } catch (err) {
      console.error("Failed to fetch customer details", err);
    }
  };

  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) => {
      return sum + item.quantity * item.unitPrice;
    }, 0);
  };

  const calculateTotalGst = () => {
    return formData.items.reduce((sum, item) => {
      const itemSubtotal = item.quantity * item.unitPrice;
      return sum + (itemSubtotal * item.gst) / 100;
    }, 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTotalGst();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Validate
      if (!formData.customerId && !formData.customerName) {
        throw new Error("Please select or enter a customer name");
      }

      if (formData.items.length === 0) {
        throw new Error("Please add at least one item");
      }

      // Prepare invoice data
      const validItems = formData.items.filter(
        (item) => item.name && item.quantity > 0 && item.unitPrice >= 0,
      );

      if (validItems.length === 0) {
        throw new Error("Please add at least one valid item");
      }

      let invoiceData = {
        billType: formData.billType,
        isGstBill: formData.isGstBill,
        items: validItems.map((item) => ({
          productId: item.productId || null,
          name: item.name,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          gst: Number(item.gst),
          hsnCode: item.hsnCode || "",
        })),
      };

      // Handle customer data
      if (formData.customerId && selectedCustomer) {
        // Use existing customer from database
        invoiceData.customerId = formData.customerId;
        invoiceData.customerData = {
          name: selectedCustomer.name,
          phone: selectedCustomer.phone,
          gstNumber: selectedCustomer.gstNumber || undefined,
          permanentAddress:
            selectedCustomer.permanentAddress || selectedCustomer.address,
          shippingAddress: usePermanentAddress
            ? selectedCustomer.permanentAddress || selectedCustomer.address
            : selectedCustomer.shippingAddress ||
              selectedCustomer.permanentAddress ||
              selectedCustomer.address,
          sameAsPermanent: usePermanentAddress,
        };
      } else {
        // Create inline customer data for direct-typed customer
        invoiceData.customerData = {
          name: formData.customerName,
          phone: "",
          gstNumber: undefined,
          permanentAddress: "",
          shippingAddress: "",
          sameAsPermanent: true,
        };
      }

      // Create invoice
      const response = await invoicesAPI.create(invoiceData);
      router.push(`/dashboard/invoices/${response.data.data._id}/view`);
    } catch (err) {
      setError(err.message || "Failed to create invoice");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <PageHeader
        title="Create New Invoice"
        subtitle="Generate professional invoices for your customers"
        icon={FiFileText}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Invoices", href: "/dashboard/invoices" },
          { label: "New Invoice" },
        ]}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Selection */}
            <Card>
              <CardBody>
                <div className="flex items-center gap-3 mb-6">
                  <FiUser className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Customer Information
                  </h3>
                </div>

                <div className="space-y-6">
                  <div className="relative">
                    <div className="relative">
                      <Input
                        label="Customer Name"
                        type="text"
                        value={customerInput}
                        onChange={(e) =>
                          handleCustomerInputChange(e.target.value)
                        }
                        onKeyDown={handleCustomerKeyDown}
                        onFocus={() => {
                          if (
                            customerInput &&
                            customers.filter((c) =>
                              c.name
                                .toLowerCase()
                                .includes(customerInput.toLowerCase()),
                            ).length > 0
                          ) {
                            setShowCustomerDropdown(true);
                          }
                        }}
                        onBlur={() => {
                          // Delay hiding to allow click events
                          setTimeout(() => setShowCustomerDropdown(false), 150);
                        }}
                        placeholder="Type customer name or search from existing customers"
                        autoComplete="off"
                        required
                        className="text-gray-900"
                      />
                      {/* Autofill overlay */}
                      {customerAutofill &&
                        customerAutofill
                          .toLowerCase()
                          .startsWith(customerInput.toLowerCase()) && (
                          <div
                            className="absolute inset-0 pointer-events-none flex items-center"
                            style={{ paddingLeft: "12px", paddingTop: "28px" }}
                          >
                            <span className="text-gray-900">
                              <span className="invisible">{customerInput}</span>
                              <span className="text-gray-400">
                                {customerAutofill.slice(customerInput.length)}
                              </span>
                            </span>
                          </div>
                        )}
                    </div>

                    {/* Dropdown with animation */}
                    <div
                      className={`absolute top-full left-0 right-0 z-20 transition-all duration-200 ease-out transform ${
                        showCustomerDropdown &&
                        customerInput &&
                        customers.filter((customer) =>
                          customer.name
                            .toLowerCase()
                            .includes(customerInput.toLowerCase()),
                        ).length > 0
                          ? "opacity-100 translate-y-0 scale-100"
                          : "opacity-0 -translate-y-2 scale-95 pointer-events-none"
                      }`}
                    >
                      <div className="bg-white border border-gray-300 rounded-lg shadow-xl mt-1 max-h-64 overflow-auto backdrop-blur-sm">
                        {customers
                          .filter((customer) =>
                            customer.name
                              .toLowerCase()
                              .includes(customerInput.toLowerCase()),
                          )
                          .slice(0, 8)
                          .map((customer) => (
                            <button
                              key={customer._id}
                              type="button"
                              className="w-full text-left px-4 py-3 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none flex items-center justify-between border-b border-gray-100 last:border-b-0 transition-colors duration-150"
                              onClick={() => handleCustomerSelect(customer._id)}
                            >
                              <div className="flex-1">
                                <div className="font-medium text-gray-900">
                                  {customer.name}
                                </div>
                                {customer.phone && (
                                  <div className="text-sm text-gray-500">
                                    {customer.phone}
                                  </div>
                                )}
                                <div className="text-xs text-gray-400">
                                  {(() => {
                                    // Show permanentAddress first (preferred)
                                    if (
                                      customer.permanentAddress &&
                                      (customer.permanentAddress
                                        .companyAddress ||
                                        customer.permanentAddress.city ||
                                        customer.permanentAddress.state)
                                    ) {
                                      const parts = [
                                        customer.permanentAddress
                                          .companyAddress,
                                        customer.permanentAddress.city,
                                        customer.permanentAddress.state,
                                      ].filter(Boolean);
                                      if (parts.length > 0)
                                        return parts.join(", ");
                                    }
                                    // Fallback to address field
                                    if (
                                      customer.address &&
                                      (customer.address.companyAddress ||
                                        customer.address.city ||
                                        customer.address.state)
                                    ) {
                                      const parts = [
                                        customer.address.companyAddress,
                                        customer.address.city,
                                        customer.address.state,
                                      ].filter(Boolean);
                                      if (parts.length > 0)
                                        return parts.join(", ");
                                    }
                                    // Show shipping address if available
                                    if (
                                      customer.shippingAddress?.city ||
                                      customer.shippingAddress?.state
                                    ) {
                                      const parts = [
                                        customer.shippingAddress.companyAddress,
                                        customer.shippingAddress.city,
                                        customer.shippingAddress.state,
                                      ].filter(Boolean);
                                      if (parts.length > 0)
                                        return parts.join(", ");
                                    }
                                    // Last resort - country or no location
                                    return (
                                      customer.permanentAddress?.country ||
                                      customer.address?.country ||
                                      "No location"
                                    );
                                  })()}
                                </div>
                              </div>
                            </button>
                          ))}
                      </div>
                    </div>
                  </div>

                  {/* Selected Customer Details */}
                  {selectedCustomer && (
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-blue-900">
                          Selected Customer
                        </h4>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCustomer(null);
                            setFormData({
                              ...formData,
                              customerId: "",
                              customerName: "",
                            });
                            setCustomerInput("");
                          }}
                          className="text-red-600 hover:text-red-800 p-1 rounded"
                          title="Remove customer"
                        >
                          <FiX className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Name:</span>
                          <p className="font-medium text-gray-900">
                            {selectedCustomer.name}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600">Phone:</span>
                          <p className="font-medium text-gray-900">
                            {selectedCustomer.phone}
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
                          selectedCustomer.shippingAddress ||
                          selectedCustomer.address) && (
                          <div className="col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 mt-1">
                            {/* Permanent Address */}
                            <div className="bg-white rounded-lg p-3 border border-blue-100">
                              <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                                Permanent Address
                              </span>
                              <p className="font-medium text-gray-900 mt-1 text-sm">
                                {(() => {
                                  const addr =
                                    selectedCustomer.permanentAddress
                                      ?.companyAddress ||
                                    selectedCustomer.permanentAddress?.city ||
                                    selectedCustomer.permanentAddress?.state
                                      ? selectedCustomer.permanentAddress
                                      : selectedCustomer.address;
                                  if (!addr) return "Not set";
                                  const parts = [
                                    addr.companyAddress,
                                    addr.city,
                                    addr.state,
                                    addr.postalCode,
                                    addr.country,
                                  ].filter(Boolean);
                                  return parts.length > 0
                                    ? parts.join(", ")
                                    : "Not set";
                                })()}
                              </p>
                            </div>

                            {/* Shipping Address */}
                            <div className="bg-white rounded-lg p-3 border border-blue-100">
                              <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                                Shipping Address
                              </span>
                              <p className="font-medium text-gray-900 mt-1 text-sm">
                                {(() => {
                                  const addr =
                                    selectedCustomer.shippingAddress
                                      ?.companyAddress ||
                                    selectedCustomer.shippingAddress?.city ||
                                    selectedCustomer.shippingAddress?.state
                                      ? selectedCustomer.shippingAddress
                                      : selectedCustomer.permanentAddress
                                            ?.companyAddress ||
                                          selectedCustomer.permanentAddress
                                            ?.city ||
                                          selectedCustomer.permanentAddress
                                            ?.state
                                        ? selectedCustomer.permanentAddress
                                        : selectedCustomer.address;
                                  if (!addr) return "Not set";
                                  const parts = [
                                    addr.companyAddress,
                                    addr.city,
                                    addr.state,
                                    addr.postalCode,
                                    addr.country,
                                  ].filter(Boolean);
                                  return parts.length > 0
                                    ? parts.join(", ")
                                    : "Not set";
                                })()}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>

            {/* Items Management */}
            <Card>
              <CardBody>
                <div className="flex items-center gap-3 mb-8">
                  <FiShoppingCart className="h-5 w-5 text-purple-600" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Invoice Items
                  </h3>
                </div>

                {/* Item Entry Form */}
                <div className="bg-linear-to-br from-purple-50 to-blue-50 rounded-xl p-10 border border-purple-200 mb-10 shadow-sm">
                  <h4 className="font-medium text-purple-900 mb-8 text-lg">
                    {editingIndex >= 0 ? "Edit Item" : "Add New Item"}
                  </h4>

                  <div className="space-y-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div className="relative">
                        <div className="relative">
                          <Input
                            label="Product/Service Name"
                            type="text"
                            value={itemForm.name}
                            onChange={(e) =>
                              handleProductNameChange(e.target.value)
                            }
                            onKeyDown={handleProductKeyDown}
                            onFocus={() => {
                              if (
                                itemForm.name &&
                                products.filter((p) =>
                                  p.name
                                    .toLowerCase()
                                    .includes(itemForm.name.toLowerCase()),
                                ).length > 0
                              ) {
                                setShowProductDropdown(true);
                              }
                            }}
                            onBlur={() => {
                              setTimeout(
                                () => setShowProductDropdown(false),
                                150,
                              );
                            }}
                            placeholder="Type product name or search from existing products"
                            autoComplete="off"
                            className="text-gray-900"
                          />
                          {/* Autofill overlay */}
                          {productAutofill &&
                            productAutofill
                              .toLowerCase()
                              .startsWith(itemForm.name.toLowerCase()) && (
                              <div
                                className="absolute inset-0 pointer-events-none flex items-center"
                                style={{
                                  paddingLeft: "12px",
                                  paddingTop: "28px",
                                }}
                              >
                                <span className="text-gray-900">
                                  <span className="invisible">
                                    {itemForm.name}
                                  </span>
                                  <span className="text-gray-400">
                                    {productAutofill.slice(
                                      itemForm.name.length,
                                    )}
                                  </span>
                                </span>
                              </div>
                            )}
                        </div>

                        {/* Dropdown with animation */}
                        <div
                          className={`absolute top-full left-0 right-0 z-20 transition-all duration-200 ease-out transform ${
                            showProductDropdown &&
                            itemForm.name &&
                            products.filter((product) =>
                              product.name
                                .toLowerCase()
                                .includes(itemForm.name.toLowerCase()),
                            ).length > 0
                              ? "opacity-100 translate-y-0 scale-100"
                              : "opacity-0 -translate-y-2 scale-95 pointer-events-none"
                          }`}
                        >
                          <div className="bg-white border border-gray-300 rounded-lg shadow-xl mt-1 max-h-64 overflow-auto backdrop-blur-sm">
                            {products
                              .filter((product) =>
                                product.name
                                  .toLowerCase()
                                  .includes(itemForm.name.toLowerCase()),
                              )
                              .slice(0, 8)
                              .map((product) => (
                                <button
                                  key={product._id}
                                  type="button"
                                  className="w-full text-left px-4 py-3 hover:bg-purple-50 focus:bg-purple-50 focus:outline-none flex items-center justify-between border-b border-gray-100 last:border-b-0 transition-colors duration-150"
                                  onClick={() =>
                                    handleProductSelect(product._id)
                                  }
                                >
                                  <span className="font-medium text-gray-900">
                                    {product.name}
                                  </span>
                                  <span className="text-sm text-purple-600 font-medium">
                                    {formatINR(product.price)}
                                  </span>
                                </button>
                              ))}
                          </div>
                        </div>
                      </div>

                      <Input
                        label="HSN Code (Optional)"
                        type="text"
                        value={itemForm.hsnCode}
                        onChange={(e) =>
                          handleItemFormChange("hsnCode", e.target.value)
                        }
                        placeholder="Enter HSN code if applicable"
                        className="text-gray-900"
                      />
                    </div>

                    {/* Add spacing between top and bottom rows */}
                    <div className="pt-8">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <NumberInput
                          label="Quantity"
                          min="1"
                          value={itemForm.quantity}
                          onChange={(e) =>
                            handleItemFormChange("quantity", e.target.value)
                          }
                          className="text-gray-900"
                        />
                        <NumberInput
                          label="Unit Price (₹)"
                          min="0"
                          step="0.01"
                          value={itemForm.unitPrice}
                          onChange={(e) =>
                            handleItemFormChange("unitPrice", e.target.value)
                          }
                          prefix="₹"
                          className="text-gray-900"
                        />
                        <NumberInput
                          label="GST (%)"
                          min="0"
                          max="100"
                          step="0.01"
                          value={itemForm.gst}
                          onChange={(e) =>
                            handleItemFormChange("gst", e.target.value)
                          }
                          className="text-gray-900"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-6 pt-6">
                    <Button
                      type="button"
                      onClick={addOrUpdateItem}
                      disabled={!itemForm.name || itemForm.quantity <= 0}
                      className="flex-1 py-4 text-base"
                    >
                      {editingIndex >= 0 ? (
                        <>
                          <FiCheck className="mr-2" />
                          Update Item
                        </>
                      ) : (
                        <>
                          <FiPlus className="mr-2" />
                          Add Item
                        </>
                      )}
                    </Button>
                    {editingIndex >= 0 && (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={cancelEdit}
                        className="px-8 py-4 text-base"
                      >
                        <FiX className="mr-2" />
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>

                {/* Items List */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900 text-sm uppercase tracking-wide">
                    Added Items ({formData.items.length})
                  </h4>
                  {formData.items.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <FiShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No items added yet. Add your first item above.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {formData.items.map((item, index) => {
                        const itemTotal = item.quantity * item.unitPrice;
                        const itemGst = (itemTotal * item.gst) / 100;
                        const itemFinalTotal = itemTotal + itemGst;

                        return (
                          <div
                            key={index}
                            className={`p-4 rounded-lg border-2 transition-all cursor-pointer hover:shadow-md ${
                              editingIndex === index
                                ? "border-purple-300 bg-purple-50"
                                : "border-gray-200 bg-white hover:border-purple-200"
                            }`}
                            onClick={() => editItem(index)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3">
                                  <span className="flex items-center justify-center w-8 h-8 bg-purple-100 text-purple-600 rounded-full text-sm font-medium">
                                    {index + 1}
                                  </span>
                                  <div>
                                    <h5 className="font-medium text-gray-900">
                                      {item.name}
                                    </h5>
                                    <div className="flex gap-4 text-sm text-gray-600 mt-1">
                                      <span>Qty: {item.quantity}</span>
                                      <span>Rate: ₹{item.unitPrice}</span>
                                      <span>GST: {item.gst}%</span>
                                      <span className="font-medium text-gray-900">
                                        Total: ₹{itemFinalTotal.toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    editItem(index);
                                  }}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Edit item"
                                >
                                  <FiEdit3 className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeItem(index);
                                  }}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Remove item"
                                >
                                  <FiTrash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Summary Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardBody>
                <div className="flex items-center gap-3 mb-6">
                  <FiCreditCard className="h-5 w-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Invoice Summary
                  </h3>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-semibold text-gray-900">
                      {formatINR(calculateSubtotal())}
                    </span>
                  </div>

                  {formData.isGstBill && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total GST:</span>
                      <span className="font-semibold text-gray-900">
                        {formatINR(calculateTotalGst())}
                      </span>
                    </div>
                  )}

                  <div className="border-t pt-3">
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-900">
                        Total:
                      </span>
                      <span className="font-bold text-xl text-green-600">
                        {formatINR(calculateTotal())}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Invoice Settings */}
                <div className="space-y-4 pt-6 border-t">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Bill Type
                    </label>
                    <select
                      name="billType"
                      value={formData.billType}
                      onChange={(e) =>
                        setFormData({ ...formData, billType: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="pay">Cash Bill</option>
                      <option value="credit">Credit Bill</option>
                    </select>
                  </div>

                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isGstBill}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          isGstBill: e.target.checked,
                        })
                      }
                      className="h-5 w-5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    />
                    <span className="ml-3 text-sm font-medium text-gray-900">
                      Include GST in Invoice
                    </span>
                  </label>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3 pt-6 border-t">
                  <Button
                    type="submit"
                    disabled={loading || formData.items.length === 0}
                    className="w-full"
                  >
                    {loading ? (
                      "Creating..."
                    ) : (
                      <>
                        <FiSave className="mr-2" />
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

                {error && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                    {error}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
