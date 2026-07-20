"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { invoicesAPI, customersAPI, productsAPI } from "@/lib/api";
import { formatINR } from "@/lib/formatters";
import {
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
import { Dropdown, NumberInput } from "@/components/UI";

export default function NewInvoicePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState(null);
  const [formData, setFormData] = useState({
    customerId: "",
    customerName: "",
    items: [],
    isGstBill: true,
    isIgst: false,
    billType: "pay",
    vehicleNumber: "",
    copyType: "original",
  });

  // Customer details state
  const [customerDetails, setCustomerDetails] = useState({
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

  // Item management states
  const [itemForm, setItemForm] = useState({
    productId: "",
    name: "",
    quantity: 1,
    unitPrice: 0,
    gst: 18,
    hsnCode: "",
    availableStock: null,
  });
  const [editingIndex, setEditingIndex] = useState(-1);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [usePermanentAddress, setUsePermanentAddress] = useState(true);
  const [customerInput, setCustomerInput] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customerAutofill, setCustomerAutofill] = useState("");
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [productAutofill, setProductAutofill] = useState("");
  const [hoveredProductIndex, setHoveredProductIndex] = useState(0);
  const [productSearchResults, setProductSearchResults] = useState([]);
  const [isSearchingProducts, setIsSearchingProducts] = useState(false);
  const [showHsnDropdown, setShowHsnDropdown] = useState(false);
  const [hoveredHsnIndex, setHoveredHsnIndex] = useState(null);

  const hsnOptions = [
    { value: "73201020", label: "73201020" },
    { value: "73201011", label: "73201011" },
    { value: "73181500", label: "73181500" },
    { value: "87089900", label: "87089900" },
    { value: "73209020", label: "73209020" },
    { value: "40169990", label: "40169990" },
    { value: "73181011", label: "73181011" },
    { value: "73182200", label: "73182200" },
    { value: "73181600", label: "73181600" },
    { value: "73209090", label: "73209090" },
    { value: "87082900", label: "87082900" },
  ];

  useEffect(() => {
    fetchCustomers();
    fetchProducts();
  }, []);

  useEffect(() => {
    if (formData.isGstBill) {
      fetchNextInvoiceNumber();
      return;
    }

    setNextInvoiceNumber(null);
  }, [formData.isGstBill]);

  // Pre-fill form when duplicating from another invoice
  useEffect(() => {
    const stored = sessionStorage.getItem("duplicateInvoice");
    if (!stored) return;

    sessionStorage.removeItem("duplicateInvoice");

    try {
      const data = JSON.parse(stored);

      if (data.customerData) {
        setCustomerDetails({
          name: data.customerData.name || "",
          phone: data.customerData.phone || "",
          gstNumber: data.customerData.gstNumber || "",
          permanentAddress: {
            companyAddress:
              data.customerData.permanentAddress?.companyAddress || "",
            city: data.customerData.permanentAddress?.city || "",
            state: data.customerData.permanentAddress?.state || "",
            postalCode: data.customerData.permanentAddress?.postalCode || "",
            country: data.customerData.permanentAddress?.country || "India",
          },
          shippingAddress: {
            companyAddress:
              data.customerData.shippingAddress?.companyAddress || "",
            city: data.customerData.shippingAddress?.city || "",
            state: data.customerData.shippingAddress?.state || "",
            postalCode: data.customerData.shippingAddress?.postalCode || "",
            country: data.customerData.shippingAddress?.country || "India",
          },
        });

        if (data.customerData.sameAsPermanent === false) {
          setUsePermanentAddress(false);
        }
      }

      setFormData((prev) => ({
        ...prev,
        customerId: data.customerId || "",
        customerName: data.customerData?.name || "",
        items: (data.items || []).map((item) => ({
          productId: item.productId?._id || item.productId || "",
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          gst: item.gst,
          hsnCode: item.hsnCode || "",
          availableStock: null,
        })),
        isGstBill: data.isGstBill !== false,
        isIgst: data.isIgst || false,
        billType: data.billType || "pay",
        vehicleNumber: data.vehicleNumber || "",
        copyType: data.copyType || "original",
      }));

      // If the original invoice was linked to a customer, fetch their full
      // details so the new invoice stays linked to the same customer record.
      if (data.customerId) {
        customersAPI.getById(data.customerId).then((response) => {
          setSelectedCustomer(response.data.data);
        }).catch(() => {});
      }
    } catch (e) {
      console.error("Failed to parse duplicate invoice data", e);
    }
  }, []);

  const fetchNextInvoiceNumber = async () => {
    try {
      const response = await invoicesAPI.previewNumber();
      setNextInvoiceNumber(response.data.data.invoiceNumber);
    } catch (err) {
      console.error("Failed to fetch next invoice number", err);
    }
  };

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
      const response = await productsAPI.getPopular({ limit: 1000 });
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
        availableStock: product.stockQuantity,
      }));
      setError("");
      setShowProductDropdown(false); // Close dropdown after selection
      setProductAutofill("");
      setHoveredProductIndex(0); // Reset hover index
    } catch (err) {
      console.error("Failed to fetch product details", err);
    }
  };

  const handleProductNameChange = async (value) => {
    setItemForm((prev) => ({
      ...prev,
      name: value,
      productId: "", // Clear product ID when typing custom name
      availableStock: null,
    }));
    if (!value) {
      setShowProductDropdown(false);
      setProductAutofill("");
      setHoveredProductIndex(0);
      setIsSearchingProducts(false);
      return;
    }

    try {
      // Search for matching products via API
      setIsSearchingProducts(true);
      const results = await searchProducts(value);
      setProductSearchResults(results);

      if (results.length > 0) {
        setShowProductDropdown(true);
        setHoveredProductIndex(0); // Default to first item

        // Google-style autofill
        const exactMatch = results.find((product) =>
          product.label.toLowerCase().startsWith(value.toLowerCase()),
        );

        if (exactMatch && value.length > 0) {
          setProductAutofill(exactMatch.label);
        } else {
          setProductAutofill("");
        }
      } else {
        setShowProductDropdown(false);
        setProductAutofill("");
        setHoveredProductIndex(0);
      }
    } catch (err) {
      console.error("Failed to search products", err);
      setShowProductDropdown(false);
      setProductAutofill("");
      setHoveredProductIndex(0);
    } finally {
      setIsSearchingProducts(false);
    }
  };

  const handleProductKeyDown = (e) => {
    if (e.key !== "Enter" && e.key !== "Tab") return;

    // Use search results if searching, otherwise use popular products
    const displayProducts = itemForm.name && productSearchResults.length > 0 ? productSearchResults : products;

    if (displayProducts.length > 0 && hoveredProductIndex < displayProducts.length) {
      e.preventDefault();
      const selectedProduct = displayProducts[hoveredProductIndex];
      handleProductSelect(selectedProduct.value || selectedProduct._id);
    }
  };

  const addOrUpdateItem = () => {
    if (!itemForm.name || itemForm.quantity <= 0 || itemForm.unitPrice < 0) {
      alert("Please fill all required fields");
      return;
    }

    setError("");

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
      gst: 18,
      hsnCode: "",
      availableStock: null,
    });
    setShowProductDropdown(false);
    setProductAutofill("");
    setHoveredProductIndex(0);
  };

  const editItem = (index) => {
    if (index < 0 || index >= formData.items.length) return;
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
        availableStock: null,
      });
      setShowProductDropdown(false);
      setProductAutofill("");
      setHoveredProductIndex(0);
    }
  };

  const cancelEdit = () => {
    setEditingIndex(-1);
    setItemForm({
      productId: "",
      name: "",
      quantity: 1,
      unitPrice: 0,
      gst: 18,
      hsnCode: "",
      availableStock: null,
    });
    setShowProductDropdown(false);
    setProductAutofill("");
    setHoveredProductIndex(0);
  };

  const handleCustomerInputChange = (field, value) => {
    // Update customer details
    if (field.includes(".")) {
      const [parent, child] = field.split(".");
      setCustomerDetails((prev) => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value,
        },
      }));
    } else {
      setCustomerDetails((prev) => ({
        ...prev,
        [field]: value,
      }));
    }

    // Handle name field special logic (for autocomplete)
    if (field === "name") {
      setCustomerInput(value);
      setFormData((prev) => ({ ...prev, customerName: value }));

      if (!value) {
        // Clear everything when input is empty
        setSelectedCustomer(null);
        setFormData((prev) => ({ ...prev, customerId: "", customerName: "" }));
        setShowCustomerDropdown(false);
        setCustomerAutofill("");
        return;
      }

      // Find matching customers for autocomplete
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
    }
  };

  const handleCustomerKeyDown = (e) => {
    if (e.key !== "Enter") return;

    const value = e.currentTarget.value.trim();
    const matchingCustomers = value
      ? customers.filter((customer) =>
          customer.name.toLowerCase().includes(value.toLowerCase()),
        )
      : customers;

    if (matchingCustomers.length > 0) {
      e.preventDefault();
      handleCustomerSelect(matchingCustomers[0]._id);
    }
  };

  const handleCustomerSelect = async (customerId) => {
    if (!customerId) return;

    try {
      const response = await customersAPI.getById(customerId);
      const customer = response.data.data;
      setSelectedCustomer(customer);
      setFormData((prev) => ({
        ...prev,
        customerId,
        customerName: customer.name,
      }));
      setCustomerInput(customer.name);

      // Auto-fill all customer details but keep them editable
      setCustomerDetails({
        name: customer.name || "",
        phone: customer.phone || "",
        gstNumber: customer.gstNumber || "",
        permanentAddress: {
          companyAddress: customer.permanentAddress?.companyAddress || "",
          city: customer.permanentAddress?.city || "",
          state: customer.permanentAddress?.state || "",
          postalCode: customer.permanentAddress?.postalCode || "",
          country: customer.permanentAddress?.country || "India",
        },
        shippingAddress: {
          companyAddress:
            customer.shippingAddress?.companyAddress ||
            customer.permanentAddress?.companyAddress ||
            "",
          city:
            customer.shippingAddress?.city ||
            customer.permanentAddress?.city ||
            "",
          state:
            customer.shippingAddress?.state ||
            customer.permanentAddress?.state ||
            "",
          postalCode:
            customer.shippingAddress?.postalCode ||
            customer.permanentAddress?.postalCode ||
            "",
          country:
            customer.shippingAddress?.country ||
            customer.permanentAddress?.country ||
            "India",
        },
      });

      setShowCustomerDropdown(false); // Close dropdown after selection
      setCustomerAutofill("");
    } catch (err) {
      console.error("Failed to fetch customer details", err);
    }
  };

  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) => {
      // Calculate base amount from inclusive price (remove GST)
      const inclusivePrice = item.quantity * item.unitPrice;
      const baseAmount = inclusivePrice / (1 + item.gst / 100);
      return sum + baseAmount;
    }, 0);
  };

  const calculateTotalGst = () => {
    return formData.items.reduce((sum, item) => {
      const inclusivePrice = item.quantity * item.unitPrice;
      const baseAmount = inclusivePrice / (1 + item.gst / 100);
      const gstAmount = inclusivePrice - baseAmount;
      return sum + gstAmount;
    }, 0);
  };

  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => {
      return sum + item.quantity * item.unitPrice;
    }, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Validate
      if (!customerDetails.name) {
        throw new Error("Please enter customer name");
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
        isIgst: formData.isIgst,
        vehicleNumber: formData.vehicleNumber || "",
        copyType: formData.copyType || "original",
        items: validItems.map((item) => ({
          productId: item.productId || null,
          name: item.name,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          gst: Number(item.gst),
          hsnCode: item.hsnCode || "",
        })),
      };

      // Handle customer data - always use the editable customer details
      if (formData.customerId && selectedCustomer) {
        // Use existing customer ID but with updated details from form
        invoiceData.customerId = formData.customerId;
      }

      // Use customer details from the editable form
      invoiceData.customerData = {
        name: customerDetails.name,
        phone: customerDetails.phone,
        gstNumber: customerDetails.gstNumber || undefined,
        permanentAddress: customerDetails.permanentAddress,
        shippingAddress: usePermanentAddress
          ? customerDetails.permanentAddress
          : customerDetails.shippingAddress,
        sameAsPermanent: usePermanentAddress,
      };

      // Create invoice
      const response = await invoicesAPI.create(invoiceData);
      router.push(`/dashboard/invoices/${response.data.data._id}/view`);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to create invoice",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-5 space-y-4">
      {/* ── Glowing Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/invoices"
            className="flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-600 transition-all duration-200 group font-medium"
          >
            <span className="group-hover:-translate-x-0.5 transition-transform duration-200 inline-block">
              ←
            </span>{" "}
            Invoices
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-base font-black bg-linear-to-r from-indigo-700 to-violet-600 bg-clip-text text-transparent tracking-tight">
            New Invoice
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {formData.isGstBill && nextInvoiceNumber ? (
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-400 rounded-xl blur opacity-40 animate-pulse" />
              <span className="relative text-xs font-mono font-bold text-white bg-linear-to-r from-indigo-600 to-violet-600 px-3 py-1.5 rounded-xl shadow-lg shadow-indigo-200">
                #{nextInvoiceNumber}
              </span>
            </div>
          ) : !formData.isGstBill ? (
            <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
              Estimate number assigned on save
            </span>
          ) : (
            <span className="text-xs text-gray-400 animate-pulse">
              Loading #...
            </span>
          )}
          <span className="text-xs text-gray-400 italic">
            {formData.isGstBill
              ? "auto-assigned on save"
              : "invoice number assigned on conversion"}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* ── LEFT COLUMN ── */}
          <div className="lg:col-span-2 space-y-4">
            {/* ── Customer Card ── */}
            <div className="rounded-2xl overflow-hidden shadow-xl shadow-blue-100/60 border border-blue-100/80 bg-white/80 backdrop-blur-sm">
              <div className="bg-linear-to-r from-blue-500 to-indigo-600 px-5 py-3 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <FiUser className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-sm font-semibold text-white tracking-wide">
                  Customer Information
                </h3>
              </div>

              <div className="p-5 space-y-4">
                {/* Customer name autocomplete */}
                <div className="relative">
                  <div className="relative">
                    <label className="block text-xs font-bold text-indigo-500/80 uppercase tracking-widest mb-1.5">
                      Customer Name *
                    </label>
                    <input
                      type="text"
                      value={customerDetails.name}
                      onChange={(e) =>
                        handleCustomerInputChange("name", e.target.value)
                      }
                      onKeyDown={handleCustomerKeyDown}
                      onFocus={() => {
                        setShowCustomerDropdown(true);
                      }}
                      onBlur={() =>
                        setTimeout(() => setShowCustomerDropdown(false), 150)
                      }
                      placeholder="Search or enter customer name..."
                      autoComplete="off"
                      required
                      className="w-full px-4 py-2.5 text-sm border-2 border-gray-100 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 bg-gray-50/50 text-gray-900 placeholder-gray-400 transition-all duration-200"
                    />
                    {/* Inline preview removed to avoid visual misalignment */}
                  </div>
                  <div
                    className={`absolute top-full left-0 right-0 z-20 transition-all duration-200 ${showCustomerDropdown && customers.filter((c) => c.name.toLowerCase().includes(customerDetails.name.toLowerCase())).length > 0 ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"}`}
                  >
                    <div className="bg-white/95 backdrop-blur-xl border border-indigo-100 rounded-2xl shadow-2xl shadow-indigo-200/40 mt-1.5 max-h-56 overflow-auto">
                      {customers
                        .filter((c) =>
                          c.name
                            .toLowerCase()
                            .includes(customerDetails.name.toLowerCase()),
                        )
                        .slice(0, 8)
                        .map((customer) => (
                          <button
                            key={customer._id}
                            type="button"
                            className="w-full text-left px-4 py-2.5 hover:bg-linear-to-r hover:from-indigo-50 hover:to-blue-50 flex items-center justify-between border-b border-gray-50 last:border-0 transition-all duration-150 group"
                            onClick={() => handleCustomerSelect(customer._id)}
                          >
                            <div>
                              <div className="text-sm font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">
                                {customer.name}
                              </div>
                              {customer.phone && (
                                <div className="text-xs text-gray-500">
                                  {customer.phone}
                                </div>
                              )}
                            </div>
                            <div className="text-xs text-indigo-400 text-right max-w-32 truncate">
                              {[
                                customer.permanentAddress?.city,
                                customer.permanentAddress?.state,
                              ]
                                .filter(Boolean)
                                .join(", ")}
                            </div>
                          </button>
                        ))}
                    </div>
                  </div>
                </div>

                {/* Phone + GST */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-indigo-500/80 uppercase tracking-widest mb-1.5">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={customerDetails.phone}
                      onChange={(e) =>
                        handleCustomerInputChange("phone", e.target.value)
                      }
                      placeholder="Phone number"
                      className="w-full px-4 py-2.5 text-sm border-2 border-gray-100 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 bg-gray-50/50 text-gray-900 placeholder-gray-400 transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-indigo-500/80 uppercase tracking-widest mb-1.5">
                      GST Number
                    </label>
                    <input
                      type="text"
                      value={customerDetails.gstNumber}
                      onChange={(e) =>
                        handleCustomerInputChange(
                          "gstNumber",
                          e.target.value.toUpperCase(),
                        )
                      }
                      placeholder="29ABCDE1234F1Z5"
                      className="w-full px-4 py-2.5 text-sm border-2 border-gray-100 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 bg-gray-50/50 text-gray-900 placeholder-gray-400 transition-all duration-200 uppercase"
                    />
                  </div>
                </div>

                {/* Billing Address */}
                <div className="rounded-xl border border-blue-100 bg-blue-50/30 p-3.5 space-y-2.5">
                  <div className="text-xs font-bold text-blue-600 uppercase tracking-widest">
                    Billing Address
                  </div>
                  <input
                    type="text"
                    value={customerDetails.permanentAddress.companyAddress}
                    onChange={(e) =>
                      handleCustomerInputChange(
                        "permanentAddress.companyAddress",
                        e.target.value,
                      )
                    }
                    placeholder="Street / Company"
                    className="w-full px-3 py-2 text-sm border border-blue-100 rounded-lg focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 bg-white text-gray-900 placeholder-gray-400 transition-all duration-200"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={customerDetails.permanentAddress.city}
                      onChange={(e) =>
                        handleCustomerInputChange(
                          "permanentAddress.city",
                          e.target.value,
                        )
                      }
                      placeholder="City"
                      className="w-full px-3 py-2 text-sm border border-blue-100 rounded-lg focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 bg-white text-gray-900 placeholder-gray-400 transition-all duration-200"
                    />
                    <input
                      type="text"
                      value={customerDetails.permanentAddress.state}
                      onChange={(e) =>
                        handleCustomerInputChange(
                          "permanentAddress.state",
                          e.target.value,
                        )
                      }
                      placeholder="State"
                      className="w-full px-3 py-2 text-sm border border-blue-100 rounded-lg focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 bg-white text-gray-900 placeholder-gray-400 transition-all duration-200"
                    />
                    <input
                      type="text"
                      value={customerDetails.permanentAddress.postalCode}
                      onChange={(e) =>
                        handleCustomerInputChange(
                          "permanentAddress.postalCode",
                          e.target.value,
                        )
                      }
                      placeholder="PIN"
                      className="w-full px-3 py-2 text-sm border border-blue-100 rounded-lg focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 bg-white text-gray-900 placeholder-gray-400 transition-all duration-200"
                    />
                  </div>
                </div>

                {/* Shipping Address */}
                <div className="rounded-xl border border-violet-100 bg-violet-50/30 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-violet-600 uppercase tracking-widest">
                      Shipping Address
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer group select-none">
                      <div
                        className={`relative w-9 h-5 rounded-full transition-all duration-300 ${usePermanentAddress ? "bg-linear-to-r from-violet-500 to-indigo-500 shadow-md shadow-violet-200" : "bg-gray-200"}`}
                        onClick={() => {
                          const next = !usePermanentAddress;
                          setUsePermanentAddress(next);
                          if (next)
                            setCustomerDetails((prev) => ({
                              ...prev,
                              shippingAddress: { ...prev.permanentAddress },
                            }));
                        }}
                      >
                        <div
                          className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm transition-all duration-300 ${usePermanentAddress ? "left-5" : "left-1"}`}
                        />
                      </div>
                      <span className="text-xs text-gray-600 group-hover:text-violet-600 transition-colors font-medium">
                        Same as billing
                      </span>
                    </label>
                  </div>
                  {!usePermanentAddress && (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={customerDetails.shippingAddress.companyAddress}
                        onChange={(e) =>
                          handleCustomerInputChange(
                            "shippingAddress.companyAddress",
                            e.target.value,
                          )
                        }
                        placeholder="Street / Company"
                        className="w-full px-3 py-2 text-sm border border-violet-100 rounded-lg focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 bg-white text-gray-900 placeholder-gray-400 transition-all duration-200"
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={customerDetails.shippingAddress.city}
                          onChange={(e) =>
                            handleCustomerInputChange(
                              "shippingAddress.city",
                              e.target.value,
                            )
                          }
                          placeholder="City"
                          className="w-full px-3 py-2 text-sm border border-violet-100 rounded-lg focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 bg-white text-gray-900 placeholder-gray-400 transition-all duration-200"
                        />
                        <input
                          type="text"
                          value={customerDetails.shippingAddress.state}
                          onChange={(e) =>
                            handleCustomerInputChange(
                              "shippingAddress.state",
                              e.target.value,
                            )
                          }
                          placeholder="State"
                          className="w-full px-3 py-2 text-sm border border-violet-100 rounded-lg focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 bg-white text-gray-900 placeholder-gray-400 transition-all duration-200"
                        />
                        <input
                          type="text"
                          value={customerDetails.shippingAddress.postalCode}
                          onChange={(e) =>
                            handleCustomerInputChange(
                              "shippingAddress.postalCode",
                              e.target.value,
                            )
                          }
                          placeholder="PIN"
                          className="w-full px-3 py-2 text-sm border border-violet-100 rounded-lg focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 bg-white text-gray-900 placeholder-gray-400 transition-all duration-200"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Items Card ── */}
            <div className="rounded-2xl overflow-hidden shadow-xl shadow-purple-100/60 border border-purple-100/80 bg-white/80 backdrop-blur-sm">
              <div className="bg-linear-to-r from-violet-500 to-purple-600 px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-sm">
                    <FiShoppingCart className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="text-sm font-semibold text-white tracking-wide">
                    Invoice Items
                  </h3>
                </div>
                {editingIndex >= 0 && (
                  <span className="text-xs font-semibold text-white/90 bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-full">
                    Editing item #{editingIndex + 1}
                  </span>
                )}
              </div>

              <div className="p-5">
                {/* Add / Edit item form */}
                <div
                  className={`rounded-2xl p-4 mb-5 border-2 transition-all duration-300 ${editingIndex >= 0 ? "bg-linear-to-br from-violet-50 to-purple-50 border-violet-300 shadow-lg shadow-violet-100/60" : "bg-linear-to-br from-slate-50/80 to-gray-50 border-gray-200 hover:border-purple-200 hover:shadow-md"}`}
                >
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="col-span-2 relative">
                      <label className="block text-xs font-bold text-purple-600/80 uppercase tracking-widest mb-1.5">
                        Product / Service
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={itemForm.name}
                          onChange={(e) =>
                            handleProductNameChange(e.target.value)
                          }
                          onKeyDown={handleProductKeyDown}
                          onFocus={() => {
                            setShowProductDropdown(true);
                          }}
                          onBlur={() =>
                            setTimeout(() => setShowProductDropdown(false), 150)
                          }
                          placeholder="Search or enter product name..."
                          autoComplete="off"
                          className="w-full px-4 py-2.5 text-sm border-2 border-gray-100 rounded-xl focus:outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-100 bg-white text-gray-900 placeholder-gray-400 transition-all duration-200"
                        />
                        {/* Inline preview removed to avoid visual misalignment */}
                        <div
                          className={`absolute top-full left-0 right-0 z-30 transition-all duration-200 ${showProductDropdown && ((itemForm.name && productSearchResults.length > 0) || (!itemForm.name && products.length > 0)) ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"}`}
                        >
                          <div className="bg-white/95 backdrop-blur-xl border border-purple-100 rounded-2xl shadow-2xl shadow-purple-200/40 mt-1.5 max-h-48 overflow-auto">
                            {(itemForm.name && productSearchResults.length > 0
                              ? productSearchResults.map((product) => ({
                                  _id: product.value,
                                  name: product.label.split("(")[0].trim(),
                                  price: parseFloat(
                                    (product.label.match(/₹([0-9,]+(?:\.[0-9]+)?)/)?.[1] || "0").replace(/,/g, ""),
                                  ),
                                }))
                              : !itemForm.name && products.length > 0
                                ? products.slice(0, 8)
                                : []
                            ).map((product, index) => (
                              <button
                                key={product._id}
                                type="button"
                                className={`w-full text-left px-4 py-2.5 flex items-center justify-between border-b border-gray-50 last:border-0 transition-all duration-150 group ${
                                  hoveredProductIndex === index
                                    ? "bg-linear-to-r from-violet-100 to-purple-100 border-purple-200"
                                    : "hover:bg-linear-to-r hover:from-violet-50 hover:to-purple-50"
                                }`}
                                onMouseEnter={() => setHoveredProductIndex(index)}
                                onClick={() =>
                                  handleProductSelect(product._id)
                                }
                              >
                                <div className="flex items-center gap-3 flex-1">
                                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-150 ${
                                    hoveredProductIndex === index
                                      ? "border-purple-600 bg-purple-600"
                                      : "border-gray-300 bg-white group-hover:border-purple-400"
                                  }`}>
                                    {hoveredProductIndex === index && (
                                      <svg
                                        className="w-3 h-3 text-white"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                    )}
                                  </div>
                                  <span className={`text-sm font-semibold transition-colors ${
                                    hoveredProductIndex === index
                                      ? "text-purple-700"
                                      : "text-gray-900 group-hover:text-purple-700"
                                  }`}>
                                    {product.name}
                                  </span>
                                </div>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full transition-all ${
                                  hoveredProductIndex === index
                                    ? "text-white bg-purple-600"
                                    : "text-purple-600 bg-purple-50 group-hover:bg-purple-100"
                                }`}>
                                  {formatINR(product.price)}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      {itemForm.productId &&
                        itemForm.availableStock !== null && (
                          <p
                            className={`mt-1.5 text-xs font-medium ${Number(itemForm.availableStock) > 0 ? "text-emerald-600" : "text-red-600"}`}
                          >
                            Available stock: {itemForm.availableStock}
                          </p>
                        )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-purple-600/80 uppercase tracking-widest mb-1.5">
                        HSN Code
                      </label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowHsnDropdown((s) => !s)}
                          onBlur={() => setTimeout(() => setShowHsnDropdown(false), 150)}
                          className={`w-full px-4 py-2.5 text-sm border-2 border-gray-100 rounded-xl focus:outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-100 bg-white text-gray-900 placeholder-gray-400 transition-all duration-200 flex items-center justify-between`}
                        >
                          <span className={`${itemForm.hsnCode ? "text-gray-900" : "text-gray-500"} truncate`}>{itemForm.hsnCode || "(Optional) Select HSN code"}</span>
                          <svg className={`h-5 w-5 text-gray-400 transition-transform ${showHsnDropdown ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        <div className={`absolute top-full left-0 right-0 z-30 transition-all duration-200 ${showHsnDropdown ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"}`}>
                          <div className="bg-white/95 backdrop-blur-xl border border-purple-100 rounded-2xl shadow-2xl shadow-purple-200/40 mt-1.5 max-h-48 overflow-auto">
                            {hsnOptions.map((opt, index) => (
                              <button
                                key={opt.value}
                                type="button"
                                className={`w-full text-left px-4 py-2.5 flex items-center justify-between border-b border-gray-50 last:border-0 transition-all duration-150 group ${hoveredHsnIndex === index ? "bg-linear-to-r from-violet-100 to-purple-100 border-purple-200" : "hover:bg-linear-to-r hover:from-violet-50 hover:to-purple-50"}`}
                                onMouseEnter={() => setHoveredHsnIndex(index)}
                                onMouseLeave={() => setHoveredHsnIndex(null)}
                                onClick={() => {
                                  handleItemFormChange("hsnCode", opt.value);
                                  setShowHsnDropdown(false);
                                }}
                              >
                                <div className="flex items-center gap-3 flex-1">
                                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-150 ${hoveredHsnIndex === index ? "border-purple-600 bg-purple-600" : "border-gray-300 bg-white group-hover:border-purple-400"}`}>
                                    {hoveredHsnIndex === index && (
                                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                    )}
                                  </div>
                                  <span className={`text-sm font-semibold transition-colors ${hoveredHsnIndex === index ? "text-purple-700" : "text-gray-900 group-hover:text-purple-700"}`}>
                                    {opt.label}
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-3 items-end">
                    <NumberInput
                      label="Qty"
                      name="quantity"
                      min={1}
                      step={1}
                      value={itemForm.quantity}
                      onChange={(e) =>
                        handleItemFormChange("quantity", e.target.value)
                      }
                    />
                    <NumberInput
                      label="Price (₹)"
                      name="unitPrice"
                      min={0}
                      step={0.01}
                      prefix="₹"
                      placeholder="0.00"
                      value={itemForm.unitPrice}
                      onChange={(e) =>
                        handleItemFormChange("unitPrice", e.target.value)
                      }
                    />
                    <NumberInput
                      label="GST %"
                      name="gst"
                      min={0}
                      max={100}
                      step={0.1}
                      value={itemForm.gst}
                      onChange={(e) =>
                        handleItemFormChange("gst", e.target.value)
                      }
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={addOrUpdateItem}
                        disabled={!itemForm.name || itemForm.quantity <= 0}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 text-sm font-bold rounded-xl text-white bg-linear-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-lg shadow-purple-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-purple-300 hover:-translate-y-0.5 active:translate-y-0"
                      >
                        {editingIndex >= 0 ? (
                          <>
                            <FiCheck className="h-3.5 w-3.5" /> Save
                          </>
                        ) : (
                          <>
                            <FiPlus className="h-3.5 w-3.5" /> Add
                          </>
                        )}
                      </button>
                      {editingIndex >= 0 && (
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="py-2.5 px-3 rounded-xl text-gray-500 border-2 border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 hover:-translate-y-0.5"
                        >
                          <FiX className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Items table */}
                {formData.items.length === 0 ? (
                  <div className="text-center py-14">
                    <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-linear-to-br from-violet-100 to-purple-100 flex items-center justify-center shadow-inner">
                      <FiShoppingCart className="h-8 w-8 text-purple-300" />
                    </div>
                    <p className="text-sm font-semibold text-gray-400">
                      No items yet
                    </p>
                    <p className="text-xs text-gray-300 mt-1">
                      Add your first item using the form above
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-purple-100 overflow-hidden shadow-sm">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-linear-to-r from-violet-50 to-purple-50 text-purple-500 uppercase tracking-wider">
                          <th className="px-4 py-3 text-left font-bold">#</th>
                          <th className="px-4 py-3 text-left font-bold">
                            Item
                          </th>
                          <th className="px-4 py-3 text-right font-bold">
                            Qty
                          </th>
                          <th className="px-4 py-3 text-right font-bold">
                            Rate
                          </th>
                          <th className="px-4 py-3 text-right font-bold">
                            Base
                          </th>
                          <th className="px-4 py-3 text-right font-bold">
                            GST
                          </th>
                          <th className="px-4 py-3 text-right font-bold">
                            Total
                          </th>
                          <th className="px-4 py-3 text-center font-bold"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-purple-50">
                        {formData.items.map((item, index) => {
                          const inclusiveTotal = item.quantity * item.unitPrice;
                          const baseAmount =
                            inclusiveTotal / (1 + item.gst / 100);
                          const gstAmount = inclusiveTotal - baseAmount;
                          return (
                            <tr
                              key={index}
                              onClick={() => editItem(index)}
                              className={`cursor-pointer transition-all duration-200 group ${editingIndex === index ? "bg-linear-to-r from-violet-50 to-purple-50" : "hover:bg-linear-to-r hover:from-violet-50/60 hover:to-purple-50/40"}`}
                            >
                              <td className="px-4 py-3">
                                <span
                                  className="w-5 h-5 rounded-full bg-linear-to-br from-violet-400 to-purple-500 text-white flex items-center justify-center font-bold"
                                  style={{ fontSize: "10px" }}
                                >
                                  {index + 1}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-semibold text-gray-800 group-hover:text-purple-700 transition-colors">
                                {item.name}
                                {item.hsnCode && (
                                  <span
                                    className="text-gray-400 font-normal ml-1"
                                    style={{ fontSize: "10px" }}
                                  >
                                    ({item.hsnCode})
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right text-gray-600">
                                {item.quantity}
                              </td>
                              <td className="px-4 py-3 text-right text-gray-600">
                                ₹{Number(item.unitPrice).toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-right text-gray-600">
                                ₹{baseAmount.toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-right text-purple-500 font-medium">
                                {item.gst}%
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-gray-900">
                                ₹{inclusiveTotal.toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div
                                  className="flex items-center justify-center gap-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    onClick={() => editItem(index)}
                                    className="p-1.5 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-150"
                                  >
                                    <FiEdit3 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removeItem(index)}
                                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-150"
                                  >
                                    <FiTrash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN: Summary Sidebar ── */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl overflow-hidden shadow-2xl shadow-indigo-200/50 border border-indigo-100/80 bg-white/90 backdrop-blur-sm sticky top-4">
              {/* Sidebar gradient header */}
              <div className="bg-linear-to-r from-indigo-600 via-violet-600 to-purple-600 px-5 py-3 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                  <FiCreditCard className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-sm font-semibold text-white">
                  Invoice Summary
                </h3>
              </div>

              {/* Totals */}
              <div className="p-4 bg-linear-to-br from-indigo-50/70 via-violet-50/40 to-purple-50/30">
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 font-medium">
                      {formData.isGstBill ? "Base Amount" : "Subtotal"}
                    </span>
                    <span className="font-semibold text-gray-800">
                      {formatINR(
                        formData.isGstBill
                          ? calculateSubtotal()
                          : calculateTotal(),
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span
                      className={`text-gray-500 font-medium ${!formData.isGstBill ? "opacity-60" : ""}`}
                    >
                      GST Total
                    </span>
                    <span
                      className={`font-semibold text-gray-800 ${!formData.isGstBill ? "opacity-60" : ""}`}
                    >
                      {formatINR(formData.isGstBill ? calculateTotalGst() : 0)}
                    </span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-indigo-100/60">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-gray-700">
                        Grand Total
                      </span>
                      <span className="text-2xl font-black bg-linear-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                        {formatINR(calculateTotal())}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Settings */}
              <div className="p-4 space-y-4 border-t border-indigo-50">
                {/* Invoice type */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                    Invoice Type
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100/80 rounded-xl">
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, isGstBill: true }))
                      }
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition-all duration-300 ${formData.isGstBill ? "bg-linear-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-200 -translate-y-0.5" : "text-gray-500 hover:text-gray-700"}`}
                    >
                      Tax Invoice
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, isGstBill: false }))
                      }
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition-all duration-300 ${!formData.isGstBill ? "bg-linear-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-200 -translate-y-0.5" : "text-gray-500 hover:text-gray-700"}`}
                    >
                      Estimate
                    </button>
                  </div>
                  <div className="h-5 mt-2">
                    {!formData.isGstBill && (
                      <p className="text-xs text-amber-600 flex items-center gap-1.5 font-medium">
                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full inline-block shrink-0" />
                        PDF will say &ldquo;ESTIMATE&rdquo;
                      </p>
                    )}
                  </div>
                </div>

                {/* IGST toggle */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                    Tax Mode
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100/80 rounded-xl">
                    <button
                      type="button"
                      disabled={!formData.isGstBill}
                      onClick={() => {
                        setFormData((prev) => {
                          if (!prev.isGstBill) return prev;
                          return { ...prev, isIgst: false };
                        });
                      }}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${!formData.isIgst ? "bg-linear-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-200 -translate-y-0.5" : "text-gray-500 hover:text-gray-700"}`}
                    >
                      CGST + SGST
                    </button>
                    <button
                      type="button"
                      disabled={!formData.isGstBill}
                      onClick={() => {
                        setFormData((prev) => {
                          if (!prev.isGstBill) return prev;
                          return { ...prev, isIgst: true };
                        });
                      }}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${formData.isIgst ? "bg-linear-to-r from-teal-500 to-emerald-600 text-white shadow-lg shadow-teal-200 -translate-y-0.5" : "text-gray-500 hover:text-gray-700"}`}
                    >
                      IGST
                    </button>
                  </div>
                  <div className="h-5 mt-2">
                    {formData.isGstBill && formData.isIgst && (
                      <p className="text-xs text-teal-600 flex items-center gap-1.5 font-medium">
                        <span className="w-1.5 h-1.5 bg-teal-500 rounded-full inline-block shrink-0" />
                        Inter-state supply (IGST)
                      </p>
                    )}
                  </div>
                </div>

                {/* Payment method */}
                <Dropdown
                  label="Payment Method"
                  name="billType"
                  value={formData.billType}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, billType: e.target.value }))
                  }
                  placeholder="Select payment method"
                  options={[
                    { value: "pay", label: "💵 Cash Bill" },
                    { value: "credit", label: "🏦 Credit Bill" },
                  ]}
                />

                {/* Vehicle number */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                    Vehicle Number
                  </label>
                  <input
                    type="text"
                    value={formData.vehicleNumber}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        vehicleNumber: e.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="e.g. TN 01 AB 1234"
                    className="w-full px-4 py-2.5 text-sm border-2 border-gray-100 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 bg-gray-50/50 text-gray-900 placeholder-gray-400 transition-all duration-200 uppercase tracking-widest font-medium"
                  />
                </div>

                {/* Original / Duplicate toggle */}
                {formData.isGstBill && (
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                      Copy Type
                    </label>
                    <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100/80 rounded-xl">
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, copyType: "original" }))
                        }
                        className={`py-2 px-3 rounded-lg text-xs font-bold transition-all duration-300 ${
                          formData.copyType === "original"
                            ? "bg-linear-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-200 -translate-y-0.5"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        Original
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, copyType: "duplicate" }))
                        }
                        className={`py-2 px-3 rounded-lg text-xs font-bold transition-all duration-300 ${
                          formData.copyType === "duplicate"
                            ? "bg-linear-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-200 -translate-y-0.5"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        Duplicate
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit CTA */}
              <div className="p-4 pt-0 space-y-2.5">
                <div className="relative group">
                  <div
                    className={`absolute -inset-0.5 bg-linear-to-r from-indigo-500 to-violet-600 rounded-2xl blur-sm transition-all duration-300 ${loading || formData.items.length === 0 || !customerDetails.name ? "opacity-20" : "opacity-60 group-hover:opacity-90"}`}
                  />
                  <button
                    type="submit"
                    disabled={
                      loading ||
                      formData.items.length === 0 ||
                      !customerDetails.name
                    }
                    className="relative w-full flex items-center justify-center gap-2 py-3 px-4 bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-sm font-bold rounded-xl shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{" "}
                        Creating...
                      </>
                    ) : (
                      <>
                        <FiSave className="h-4 w-4" /> Create Invoice
                      </>
                    )}
                  </button>
                </div>
                <Link href="/dashboard/invoices">
                  <button
                    type="button"
                    className="w-full py-2.5 px-4 text-sm font-semibold text-gray-400 border-2 border-gray-100 rounded-xl hover:bg-gray-50 hover:border-gray-200 hover:text-gray-600 transition-all duration-200"
                  >
                    Cancel
                  </button>
                </Link>
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200/80 text-red-600 rounded-xl text-xs flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
