"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { invoicesAPI } from "@/lib/api";
import { formatINR } from "@/lib/formatters";
import { PageHeader, Card, CardBody, Button } from "@/components/UI";
import {
  FiPlus,
  FiEdit,
  FiTrash2,
  FiEye,
  FiFilter,
  FiSearch,
  FiFileText,
  FiDownload,
} from "react-icons/fi";

export default function InvoicesPage() {
  const searchParams = useSearchParams();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [billTypeFilter, setBillTypeFilter] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [error, setError] = useState("");
  const [converting, setConverting] = useState(null);

  useEffect(() => {
    // Read URL parameters
    const customer = searchParams.get("customer");
    const billType = searchParams.get("billType");

    if (customer) setCustomerFilter(customer);
    if (billType) setBillTypeFilter(billType);
  }, [searchParams]);

  useEffect(() => {
    fetchInvoices();
  }, [page, billTypeFilter, customerFilter]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const params = { page, limit: 10 };
      if (billTypeFilter) params.billType = billTypeFilter;
      if (customerFilter) params.customerId = customerFilter;

      const response = await invoicesAPI.getAll(params);
      setInvoices(response.data.data);
      setTotalPages(response.data.totalPages);
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
            <Button
              onClick={() => (window.location.href = "/dashboard/invoices/new")}
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
                  window.history.pushState({}, "", "/dashboard/invoices");
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
          </div>
        </CardBody>
      </Card>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl animate-shake">
          {error}
        </div>
      )}

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
    </div>
  );
}
