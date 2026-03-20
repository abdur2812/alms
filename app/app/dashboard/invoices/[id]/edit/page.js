"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { invoicesAPI, customersAPI, productsAPI } from "@/lib/api";
import { formatINR } from "@/lib/formatters";
import {
  FiPlus,
  FiTrash2,
  FiUser,
  FiShoppingCart,
  FiCreditCard,
  FiSave,
} from "react-icons/fi";
import Link from "next/link";
import { Dropdown, NumberInput } from "@/components/UI";

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
      sameAsPermanent: true,
    },
    items: [],
    isGstBill: true,
    isIgst: false,
    billType: "pay",
    vehicleNumber: "",
    copyType: "original",
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

      const snapshotCustomer = invoice.customerData || {};
      const sourcePermanentAddress =
        snapshotCustomer.permanentAddress ||
        snapshotCustomer.address ||
        invoice.customerId?.permanentAddress ||
        invoice.customerId?.address ||
        {};
      const sourceShippingAddress =
        snapshotCustomer.shippingAddress || sourcePermanentAddress;

      const normalizeAddress = (address = {}) => ({
        companyAddress: address.companyAddress || "",
        city: address.city || "",
        state: address.state || "",
        postalCode: address.postalCode || "",
        country: address.country || "India",
      });

      const permanentAddress = normalizeAddress(sourcePermanentAddress);
      const shippingAddress = normalizeAddress(sourceShippingAddress);

      const customerData = {
        name: snapshotCustomer.name || invoice.customerId?.name || "",
        phone: snapshotCustomer.phone || invoice.customerId?.phone || "",
        gstNumber:
          snapshotCustomer.gstNumber || invoice.customerId?.gstNumber || "",
        // Keep `address` for this form's existing field bindings.
        address: permanentAddress,
        permanentAddress,
        shippingAddress,
        sameAsPermanent:
          snapshotCustomer.sameAsPermanent !== undefined
            ? snapshotCustomer.sameAsPermanent
            : true,
      };

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
        isIgst: invoice.isIgst || false,
        billType: invoice.billType || "pay",
        vehicleNumber: invoice.vehicleNumber || "",
        copyType: invoice.copyType || "original",
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
      const quantity = parseFloat(item.quantity) || 0;
      const unitPrice = parseFloat(item.unitPrice) || 0;
      const gstRate = parseFloat(item.gst) || 0;
      const inclusiveAmount = quantity * unitPrice;

      if (!formData.isGstBill || gstRate <= 0) {
        return sum + inclusiveAmount;
      }

      // Prices are GST-inclusive in this app. Subtotal is the base amount.
      const baseAmount = inclusiveAmount / (1 + gstRate / 100);
      return sum + baseAmount;
    }, 0);
  };

  const calculateTax = () => {
    return formData.items.reduce((sum, item) => {
      const quantity = parseFloat(item.quantity) || 0;
      const unitPrice = parseFloat(item.unitPrice) || 0;
      const gstRate = parseFloat(item.gst) || 0;
      const inclusiveAmount = quantity * unitPrice;

      if (!formData.isGstBill || gstRate <= 0) {
        return sum;
      }

      // GST component extracted from GST-inclusive amount.
      const baseAmount = inclusiveAmount / (1 + gstRate / 100);
      const gstAmount = inclusiveAmount - baseAmount;
      return sum + gstAmount;
    }, 0);
  };

  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => {
      const quantity = parseFloat(item.quantity) || 0;
      const unitPrice = parseFloat(item.unitPrice) || 0;
      return sum + quantity * unitPrice;
    }, 0);
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
        customerData: {
          ...formData.customerData,
          // Keep legacy `address` and current `permanentAddress` in sync.
          address: {
            ...formData.customerData.address,
          },
          permanentAddress: {
            ...formData.customerData.address,
          },
          shippingAddress:
            formData.customerData.sameAsPermanent === false
              ? {
                  ...formData.customerData.shippingAddress,
                }
              : {
                  ...formData.customerData.address,
                },
          sameAsPermanent:
            formData.customerData.sameAsPermanent !== undefined
              ? formData.customerData.sameAsPermanent
              : true,
        },
        items: formData.items.map((item) => ({
          productId: item.productId,
          name: item.name,
          quantity: parseInt(item.quantity),
          unitPrice: parseFloat(item.unitPrice),
          gst: parseFloat(item.gst),
          hsnCode: item.hsnCode,
        })),
        isGstBill: formData.isGstBill,
        isIgst: formData.isIgst,
        billType: formData.billType,
        vehicleNumber: formData.vehicleNumber || "",
        copyType: formData.copyType || "original",
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
      <div className="max-w-7xl mx-auto px-4 py-5">
        <div className="text-center py-16">
          <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-sm text-gray-500 font-medium">
            Loading invoice...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-5 space-y-4">
      {/* Header */}
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
          Edit Invoice
        </h1>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200/80 text-red-600 rounded-xl text-sm flex items-start gap-2">
          <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 shrink-0" />
          {error}
        </div>
      )}

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
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-indigo-500/80 uppercase tracking-widest mb-1.5">
                      Customer Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.customerData.name}
                      onChange={handleCustomerDataChange}
                      placeholder="Enter customer name"
                      required
                      className="w-full px-4 py-2.5 text-sm border-2 border-gray-100 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 bg-gray-50/50 text-gray-900 placeholder-gray-400 transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-indigo-500/80 uppercase tracking-widest mb-1.5">
                      Phone
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.customerData.phone}
                      onChange={handleCustomerDataChange}
                      placeholder="Phone number"
                      className="w-full px-4 py-2.5 text-sm border-2 border-gray-100 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 bg-gray-50/50 text-gray-900 placeholder-gray-400 transition-all duration-200"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-indigo-500/80 uppercase tracking-widest mb-1.5">
                    GST Number
                  </label>
                  <input
                    type="text"
                    name="gstNumber"
                    value={formData.customerData.gstNumber}
                    onChange={handleCustomerDataChange}
                    placeholder="29ABCDE1234F1Z5"
                    className="w-full px-4 py-2.5 text-sm border-2 border-gray-100 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 bg-gray-50/50 text-gray-900 placeholder-gray-400 transition-all duration-200 uppercase"
                  />
                </div>
                <div className="rounded-xl border border-blue-100 bg-blue-50/30 p-3.5 space-y-2.5">
                  <div className="text-xs font-bold text-blue-600 uppercase tracking-widest">
                    Billing Address
                  </div>
                  <input
                    type="text"
                    name="address.companyAddress"
                    value={formData.customerData.address.companyAddress}
                    onChange={handleCustomerDataChange}
                    placeholder="Street / Company"
                    className="w-full px-3 py-2 text-sm border border-blue-100 rounded-lg focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 bg-white text-gray-900 placeholder-gray-400 transition-all duration-200"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      name="address.city"
                      value={formData.customerData.address.city}
                      onChange={handleCustomerDataChange}
                      placeholder="City"
                      className="w-full px-3 py-2 text-sm border border-blue-100 rounded-lg focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 bg-white text-gray-900 placeholder-gray-400 transition-all duration-200"
                    />
                    <input
                      type="text"
                      name="address.state"
                      value={formData.customerData.address.state}
                      onChange={handleCustomerDataChange}
                      placeholder="State"
                      className="w-full px-3 py-2 text-sm border border-blue-100 rounded-lg focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 bg-white text-gray-900 placeholder-gray-400 transition-all duration-200"
                    />
                    <input
                      type="text"
                      name="address.postalCode"
                      value={formData.customerData.address.postalCode}
                      onChange={handleCustomerDataChange}
                      placeholder="PIN"
                      className="w-full px-3 py-2 text-sm border border-blue-100 rounded-lg focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 bg-white text-gray-900 placeholder-gray-400 transition-all duration-200"
                    />
                  </div>
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
                <button
                  type="button"
                  onClick={addItem}
                  className="flex items-center gap-1.5 py-1.5 px-3 text-xs font-bold rounded-lg text-white bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-all duration-200"
                >
                  <FiPlus className="h-3.5 w-3.5" /> Add Item
                </button>
              </div>
              <div className="p-5 space-y-3">
                {formData.items.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-linear-to-br from-violet-100 to-purple-100 flex items-center justify-center shadow-inner">
                      <FiShoppingCart className="h-7 w-7 text-purple-300" />
                    </div>
                    <p className="text-sm font-semibold text-gray-400">
                      No items
                    </p>
                  </div>
                ) : (
                  formData.items.map((item, index) => (
                    <div
                      key={index}
                      className="rounded-2xl p-4 border-2 border-gray-100 bg-linear-to-br from-slate-50/80 to-gray-50 space-y-3 hover:border-purple-200 transition-all duration-200"
                    >
                      <div className="flex items-center justify-between">
                        <span className="w-6 h-6 rounded-full bg-linear-to-br from-violet-400 to-purple-500 text-white flex items-center justify-center font-bold text-xs">
                          {index + 1}
                        </span>
                        {formData.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-150"
                            title="Remove item"
                          >
                            <FiTrash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                          <label className="block text-xs font-bold text-purple-600/80 uppercase tracking-widest mb-1.5">
                            Product / Service
                          </label>
                          <Dropdown
                            value={item.productId || ""}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "productId",
                                e.target.value,
                              )
                            }
                            placeholder="Select product"
                            options={products.map((p) => ({
                              value: p._id,
                              label: `${p.name} (${formatINR(p.price)})`,
                            }))}
                            onSearch={searchProducts}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-purple-600/80 uppercase tracking-widest mb-1.5">
                            HSN Code
                          </label>
                          <input
                            type="text"
                            value={item.hsnCode}
                            onChange={(e) =>
                              handleItemChange(index, "hsnCode", e.target.value)
                            }
                            placeholder="Optional"
                            className="w-full px-4 py-2.5 text-sm border-2 border-gray-100 rounded-xl focus:outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-100 bg-white text-gray-900 placeholder-gray-400 transition-all duration-200"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-purple-600/80 uppercase tracking-widest mb-1.5">
                          Product Name *
                        </label>
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) =>
                            handleItemChange(index, "name", e.target.value)
                          }
                          placeholder="Enter product name"
                          required
                          className="w-full px-4 py-2.5 text-sm border-2 border-gray-100 rounded-xl focus:outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-100 bg-white text-gray-900 placeholder-gray-400 transition-all duration-200"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-purple-600/80 uppercase tracking-widest mb-1.5">
                            Qty
                          </label>
                          <NumberInput
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "quantity",
                                e.target.value,
                              )
                            }
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-purple-600/80 uppercase tracking-widest mb-1.5">
                            Price (₹ incl. GST)
                          </label>
                          <NumberInput
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "unitPrice",
                                e.target.value,
                              )
                            }
                            prefix="₹"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-purple-600/80 uppercase tracking-widest mb-1.5">
                            GST %
                          </label>
                          <NumberInput
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
                    </div>
                  ))
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
                      {formatINR(calculateSubtotal())}
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
                      {formatINR(formData.isGstBill ? calculateTax() : 0)}
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
                        setFormData({ ...formData, isGstBill: true })
                      }
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition-all duration-300 ${
                        formData.isGstBill
                          ? "bg-linear-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-200 -translate-y-0.5"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      Tax Invoice
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, isGstBill: false })
                      }
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition-all duration-300 ${
                        !formData.isGstBill
                          ? "bg-linear-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-200 -translate-y-0.5"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
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
                        if (!formData.isGstBill) return;
                        setFormData({ ...formData, isIgst: false });
                      }}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                        !formData.isIgst
                          ? "bg-linear-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-200 -translate-y-0.5"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      CGST + SGST
                    </button>
                    <button
                      type="button"
                      disabled={!formData.isGstBill}
                      onClick={() => {
                        if (!formData.isGstBill) return;
                        setFormData({ ...formData, isIgst: true });
                      }}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                        formData.isIgst
                          ? "bg-linear-to-r from-teal-500 to-emerald-600 text-white shadow-lg shadow-teal-200 -translate-y-0.5"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
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
                    setFormData({ ...formData, billType: e.target.value })
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
                      setFormData({
                        ...formData,
                        vehicleNumber: e.target.value.toUpperCase(),
                      })
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
                          setFormData({ ...formData, copyType: "original" })
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
                          setFormData({ ...formData, copyType: "duplicate" })
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
                    className={`absolute -inset-0.5 bg-linear-to-r from-indigo-500 to-violet-600 rounded-2xl blur-sm transition-all duration-300 ${
                      saving
                        ? "opacity-20"
                        : "opacity-60 group-hover:opacity-90"
                    }`}
                  />
                  <button
                    type="submit"
                    disabled={saving}
                    className="relative w-full flex items-center justify-center gap-2 py-3 px-4 bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-sm font-bold rounded-xl shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0"
                  >
                    {saving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{" "}
                        Saving...
                      </>
                    ) : (
                      <>
                        <FiSave className="h-4 w-4" /> Save Changes
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
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
