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
  FiSave,
} from "react-icons/fi";
import Link from "next/link";
import { Dropdown, NumberInput } from "@/components/UI";

export default function NewCleanEstimatePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);

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
  const [usePermanentAddress, setUsePermanentAddress] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerInput, setCustomerInput] = useState("");

  const [items, setItems] = useState([]);
  const [itemForm, setItemForm] = useState({
    productId: "",
    name: "",
    quantity: 1,
    unitPrice: 0,
    gst: 0,
    hsnCode: "",
    availableStock: null,
  });
  const [editingIndex, setEditingIndex] = useState(-1);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [productAutofill, setProductAutofill] = useState("");
  const [hoveredProductIndex, setHoveredProductIndex] = useState(0);
  const [productSearchResults, setProductSearchResults] = useState([]);
  const [isSearchingProducts, setIsSearchingProducts] = useState(false);

  useEffect(() => {
    fetchCustomers();
    fetchProducts();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await customersAPI.getAll({ limit: 1000 });
      setCustomers(res.data.data);
    } catch (e) {
      console.error(e);
    }
  };
  const fetchProducts = async () => {
    try {
      const res = await productsAPI.getPopular({ limit: 1000 });
      setProducts(res.data.data);
    } catch (e) {
      console.error(e);
    }
  };
  const searchProducts = async (searchTerm) => {
    const res = await productsAPI.getAll({ limit: 50, search: searchTerm });
    return res.data.data.map((p) => ({
      value: p._id,
      label: `${p.name} (${formatINR(p.price)})`,
    }));
  };

  const handleCustomerInputChange = (field, value) => {
    if (field.includes(".")) {
      const [parent, child] = field.split(".");
      setCustomerDetails((prev) => ({
        ...prev,
        [parent]: { ...prev[parent], [child]: value },
      }));
    } else {
      setCustomerDetails((prev) => ({ ...prev, [field]: value }));
    }
    if (field === "name") {
      setCustomerInput(value);
      if (!value) {
        setSelectedCustomer(null);
        return;
      }
    }
  };

  const handleCustomerSelect = async (customerId) => {
    try {
      const res = await customersAPI.getById(customerId);
      const c = res.data.data;
      setSelectedCustomer(c);
      setCustomerInput(c.name);
      setCustomerDetails({
        name: c.name || "",
        phone: c.phone || "",
        gstNumber: c.gstNumber || "",
        permanentAddress: {
          companyAddress: c.permanentAddress?.companyAddress || "",
          city: c.permanentAddress?.city || "",
          state: c.permanentAddress?.state || "",
          postalCode: c.permanentAddress?.postalCode || "",
          country: c.permanentAddress?.country || "India",
        },
        shippingAddress: {
          companyAddress: c.shippingAddress?.companyAddress || c.permanentAddress?.companyAddress || "",
          city: c.shippingAddress?.city || c.permanentAddress?.city || "",
          state: c.shippingAddress?.state || c.permanentAddress?.state || "",
          postalCode: c.shippingAddress?.postalCode || c.permanentAddress?.postalCode || "",
          country: c.shippingAddress?.country || "India",
        },
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleItemFormChange = (field, value) => {
    setItemForm((prev) => ({ ...prev, [field]: value }));
  };
  const handleProductSelect = async (productId) => {
    if (!productId) return;
    try {
      const res = await productsAPI.getById(productId);
      const p = res.data.data;
      setItemForm((prev) => ({
        ...prev,
        productId,
        name: p.name,
        unitPrice: p.price || 0,
        availableStock: p.stockQuantity,
      }));
      setShowProductDropdown(false);
      setProductAutofill("");
    } catch (e) {
      console.error(e);
    }
  };
  const handleProductNameChange = async (value) => {
    setItemForm((prev) => ({ ...prev, name: value, productId: "", availableStock: null }));
    if (!value) {
      setShowProductDropdown(false);
      return;
    }
    try {
      setIsSearchingProducts(true);
      const results = await searchProducts(value);
      setProductSearchResults(results);
      if (results.length > 0) {
        setShowProductDropdown(true);
        const exact = results.find((r) => r.label.toLowerCase().startsWith(value.toLowerCase()));
        setProductAutofill(exact ? exact.label : "");
      } else {
        setShowProductDropdown(false);
      }
    } catch (e) {
      setShowProductDropdown(false);
    } finally {
      setIsSearchingProducts(false);
    }
  };
  const handleProductKeyDown = (e) => {
    if (e.key !== "Enter" && e.key !== "Tab") return;
    const display = itemForm.name && productSearchResults.length > 0 ? productSearchResults : products;
    if (display.length > 0 && hoveredProductIndex < display.length) {
      e.preventDefault();
      const sel = display[hoveredProductIndex];
      handleProductSelect(sel.value || sel._id);
    }
  };

  const addOrUpdateItem = () => {
    if (!itemForm.name || itemForm.quantity <= 0 || itemForm.unitPrice < 0) {
      alert("Please fill all required fields");
      return;
    }
    const newItems = [...items];
    if (editingIndex >= 0) {
      newItems[editingIndex] = { ...itemForm };
      setEditingIndex(-1);
    } else {
      newItems.push({ ...itemForm });
    }
    setItems(newItems);
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
  };
  const editItem = (index) => {
    setItemForm({ ...items[index] });
    setEditingIndex(index);
  };
  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
    if (editingIndex === index) {
      setEditingIndex(-1);
      setItemForm({ productId: "", name: "", quantity: 1, unitPrice: 0, gst: 0, hsnCode: "", availableStock: null });
    }
  };
  const cancelEdit = () => {
    setEditingIndex(-1);
    setItemForm({ productId: "", name: "", quantity: 1, unitPrice: 0, gst: 0, hsnCode: "", availableStock: null });
  };

  const calculateTotal = () => items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (!customerDetails.name) throw new Error("Please enter customer name");
      if (items.length === 0) throw new Error("Please add at least one item");
      const validItems = items.filter((it) => it.name && it.quantity > 0 && it.unitPrice >= 0);
      if (validItems.length === 0) throw new Error("Please add at least one valid item");

      const invoiceData = {
        isGstBill: false,
        isCleanEstimate: true,
        billType: "pay",
        vehicleNumber: "",
        copyType: "original",
        isIgst: false,
        items: validItems.map((it) => ({
          productId: it.productId || null,
          name: it.name,
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
          gst: 0,
          hsnCode: "",
        })),
        customerData: {
          name: customerDetails.name,
          phone: customerDetails.phone,
          gstNumber: undefined,
          permanentAddress: customerDetails.permanentAddress,
          shippingAddress: usePermanentAddress ? customerDetails.permanentAddress : customerDetails.shippingAddress,
          sameAsPermanent: usePermanentAddress,
        },
      };
      if (selectedCustomer) invoiceData.customerId = selectedCustomer._id;

      const res = await invoicesAPI.create(invoiceData);
      router.push(`/dashboard/invoices/${res.data.data._id}/view`);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to create estimate");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/invoices" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            ← Invoices
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-base font-bold text-gray-900 tracking-tight">New Clean Estimate</h1>
          <span className="text-xs px-2 py-1 bg-gray-100 border border-gray-200 rounded-full font-medium">A5 • No shop • No GST</span>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            {/* Customer */}
            <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-200 bg-white">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                <FiUser className="h-4 w-4 text-gray-600" />
                <h3 className="text-sm font-semibold text-gray-900">Customer</h3>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Customer Name *</label>
                  <input
                    type="text"
                    value={customerDetails.name}
                    onChange={(e) => handleCustomerInputChange("name", e.target.value)}
                    placeholder="Enter customer name"
                    required
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
                  />
                  {customers.filter((c) => c.name.toLowerCase().includes(customerDetails.name.toLowerCase())).length > 0 && customerDetails.name && (
                    <div className="mt-1 border border-gray-200 rounded-xl bg-white shadow-sm max-h-40 overflow-auto">
                      {customers
                        .filter((c) => c.name.toLowerCase().includes(customerDetails.name.toLowerCase()))
                        .slice(0, 6)
                        .map((c) => (
                          <button key={c._id} type="button" onClick={() => handleCustomerSelect(c._id)} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm">
                            <div className="font-medium text-gray-900">{c.name}</div>
                            <div className="text-xs text-gray-500">{c.phone || ""}</div>
                          </button>
                        ))}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Phone</label>
                    <input
                      type="tel"
                      value={customerDetails.phone}
                      onChange={(e) => handleCustomerInputChange("phone", e.target.value)}
                      placeholder="Phone"
                      className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">City</label>
                    <input
                      type="text"
                      value={customerDetails.permanentAddress.city}
                      onChange={(e) => handleCustomerInputChange("permanentAddress.city", e.target.value)}
                      placeholder="City"
                      className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
                    />
                  </div>
                </div>
                <input
                  type="text"
                  value={customerDetails.permanentAddress.companyAddress}
                  onChange={(e) => handleCustomerInputChange("permanentAddress.companyAddress", e.target.value)}
                  placeholder="Address"
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
                />
              </div>
            </div>

            {/* Items */}
            <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-200 bg-white">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                <FiShoppingCart className="h-4 w-4 text-gray-600" />
                <h3 className="text-sm font-semibold text-gray-900">Items</h3>
              </div>
              <div className="p-5">
                <div className="rounded-xl p-4 mb-5 border bg-gray-50 border-gray-200">
                  <div className="grid grid-cols-1 gap-3 mb-3">
                    <div className="relative">
                      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Product / Service</label>
                      <input
                        type="text"
                        value={itemForm.name}
                        onChange={(e) => handleProductNameChange(e.target.value)}
                        onKeyDown={handleProductKeyDown}
                        onFocus={() => setShowProductDropdown(true)}
                        onBlur={() => setTimeout(() => setShowProductDropdown(false), 150)}
                        placeholder="Search or enter product name"
                        className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
                      />
                      {showProductDropdown && (
                        <div className="absolute top-full left-0 right-0 z-20 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-48 overflow-auto">
                          {(itemForm.name && productSearchResults.length > 0
                            ? productSearchResults.map((p) => ({ _id: p.value, name: p.label.split("(")[0].trim(), price: parseFloat((p.label.match(/₹([0-9,]+(?:\.[0-9]+)?)/)?.[1] || "0").replace(/,/g, "")) }))
                            : !itemForm.name && products.length > 0
                              ? products.slice(0, 8)
                              : []
                          ).map((p, idx) => (
                            <button
                              key={p._id}
                              type="button"
                              onClick={() => handleProductSelect(p._id)}
                              className={`w-full text-left px-4 py-2.5 flex justify-between border-b border-gray-50 last:border-0 hover:bg-gray-50 ${hoveredProductIndex === idx ? "bg-gray-100" : ""}`}
                              onMouseEnter={() => setHoveredProductIndex(idx)}
                            >
                              <span className="text-sm font-medium text-gray-900">{p.name}</span>
                              <span className="text-xs font-bold text-gray-600">{formatINR(p.price)}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {itemForm.productId && itemForm.availableStock !== null && (
                        <p className={`mt-1 text-xs ${Number(itemForm.availableStock) > 0 ? "text-green-600" : "text-red-600"}`}>Stock: {itemForm.availableStock}</p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 items-end">
                    <NumberInput label="Qty" name="quantity" min={1} step={1} value={itemForm.quantity} onChange={(e) => handleItemFormChange("quantity", e.target.value)} />
                    <NumberInput label="Price (₹)" name="unitPrice" min={0} step={0.01} prefix="₹" value={itemForm.unitPrice} onChange={(e) => handleItemFormChange("unitPrice", e.target.value)} />
                    <button
                      type="button"
                      onClick={addOrUpdateItem}
                      disabled={!itemForm.name || itemForm.quantity <= 0}
                      className="flex items-center justify-center gap-1.5 py-2.5 px-3 text-sm font-bold rounded-xl text-white bg-gray-900 hover:bg-black disabled:opacity-40"
                    >
                      {editingIndex >= 0 ? <><FiCheck className="h-3.5 w-3.5" /> Save</> : <><FiPlus className="h-3.5 w-3.5" /> Add</>}
                    </button>
                  </div>
                  {editingIndex >= 0 && (
                    <button type="button" onClick={cancelEdit} className="mt-2 text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
                      <FiX className="h-3 w-3" /> Cancel edit
                    </button>
                  )}
                </div>

                {items.length === 0 ? (
                  <div className="text-center py-8 text-sm text-gray-500 border border-dashed rounded-xl">No items yet. Add products above.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">S.No</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Particulars</th>
                          <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Qty</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Rate</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Amount</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {items.map((it, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-sm text-gray-900">{idx + 1}</td>
                            <td className="px-3 py-2 text-sm font-medium text-gray-900">{it.name}</td>
                            <td className="px-3 py-2 text-sm text-center">{it.quantity}</td>
                            <td className="px-3 py-2 text-sm text-right">{formatINR(it.unitPrice)}</td>
                            <td className="px-3 py-2 text-sm text-right font-semibold">{formatINR(it.quantity * it.unitPrice)}</td>
                            <td className="px-3 py-2 text-right">
                              <div className="flex justify-end gap-1">
                                <button type="button" onClick={() => editItem(idx)} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg">
                                  <FiEdit3 className="h-3.5 w-3.5" />
                                </button>
                                <button type="button" onClick={() => removeItem(idx)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg">
                                  <FiTrash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right — Summary */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Date</span>
                  <span className="font-medium text-gray-900">{new Date().toLocaleDateString("en-IN")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Customer</span>
                  <span className="font-medium text-gray-900 truncate max-w-[150px]">{customerDetails.name || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Items</span>
                  <span className="font-medium text-gray-900">{items.length}</span>
                </div>
                <div className="border-t border-gray-200 pt-3 flex justify-between text-base font-bold">
                  <span>Total</span>
                  <span>{formatINR(calculateTotal())}</span>
                </div>
                <p className="text-xs text-gray-500">No GST • A5 clean print</p>
              </div>
              <button
                type="submit"
                disabled={loading || items.length === 0}
                className="mt-4 w-full flex items-center justify-center gap-2 py-3 px-4 text-sm font-bold rounded-xl text-white bg-gray-900 hover:bg-black disabled:opacity-40"
              >
                <FiSave className="h-4 w-4" />
                {loading ? "Saving..." : "Create Estimate"}
              </button>
              <p className="mt-2 text-xs text-center text-gray-400">Clean A5 • No shop header • No colours</p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
