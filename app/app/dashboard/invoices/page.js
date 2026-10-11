"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { invoicesAPI, hsnsAPI } from "@/lib/api";
import usePersistentState from "@/lib/usePersistentState";
import { formatINR } from "@/lib/formatters";
import { fetchInvoicesInRange, downloadInvoicesZip } from "@/lib/invoiceZip";
import {
  PageHeader,
  Button,
  Modal,
  ListPage,
  ListToolbar,
  ToolbarDivider,
  ListCount,
  SearchBox,
  Segmented,
  ListPanel,
  ListScroll,
  PaginationBar,
} from "@/components/UI";
import {
  FiPlus,
  FiEdit,
  FiTrash2,
  FiEye,
  FiFilter,
  FiSearch,
  FiFileText,
  FiDownload,
  FiArchive,
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
  const [page, setPage] = usePersistentState("invoices.page", 1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(null);
  const [billTypeFilter, setBillTypeFilter] = usePersistentState("invoices.billType", "");
  const [invoiceModeFilter, setInvoiceModeFilter] = usePersistentState("invoices.mode", "");
  const [customerFilter, setCustomerFilter] = usePersistentState("invoices.customer", "");
  const [error, setError] = useState("");
  const [converting, setConverting] = useState(null);
  const [showDuplicateConfirm, setShowDuplicateConfirm] = useState(null);
  const [search, setSearch] = usePersistentState("invoices.search", "");

  // Export-as-ZIP state
  const [showZipModal, setShowZipModal] = useState(false);
  const [zipStart, setZipStart] = useState("");
  const [zipEnd, setZipEnd] = useState("");
  const [zipType, setZipType] = useState("");
  const [zipCount, setZipCount] = useState(null);
  const [zipCounting, setZipCounting] = useState(false);
  const [zipBusy, setZipBusy] = useState(false);
  const [zipProgress, setZipProgress] = useState("");
  const [zipError, setZipError] = useState("");

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

    // Explicit URL filters override restored ones; start from page 1 then.
    if (customer || billType || invoiceMode === "true" || invoiceMode === "false") {
      if (customer && customer !== customerFilter) setPage(1);
      if (billType && billType !== billTypeFilter) setPage(1);
      if (invoiceMode && invoiceMode !== invoiceModeFilter) setPage(1);
    }
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
      setTotal(response?.data?.total ?? null);
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

  // Live count of invoices inside the chosen date range
  useEffect(() => {
    if (!showZipModal || !zipStart || !zipEnd || zipStart > zipEnd) {
      setZipCount(null);
      return;
    }
    let cancelled = false;
    setZipCounting(true);
    const params = { page: 1, limit: 1, startDate: zipStart, endDate: zipEnd };
    if (zipType) params.isGstBill = zipType;
    invoicesAPI
      .getAll(params)
      .then((res) => !cancelled && setZipCount(res.data.total ?? 0))
      .catch(() => !cancelled && setZipCount(null))
      .finally(() => !cancelled && setZipCounting(false));
    return () => {
      cancelled = true;
    };
  }, [showZipModal, zipStart, zipEnd, zipType]);

  const handleZipExport = async () => {
    setZipError("");
    setZipBusy(true);
    try {
      setZipProgress("Fetching invoices...");
      const list = await fetchInvoicesInRange({ startDate: zipStart, endDate: zipEnd, isGstBill: zipType });
      if (!list.length) {
        setZipError("No invoices found in this range.");
        return;
      }
      const { count, failed } = await downloadInvoicesZip(list, { startDate: zipStart, endDate: zipEnd }, (p) => {
        if (p.phase === "pdf") setZipProgress(`Creating image ${p.done + 1} of ${p.total}...`);
        else if (p.phase === "zip") setZipProgress("Creating ZIP...");
      });
      if (failed.length) {
        setZipError(`ZIP downloaded with ${count} invoice images. Failed: ${failed.join(", ")}`);
      } else {
        setShowZipModal(false);
      }
    } catch (err) {
      console.error(err);
      setZipError("Export failed. Please try again.");
    } finally {
      setZipBusy(false);
      setZipProgress("");
    }
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
    <ListPage>
      <PageHeader
        compact
        title="Invoices"
        subtitle="Manage and track your customer bills"
        action={
          <div className="flex gap-3">
            <Button onClick={downloadBulkInvoiceCSV} variant="secondary">
              <FiDownload className="mr-2" />
              Download CSV
            </Button>
            <Button onClick={() => setShowZipModal(true)} variant="secondary">
              <FiArchive className="mr-2" />
              Export JPGs (ZIP)
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

      {error && (
        <div className="shrink-0 mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl animate-shake">
          {error}
        </div>
      )}

      {/* Invoices table */}
      <ListPanel>
        <ListToolbar>
        <SearchBox
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search invoice no. or customer..."
        />
        <ToolbarDivider />
        <Segmented
          value={billTypeFilter}
          onChange={(v) => {
            setBillTypeFilter(v);
            setPage(1);
          }}
          options={[
            { value: "", label: "All Bills" },
            { value: "pay", label: "Paid Bill", tone: "text-green-600" },
            { value: "credit", label: "Credit Bill", tone: "text-red-600" },
          ]}
        />
        <Segmented
          value={invoiceModeFilter}
          onChange={(v) => {
            setInvoiceModeFilter(v);
            setPage(1);
          }}
          options={[
            { value: "", label: "All Docs" },
            { value: "true", label: "Tax Invoice", tone: "text-green-600" },
            { value: "false", label: "Estimate", tone: "text-amber-600" },
          ]}
        />
        {customerFilter && (
          <div className="flex items-center gap-2">
            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-medium">
              Filtered by Customer
            </span>
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
          </div>
        )}
        <ListCount count={total} label="invoice" />
      </ListToolbar>
        <div className="flex flex-col flex-1 min-h-0">
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
              <ListScroll>
                <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50 sticky top-0 z-10">
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
                            "-"}
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
                          {!invoice.isGstBill ? (
                            <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border bg-amber-50 text-amber-700 border-amber-200">
                              Estimate
                            </span>
                          ) : (
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
              </ListScroll>

              {/* Pagination */}
              <PaginationBar page={page} totalPages={totalPages} onChange={setPage} />
            </>
          )}
        </div>
      </ListPanel>
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

      <Modal
        isOpen={showZipModal}
        onClose={() => !zipBusy && setShowZipModal(false)}
        title="Export Invoices as ZIP"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Choose a date range. Every invoice in that range is rendered as a JPG image in your browser and saved as one ZIP on this computer.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-medium text-gray-700">
              Start date
              <input
                type="date"
                value={zipStart}
                max={zipEnd || undefined}
                onChange={(e) => setZipStart(e.target.value)}
                disabled={zipBusy}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </label>
            <label className="text-sm font-medium text-gray-700">
              End date
              <input
                type="date"
                value={zipEnd}
                min={zipStart || undefined}
                onChange={(e) => setZipEnd(e.target.value)}
                disabled={zipBusy}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </label>
          </div>
          <label className="block text-sm font-medium text-gray-700">
            Type
            <select
              value={zipType}
              onChange={(e) => setZipType(e.target.value)}
              disabled={zipBusy}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">All (GST invoices + estimates)</option>
              <option value="true">GST invoices only</option>
              <option value="false">Estimates only</option>
            </select>
          </label>
          <div className="rounded-lg bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
            {!zipStart || !zipEnd
              ? "Select both dates to see how many invoices match."
              : zipStart > zipEnd
                ? "Start date must be before end date."
                : zipCounting
                  ? "Counting..."
                  : zipCount === null
                    ? "Could not count invoices."
                    : `${zipCount} invoice${zipCount === 1 ? "" : "s"} in this range`}
          </div>
          {zipProgress && <p className="text-sm text-gray-600">{zipProgress}</p>}
          {zipError && <p className="text-sm text-red-600">{zipError}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowZipModal(false)} disabled={zipBusy}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleZipExport}
              disabled={zipBusy || !zipCount || zipStart > zipEnd}
            >
              <FiDownload className="mr-2" />
              {zipBusy ? "Working..." : "Generate ZIP"}
            </Button>
          </div>
        </div>
      </Modal>
    </ListPage>
  );
}
