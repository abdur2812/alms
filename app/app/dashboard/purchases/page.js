"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { FiPlus, FiEdit, FiTrash2, FiEye, FiSearch, FiShoppingBag, FiTruck, FiEdit2, FiX, FiCheck, FiFileText } from "react-icons/fi";
import { PageHeader, Card, Button, Badge, LoadingSpinner, EmptyState } from "@/components/UI";
import { purchasesAPI, vendorsAPI } from "@/lib/api";

const formatINR = (amount) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 }).format(amount);

const chequeStatusBadge = (s) => {
  const isCompleted = s === "Cleared";
  return <Badge variant={isCompleted ? "success" : "default"}>{s}</Badge>;
};

function VendorForm({ onSave, onCancel, initial }) {
  const [form, setForm] = useState(() => ({
    name: initial?.name || "",
    phone: initial?.phone || "",
    address: initial?.address || "",
    gstNumber: initial?.gstNumber || "",
    bankDetails: {
      accountHolder: initial?.bankDetails?.accountHolder || "",
      bankName: initial?.bankDetails?.bankName || "",
      branchName: initial?.bankDetails?.branchName || "",
      accountNumber: initial?.bankDetails?.accountNumber || "",
      ifscCode: initial?.bankDetails?.ifscCode || "",
    },
  }));

  const setField = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const setBankField = (field) => (e) =>
    setForm((f) => ({ ...f, bankDetails: { ...f.bankDetails, [field]: e.target.value } }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    // Build payload: trim, uppercase GST/IFSC
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      gstNumber: form.gstNumber.trim().toUpperCase(),
      bankDetails: {
        accountHolder: form.bankDetails.accountHolder.trim(),
        bankName: form.bankDetails.bankName.trim(),
        branchName: form.bankDetails.branchName.trim(),
        accountNumber: form.bankDetails.accountNumber.trim(),
        ifscCode: form.bankDetails.ifscCode.trim().toUpperCase(),
      },
    };
    // Remove empty bankDetails if all blank to avoid storing empty object (backend handles it)
    const hasBankData = Object.values(payload.bankDetails).some((v) => v);
    if (!hasBankData) payload.bankDetails = undefined;
    if (!payload.gstNumber) payload.gstNumber = "";
    onSave(payload);
  };

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-5 mb-4 shadow-sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-amber-800">{initial ? "Edit Vendor" : "Add New Vendor"}</h4>
          <span className="text-xs text-amber-600">* required</span>
        </div>

        {/* Basic details */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-amber-700 mb-1">Vendor Name *</label>
            <input type="text" value={form.name} onChange={setField("name")} required placeholder="Enter name" className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-amber-700 mb-1">Phone</label>
            <input type="text" value={form.phone} onChange={setField("phone")} placeholder="+91 9876543210" className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-amber-700 mb-1">GST Number (GSTIN)</label>
            <input type="text" value={form.gstNumber} onChange={(e) => setForm((f) => ({ ...f, gstNumber: e.target.value.toUpperCase() }))} placeholder="22ABCDE1234F1Z5" className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white uppercase placeholder:normal-case" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-amber-700 mb-1">Address</label>
          <input type="text" value={form.address} onChange={setField("address")} placeholder="Full address" className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white" />
        </div>

        {/* Bank details */}
        <div className="rounded-xl bg-white border border-amber-100 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-amber-100 flex items-center justify-center">
              <FiTruck className="h-3.5 w-3.5 text-amber-600" />
            </div>
            <h5 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Bank Details</h5>
            <span className="text-xs text-gray-400">(optional, for payments)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">A/C Holder</label>
              <input type="text" value={form.bankDetails.accountHolder} onChange={setBankField("accountHolder")} placeholder="Account holder name" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Bank Name</label>
              <input type="text" value={form.bankDetails.bankName} onChange={setBankField("bankName")} placeholder="HDFC BANK" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Branch</label>
              <input type="text" value={form.bankDetails.branchName} onChange={setBankField("branchName")} placeholder="URAPAKKAM" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Account Number</label>
              <input type="text" value={form.bankDetails.accountNumber} onChange={setBankField("accountNumber")} placeholder="5020010XXXXXXX" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white font-mono" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">IFSC Code</label>
              <input type="text" value={form.bankDetails.ifscCode} onChange={(e) => setForm((f) => ({ ...f, bankDetails: { ...f.bankDetails, ifscCode: e.target.value.toUpperCase() } }))} placeholder="HDFC0001234" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white uppercase font-mono" />
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onCancel} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-1.5"><FiX className="h-3.5 w-3.5" />Cancel</button>
          <button type="submit" className="px-6 py-2 bg-amber-600 text-white text-sm font-bold rounded-lg hover:bg-amber-700 transition-colors flex items-center gap-1.5">
            <FiCheck className="h-3.5 w-3.5" />{initial ? "Update Vendor" : "Add Vendor"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function PurchasesPage() {
  const [tab, setTab] = useState("invoices");
  const [purchases, setPurchases] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vendorsLoading, setVendorsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [vendorSearch, setVendorSearch] = useState("");
  const [deletingPurchaseId, setDeletingPurchaseId] = useState(null);
  const PURCHASES_PER_PAGE = 5;
  const [purchasePage, setPurchasePage] = useState(1);

  const loadPurchases = async () => {
    try {
      setLoading(true);
      const res = await purchasesAPI.getAll({ limit: 500 });
      setPurchases(res.data.data || []);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to load purchases");
    } finally {
      setLoading(false);
    }
  };

  const loadVendors = async () => {
    try {
      setVendorsLoading(true);
      const res = await vendorsAPI.getAll({ limit: 500 });
      setVendors(res.data.data || []);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to load vendors");
    } finally {
      setVendorsLoading(false);
    }
  };

  useEffect(() => {
    loadPurchases();
    loadVendors();
  }, []);

  // Reset purchase pagination when search changes
  useEffect(() => {
    setPurchasePage(1);
  }, [searchTerm]);

  const handleAddVendor = async (data) => {
    try {
      const res = await vendorsAPI.create(data);
      setVendors((prev) => [res.data.data, ...prev]);
      setShowVendorForm(false);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to add vendor");
    }
  };

  const handleUpdateVendor = async (data) => {
    try {
      const res = await vendorsAPI.update(editingVendor._id, data);
      setVendors((prev) => prev.map((v) => (v._id === editingVendor._id ? res.data.data : v)));
      setEditingVendor(null);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to update vendor");
    }
  };

  const handleDeleteVendor = async (id) => {
    if (!confirm("Delete this vendor?")) return;
    try {
      await vendorsAPI.delete(id);
      setVendors((prev) => prev.filter((v) => v._id !== id));
    } catch (e) {
      setError(e.response?.data?.message || "Failed to delete vendor");
    }
  };

  const handleDeletePurchase = async (id) => {
    if (!confirm("Delete this purchase? This cannot be undone.")) return;
    try {
      setDeletingPurchaseId(id);
      await purchasesAPI.delete(id);
      setPurchases((prev) => prev.filter((p) => p._id !== id));
    } catch (e) {
      setError(e.response?.data?.message || "Failed to delete purchase");
    } finally {
      setDeletingPurchaseId(null);
    }
  };

  const filteredPurchases = useMemo(() => {
    const filtered = purchases.filter(
      (p) =>
        (p.purchaseNumber || "")?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()),
    );
    // Sort descending like purchaseNo (PUR-0005 before PUR-0004)
    filtered.sort((a, b) => {
      const numA = parseInt((a.purchaseNumber || "").replace(/\D/g, ""), 10) || 0;
      const numB = parseInt((b.purchaseNumber || "").replace(/\D/g, ""), 10) || 0;
      if (numB !== numA) return numB - numA;
      return new Date(b.date) - new Date(a.date);
    });
    return filtered;
  }, [purchases, searchTerm]);

  const purchaseTotalPages = Math.ceil(filteredPurchases.length / PURCHASES_PER_PAGE) || 1;
  const paginatedPurchases = useMemo(() => {
    const start = (purchasePage - 1) * PURCHASES_PER_PAGE;
    return filteredPurchases.slice(start, start + PURCHASES_PER_PAGE);
  }, [filteredPurchases, purchasePage]);

  // Clamp page when filtered results shrink (e.g., after delete/search)
  useEffect(() => {
    if (purchasePage > purchaseTotalPages) {
      setPurchasePage(purchaseTotalPages);
    }
  }, [purchasePage, purchaseTotalPages]);

  const filteredVendors = useMemo(
    () =>
      vendors.filter((v) => {
        const q = vendorSearch.toLowerCase();
        return (
          v.name?.toLowerCase().includes(q) ||
          (v.phone || "").toLowerCase().includes(q) ||
          (v.gstNumber || "").toLowerCase().includes(q) ||
          (v.address || "").toLowerCase().includes(q) ||
          (v.bankDetails?.bankName || "").toLowerCase().includes(q) ||
          (v.bankDetails?.accountNumber || "").toLowerCase().includes(q) ||
          (v.bankDetails?.ifscCode || "").toLowerCase().includes(q) ||
          (v.bankDetails?.accountHolder || "").toLowerCase().includes(q)
        );
      }),
    [vendors, vendorSearch],
  );

  const vendorName = (p) =>
    p.vendorId?.name || "—";

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <PageHeader
        title="Purchases"
        subtitle="Purchase invoices and vendor management"
        action={
          <div className="flex gap-2">
            {tab === "invoices" ? (
              <Link href="/dashboard/purchases/new">
                <Button variant="primary"><FiPlus className="mr-2" />Add Purchase</Button>
              </Link>
            ) : (
              <Button onClick={() => { setShowVendorForm(true); setEditingVendor(null); }} variant="primary">
                <FiPlus className="mr-2" />Add Vendor
              </Button>
            )}
          </div>
        }
      />

      {error && (
        <div className="mb-6 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
          <span>{error}</span>
          <button onClick={() => setError("")} className="ml-auto text-red-400 hover:text-red-600 font-bold">✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-white rounded-xl border border-gray-100 shadow-sm p-1 mb-6 w-fit">
        <button
          onClick={() => setTab("invoices")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
            tab === "invoices" ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md" : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <FiShoppingBag className="h-4 w-4" /> Purchase Invoices
        </button>
        <button
          onClick={() => setTab("vendors")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
            tab === "vendors" ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md" : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <FiTruck className="h-4 w-4" /> Vendors ({vendors.length})
        </button>
      </div>

      {tab === "invoices" ? (
        <>
          <Card className="mb-8 animate-fadeIn">
            <div className="px-6 py-4">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="block w-full pl-10 pr-3 py-3 border-2 border-gray-100 rounded-xl bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Search by purchase or vendor invoice number..." />
              </div>
            </div>
          </Card>

          <Card className="animate-fadeIn">
            {loading ? (
              <LoadingSpinner />
            ) : filteredPurchases.length === 0 ? (
              <EmptyState
                icon={FiShoppingBag}
                title="No purchases found"
                description={purchases.length === 0 ? "Record your first purchase to get started." : "Try a different search."}
                action={
                  <Link href="/dashboard/purchases/new">
                    <Button variant="primary"><FiPlus className="mr-2" />Add Purchase</Button>
                  </Link>
                }
              />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">S.No</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Purchase No.</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Vendor Invoice No.</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Vendor</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Cheque Details</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Cheque Amount</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Cheque Status</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Passed Date</th>
                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-50">
                      {paginatedPurchases.map((purchase, index) => {
                        const globalIndex = (purchasePage - 1) * PURCHASES_PER_PAGE + index;
                        const sNo = filteredPurchases.length - globalIndex;
                        return (
                          <tr key={purchase._id} className="hover:bg-indigo-50/30 transition-colors duration-150">
                            <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-500 font-medium">{sNo}</div></td>
                            <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-600 font-medium">{new Date(purchase.date).toLocaleDateString()}</div></td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg inline-block">{purchase.purchaseNumber || "—"}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-700">{purchase.invoiceNumber}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-600 font-medium">{vendorName(purchase)}</div></td>
                        <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-bold text-gray-900">{formatINR(purchase.amount)}</div></td>
                        <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-600 font-medium max-w-[140px] truncate">{purchase.chequeDetails || "—"}</div></td>
                        <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-bold text-gray-900">{formatINR(purchase.chequeAmount)}</div></td>
                        <td className="px-6 py-4 whitespace-nowrap">{chequeStatusBadge(purchase.chequeStatus)}</td>
                        <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-600 font-medium">{purchase.passedDate ? new Date(purchase.passedDate).toLocaleDateString() : "—"}</div></td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <div className="flex justify-end space-x-2">
                            <Link href={`/dashboard/purchases/${purchase._id}/view`} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg" title="View"><FiEye className="h-4 w-4" /></Link>
                            <Link href={`/dashboard/purchases/${purchase._id}/edit`} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Edit"><FiEdit className="h-4 w-4" /></Link>
                            <button
                              onClick={() => handleDeletePurchase(purchase._id)}
                              disabled={deletingPurchaseId === purchase._id}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                              title="Delete"
                            >
                              <FiTrash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
                {purchaseTotalPages > 1 && (
                  <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                    <div className="flex-1 flex justify-between sm:hidden">
                      <button
                        onClick={() => setPurchasePage(Math.max(1, purchasePage - 1))}
                        disabled={purchasePage === 1}
                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setPurchasePage(Math.min(purchaseTotalPages, purchasePage + 1))}
                        disabled={purchasePage === purchaseTotalPages}
                        className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-gray-700">
                          Page <span className="font-medium">{purchasePage}</span> of <span className="font-medium">{purchaseTotalPages}</span> • {filteredPurchases.length} total
                        </p>
                      </div>
                      <div>
                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                          <button
                            onClick={() => setPurchasePage(Math.max(1, purchasePage - 1))}
                            disabled={purchasePage === 1}
                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                          >
                            Previous
                          </button>
                          <button
                            onClick={() => setPurchasePage(Math.min(purchaseTotalPages, purchasePage + 1))}
                            disabled={purchasePage === purchaseTotalPages}
                            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                          >
                            Next
                          </button>
                        </nav>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>
        </>
       ) : (
        <>
          {/* Vendor Search */}
          <Card className="mb-6 animate-fadeIn">
            <div className="px-6 py-4">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input type="text" value={vendorSearch} onChange={(e) => setVendorSearch(e.target.value)} className="block w-full pl-10 pr-3 py-3 border-2 border-gray-100 rounded-xl bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500" placeholder="Search vendors by name, GST, phone, bank, IFSC..." />
              </div>
            </div>
          </Card>

          {/* Add/Edit Vendor Form */}
          {showVendorForm && <VendorForm onSave={handleAddVendor} onCancel={() => setShowVendorForm(false)} />}
          {editingVendor && (
            <VendorForm
              key={editingVendor._id}
              initial={editingVendor}
              onSave={handleUpdateVendor}
              onCancel={() => setEditingVendor(null)}
            />
          )}

          <Card className="animate-fadeIn">
            {vendorsLoading ? (
              <LoadingSpinner />
            ) : filteredVendors.length === 0 ? (
              <EmptyState
                icon={FiTruck}
                title="No vendors found"
                description={vendors.length === 0 ? "Add your first vendor to get started." : "Try a different search."}
                action={
                  <Button onClick={() => { setShowVendorForm(true); setEditingVendor(null); }} variant="primary">
                    <FiPlus className="mr-2" />Add Vendor
                  </Button>
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Vendor</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Contact</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">GSTIN</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Address</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Bank Details</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-50">
                    {filteredVendors.map((vendor) => (
                      <tr key={vendor._id} className="hover:bg-amber-50/30 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-linear-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                              {vendor.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-gray-900">{vendor.name}</div>
                              {vendor.bankDetails?.accountHolder && (
                                <div className="text-xs text-gray-500">A/c: {vendor.bankDetails.accountHolder}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600 font-medium">{vendor.phone || "—"}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {vendor.gstNumber ? (
                            <span className="text-xs font-mono font-semibold text-gray-700 bg-gray-50 border border-gray-200 px-2 py-1 rounded-lg">{vendor.gstNumber}</span>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 max-w-[180px] truncate">{vendor.address || "—"}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {vendor.bankDetails?.bankName || vendor.bankDetails?.accountNumber ? (
                            <div className="space-y-0.5 min-w-[180px]">
                              {vendor.bankDetails.bankName && (
                                <div className="font-semibold text-gray-700">{vendor.bankDetails.bankName}{vendor.bankDetails.branchName ? ` • ${vendor.bankDetails.branchName}` : ""}</div>
                              )}
                              {vendor.bankDetails.accountNumber && (
                                <div className="font-mono text-xs">A/c: {vendor.bankDetails.accountNumber}</div>
                              )}
                              {vendor.bankDetails.ifscCode && (
                                <div className="font-mono text-xs text-gray-500">IFSC: {vendor.bankDetails.ifscCode}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="flex justify-end gap-2">
                            <Link href={`/dashboard/purchases/report?vendorId=${vendor._id}`} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Vendor Report">
                              <FiFileText className="h-4 w-4" />
                            </Link>
                            <button onClick={() => { setEditingVendor(vendor); setShowVendorForm(false); }} className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg" title="Edit">
                              <FiEdit2 className="h-4 w-4" />
                            </button>
                            <button onClick={() => handleDeleteVendor(vendor._id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Delete">
                              <FiTrash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}