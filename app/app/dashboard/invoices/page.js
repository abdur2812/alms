"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { invoicesAPI, hsnsAPI } from "@/lib/api";
import { formatINR } from "@/lib/formatters";
import { PageHeader, Card, CardBody, Button, Modal } from "@/components/UI";
import {
  FiPlus,
  FiEdit,
  FiTrash2,
  FiEye,
  FiFilter,
  FiSearch,
  FiFileText,
  FiDownload,
  FiCopy,
  FiHash,
  FiX,
  FiCheck,
} from "react-icons/fi";

export default function InvoicesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [billTypeFilter, setBillTypeFilter] = useState("");
  const [invoiceModeFilter, setInvoiceModeFilter] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [error, setError] = useState("");
  const [converting, setConverting] = useState(null);
  const [showDuplicateConfirm, setShowDuplicateConfirm] = useState(null);
  const [search, setSearch] = useState("");

  // HSN management
  const [showHsnModal, setShowHsnModal] = useState(false);
  const [hsns, setHsns] = useState([]);
  const [hsnLoading, setHsnLoading] = useState(false);
  const [hsnSaving, setHsnSaving] = useState(false);
  const [newHsnCode, setNewHsnCode] = useState("");
  const [hsnError, setHsnError] = useState("");
  const [deletingHsn, setDeletingHsn] = useState(null);

  useEffect(() => {
    // Read URL parameters
    const customer = searchParams.get("customer");
    const billType = searchParams.get("billType");
    const invoiceMode = searchParams.get("isGstBill");

    if (customer) setCustomerFilter(customer);
    if (billType) setBillTypeFilter(billType);
    if (invoiceMode === "true" || invoiceMode === "false") {
      setInvoiceModeFilter(invoiceMode);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchInvoices();
  }, [page, billTypeFilter, invoiceModeFilter, customerFilter, search]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const params = { page, limit: 10 };
      if (billTypeFilter) params.billType = billTypeFilter;
      if (invoiceModeFilter) params.isGstBill = invoiceModeFilter;
      if (customerFilter) params.customerId = customerFilter;
      if (search.trim()) params.search = search.trim();

      const response = await invoicesAPI.getAll(params);
      setInvoices(Array.isArray(response?.data?.data) ? response.data.data : []);
      setTotalPages(response?.data?.totalPages || 1);
      setError("");
    } catch (err) {
      setError("Failed to fetch invoices");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this invoice?")) return;

    try {
      await invoicesAPI.delete(id);
      fetchInvoices();
    } catch (err) {
      alert("Failed to delete invoice");
      console.error(err);
    }
  };

  const fetchHsns = async () => {
    try {
      setHsnLoading(true);
      setHsnError("");
      const response = await hsnsAPI.getAll();
      setHsns(Array.isArray(response?.data?.data) ? response.data.data : []);
    } catch (err) {
      setHsnError(err.response?.data?.message || "Failed to load HSN codes");
    } finally {
      setHsnLoading(false);
    }
  };

  const openHsnModal = () => {
    setShowHsnModal(true);
    setNewHsnCode("");
    setHsnError("");
    fetchHsns();
  };

  const addHsn = async (e) => {
    e.preventDefault();
    if (!newHsnCode.trim()) return;
    setHsnSaving(true);
    setHsnError("");
    try {
      await hsnsAPI.create({ code: newHsnCode.trim() });
      setNewHsnCode("");
      await fetchHsns();
    } catch (err) {
      setHsnError(err.response?.data?.message || "Failed to add HSN code");
    } finally {
      setHsnSaving(false);
    }
  };

  const deleteHsn = async (id) => {
    if (!confirm("Delete this HSN code?")) return;
    setDeletingHsn(id);
    setHsnError("");
    try {
      await hsnsAPI.delete(id);
      await fetchHsns();
    } catch (err) {
      setHsnError(err.response?.data?.message || "Failed to delete HSN code");
    } finally {
      setDeletingHsn(null);
    }
  };

  const handleConvertToTaxInvoice = async (id) => {
    if (
      !confirm("Convert this Estimate to a Tax Invoice? This cannot be undone.")
    )
      return;
    setConverting(id);
    try {
      await invoicesAPI.update(id, { isGstBill: true });
      fetchInvoices();
    } catch (err) {
      alert(
        err.response?.data?.message || "Failed to convert. Please try again.",
      );
    } finally {
      setConverting(null);
    }
  };

  const handleDuplicate = () => {
    if (!showDuplicateConfirm) return;
    const invoice = showDuplicateConfirm;
    setShowDuplicateConfirm(null);

    sessionStorage.setItem(
      "duplicateInvoice",
      JSON.stringify({
        customerData: invoice.customerData,
        customerId: invoice.customerId?._id || null,
        items: invoice.items,
        isGstBill: invoice.isGstBill,
        isIgst: invoice.isIgst,
        billType: invoice.billType,
        vehicleNumber: invoice.vehicleNumber,
        copyType: invoice.copyType,
      }),
    );

    router.push("/dashboard/invoices/new");
  };

  const downloadBulkInvoiceCSV = async () => {
    try {
      const response = await invoicesAPI.bulkExport();
      const result = response.data;

      if (!result.success) {
        alert("Failed to fetch invoice data");
        return;
      }

      const invoiceData = result.data;

      // Create CSV content
      const headers = [
        "Invoice ID",
        "Customer Name",
        "Customer GST",
        "Customer Phone",
        "Subtotal",
        "CGST",
        "SGST",
        "Total Amount",
        "Type",
      ];

      const csvContent = [
        headers.join(","),
        ...invoiceData.map((inv) =>
          [
            inv.invoiceId,
            `"${inv.customerName || "N/A"}"`,
            inv.customerGST || "-",
            inv.customerPhone || "-",
            inv.subtotal,
            inv.cgst,
            inv.sgst,
            inv.total,
            inv.type,
          ].join(","),
        ),
      ].join("\n");

      // Download CSV
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `invoices_${new Date().toISOString().split("T")[0]}.csv`,
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert("Failed to download CSV");
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <PageHeader
        title="Invoices"
        subtitle="Manage and track your customer bills"
        action={
          <div className="flex gap-3">
            <Button onClick={downloadBulkInvoiceCSV} variant="secondary">
              <FiDownload className="mr-2" />
              Download CSV
            </Button>
            <Button onClick={openHsnModal} variant="secondary">
              <FiHash className="mr-2" />
              HSN Codes
            </Button>
            <Button
              onClick={() => router.push("/dashboard/invoices/new")}
              variant="primary"
            >
              <FiPlus className="mr-2" />
              Create Invoice
            </Button>
          </div>
        }
      />

      {/* Filter */}
      <Card className="mb-8 animate-fadeIn">
        <CardBody className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <FiFilter className="h-5 w-5 text-indigo-600" />
            </div>
            <span className="text-sm font-semibold text-gray-700">
              Filter by Type
            </span>
            {customerFilter && (
              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-medium">
                Filtered by Customer
              </span>
            )}
          </div>

          <div className="flex gap-2">
            {customerFilter && (
              <Button
                onClick={() => {
                  setCustomerFilter("");
                  setBillTypeFilter("");
                  setInvoiceModeFilter("");
                  router.replace("/dashboard/invoices", { scroll: false });
                  setPage(1);
                }}
                variant="secondary"
                size="sm"
              >
                Clear Filters
              </Button>
            )}
            <div className="flex bg-gray-100 p-1 rounded-xl">
              <button
                onClick={() => {
                  setBillTypeFilter("");
                  setPage(1);
                }}
                className={`px-6 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 ${
                  billTypeFilter === ""
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                All Bills
              </button>
              <button
                onClick={() => {
                  setBillTypeFilter("pay");
                  setPage(1);
                }}
                className={`px-6 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 ${
                  billTypeFilter === "pay"
                    ? "bg-white text-green-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Paid Bill
              </button>
              <button
                onClick={() => {
                  setBillTypeFilter("credit");
                  setPage(1);
                }}
                className={`px-6 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 ${
                  billTypeFilter === "credit"
                    ? "bg-white text-red-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Credit Bill
              </button>
            </div>
            <div className="flex bg-gray-100 p-1 rounded-xl">
              <button
                onClick={() => {
                  setInvoiceModeFilter("");
                  setPage(1);
                }}
                className={`px-5 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 ${
                  invoiceModeFilter === ""
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                All Docs
              </button>
              <button
                onClick={() => {
                  setInvoiceModeFilter("true");
                  setPage(1);
                }}
                className={`px-5 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 ${
                  invoiceModeFilter === "true"
                    ? "bg-white text-green-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Tax Invoice
              </button>
              <button
                onClick={() => {
                  setInvoiceModeFilter("false");
                  setPage(1);
                }}
                className={`px-5 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 ${
                  invoiceModeFilter === "false"
                    ? "bg-white text-amber-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Estimate
              </button>
            </div>
          </div>
        </CardBody>
      </Card>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl animate-shake">
          {error}
        </div>
      )}

      {/* Search */}
      <Card className="mb-8 animate-fadeIn">
        <CardBody>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-sm"
              placeholder="Search by invoice number or customer name..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </CardBody>
      </Card>

      {/* Invoices table */}
      <Card className="animate-fadeIn">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 font-medium">
                Loading invoices...
              </p>
            </div>
          ) : invoices.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <div className="mb-4">
                <FiFileText className="mx-auto h-12 w-12 text-gray-300" />
              </div>
              <p className="text-lg font-medium text-gray-900">
                No invoices found
              </p>
              <p className="mt-1">
                Try adjusting your filter or create a new invoice.
              </p>
            </div>
          ) : (
            <>
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Invoice No.
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-50">
                  {invoices.map((invoice) => (
                    <tr
                      key={invoice._id}
                      className="hover:bg-indigo-50/30 transition-colors duration-150"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg inline-block">
                          {invoice.invoiceNumber}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900">
                          {invoice.customerData?.name ||
                            invoice.customerId?.name ||
                            "Deleted Customer"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600 font-medium">
                          {new Date(invoice.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900">
                          {formatINR(invoice.totalAmount || 0)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full border ${
                              invoice.billType === "credit"
                                ? "bg-red-50 text-red-700 border-red-100"
                                : "bg-green-50 text-green-700 border-green-100"
                            }`}
                          >
                            {invoice.billType === "credit"
                              ? "Credit Bill"
                              : "Paid Bill"}
                          </span>
                          {!invoice.isGstBill && (
                            <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border bg-amber-50 text-amber-700 border-amber-200">
                              Estimate
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <div className="flex justify-end space-x-2">
                          {!invoice.isGstBill && (
                            <button
                              onClick={() =>
                                handleConvertToTaxInvoice(invoice._id)
                              }
                              disabled={converting === invoice._id}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors duration-200 disabled:opacity-50"
                              title="Convert to Tax Invoice"
                            >
                              <FiFileText className="h-4 w-4" />
                            </button>
                          )}
                          <Link
                            href={`/dashboard/invoices/${invoice._id}/view`}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors duration-200"
                            title="View Invoice"
                          >
                            <FiEye className="h-4 w-4" />
                          </Link>
                          <Link
                            href={`/dashboard/invoices/${invoice._id}/edit`}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                            title="Edit Invoice"
                          >
                            <FiEdit className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => setShowDuplicateConfirm(invoice)}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors duration-200"
                            title="Duplicate Items to New Invoice"
                          >
                            <FiCopy className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(invoice._id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                            title="Delete Invoice"
                          >
                            <FiTrash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Page <span className="font-medium">{page}</span> of{" "}
                        <span className="font-medium">{totalPages}</span>
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                        <button
                          onClick={() => setPage(Math.max(1, page - 1))}
                          disabled={page === 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() =>
                            setPage(Math.min(totalPages, page + 1))
                          }
                          disabled={page === totalPages}
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
        </div>
      </Card>
      {/* Duplicate Confirmation Modal */}
      <Modal
        isOpen={!!showDuplicateConfirm}
        onClose={() => setShowDuplicateConfirm(null)}
        title="Duplicate Invoice Items"
      >
        {showDuplicateConfirm && (
          <div>
            <div className="space-y-3 mb-6">
              <p className="text-sm text-gray-600">
                Pre-fill a new invoice with items from:
              </p>
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 border border-gray-100">
                <div className="flex justify-between">
                  <span className="text-xs font-medium text-gray-500">
                    Invoice
                  </span>
                  <span className="text-sm font-bold text-indigo-600">
                    {showDuplicateConfirm.invoiceNumber}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs font-medium text-gray-500">
                    Customer
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {showDuplicateConfirm.customerData?.name ||
                      showDuplicateConfirm.customerId?.name ||
                      "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs font-medium text-gray-500">
                    Items
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {showDuplicateConfirm.items?.length || 0} product(s)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs font-medium text-gray-500">
                    Total
                  </span>
                  <span className="text-sm font-bold text-gray-900">
                    ₹
                    {(showDuplicateConfirm.totalAmount || 0).toLocaleString(
                      "en-IN",
                    )}
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-500">
                You&apos;ll be taken to the create invoice screen with all
                details pre-filled. Review and create with one click.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDuplicateConfirm(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border-2 border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDuplicate}
                className="flex-1 px-4 py-2.5 rounded-xl text-white font-medium bg-linear-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2"
              >
                Continue to Create
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* HSN Codes Management Modal */}
      <Modal
        isOpen={showHsnModal}
        onClose={() => setShowHsnModal(false)}
        title="Manage HSN Codes"
      >
        <div>
          <p className="text-sm text-gray-600 mb-4">
            Add or remove HSN codes. These appear in the HSN dropdown when
            creating invoices.
          </p>

          <form onSubmit={addHsn} className="mb-5">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              New HSN Code
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newHsnCode}
                onChange={(e) => setNewHsnCode(e.target.value)}
                placeholder="e.g., 87084000"
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-white"
              />
              <Button type="submit" disabled={hsnSaving || !newHsnCode.trim()}>
                <FiCheck className="mr-1" />
                {hsnSaving ? "Adding..." : "Add"}
              </Button>
            </div>
          </form>

          {hsnError && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
              {hsnError}
            </div>
          )}

          <div className="border border-gray-100 rounded-xl overflow-hidden">
            {hsnLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="mt-3 text-sm text-gray-600 font-medium">
                  Loading HSN codes...
                </p>
              </div>
            ) : hsns.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">
                No HSN codes yet. Add one above.
              </div>
            ) : (
              <ul className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
                {hsns.map((hsn) => (
                  <li
                    key={hsn._id}
                    className="flex items-center justify-between px-4 py-2.5"
                  >
                    <span className="text-sm font-semibold text-gray-900 font-mono">
                      {hsn.code}
                    </span>
                    <button
                      onClick={() => deleteHsn(hsn._id)}
                      disabled={deletingHsn === hsn._id}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200 disabled:opacity-50"
                      title="Delete HSN code"
                    >
                      <FiX className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-5">
            <Button
              variant="secondary"
              onClick={() => setShowHsnModal(false)}
              className="w-full"
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
