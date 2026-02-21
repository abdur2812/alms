"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { invoicesAPI } from "@/lib/api";
import { formatINR } from "@/lib/formatters";
import { FiArrowLeft, FiPrinter, FiDownload } from "react-icons/fi";
import Link from "next/link";

export default function ViewInvoicePage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchInvoice();
  }, []);

  const fetchInvoice = async () => {
    try {
      const response = await invoicesAPI.getById(id);
      setInvoice(response.data.data);
      setLoading(false);
    } catch (err) {
      setError("Failed to fetch invoice");
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
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

  if (error || !invoice) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error || "Invoice not found"}
        </div>
        <Link
          href="/dashboard/invoices"
          className="mt-4 inline-block text-indigo-600"
        >
          Back to Invoices
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header - Hidden when printing */}
      <div className="mb-6 print:hidden">
        <Link
          href="/dashboard/invoices"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <FiArrowLeft className="mr-2" />
          Back to Invoices
        </Link>

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Invoice Details</h1>
          <div className="mt-4 sm:mt-0 flex space-x-3">
            <button
              onClick={handlePrint}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <FiPrinter className="mr-2" />
              Print
            </button>
            <Link
              href={`/dashboard/invoices/${id}`}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Edit Invoice
            </Link>
          </div>
        </div>
      </div>

      {/* Invoice Content */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="p-8">
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">INVOICE</h2>
              <p className="text-gray-600 mt-1">{invoice.invoiceNumber}</p>
            </div>
            <div className="text-right print:hidden">
              <span
                className={`px-3 py-1 inline-flex text-sm font-bold rounded-full border ${
                  invoice.billType === "credit"
                    ? "bg-red-50 text-red-700 border-red-100"
                    : "bg-green-50 text-green-700 border-green-100"
                }`}
              >
                {invoice.billType === "credit" ? "Credit Bill" : "Paid Bill"}
              </span>
            </div>
          </div>

          {/* Customer & Date Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 uppercase mb-2">
                Bill To:
              </h3>
              <div className="text-gray-900">
                <p className="font-medium text-lg">
                  {invoice.customerId?.name}
                </p>
                <p className="text-sm">{invoice.customerId?.email}</p>
                <p className="text-sm">{invoice.customerId?.phone}</p>
                {invoice.customerId?.address && (
                  <div className="text-sm mt-2">
                    {invoice.customerId.address.street && (
                      <p>{invoice.customerId.address.street}</p>
                    )}
                    {(invoice.customerId.address.city ||
                      invoice.customerId.address.state) && (
                      <p>
                        {invoice.customerId.address.city}
                        {invoice.customerId.address.city &&
                          invoice.customerId.address.state &&
                          ", "}
                        {invoice.customerId.address.state}{" "}
                        {invoice.customerId.address.zipCode}
                      </p>
                    )}
                    {invoice.customerId.address.country && (
                      <p>{invoice.customerId.address.country}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="text-left md:text-right">
              <div className="mb-4">
                <p className="text-sm text-gray-600">Invoice Date</p>
                <p className="font-medium">
                  {new Date(invoice.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Last Updated</p>
                <p className="font-medium">
                  {new Date(invoice.updatedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-8">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit Price
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoice.items.map((item, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {item.name || item.productId?.name || "Product"}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-900">
                      {item.quantity}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-900">
                      {formatINR(item.unitPrice)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                      {formatINR(item.quantity * item.unitPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-full md:w-1/2 lg:w-1/3">
              <div className="flex justify-between py-2 text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">
                  {formatINR(invoice.subtotal || 0)}
                </span>
              </div>
              <div className="flex justify-between py-2 text-sm">
                <span className="text-gray-600">GST:</span>
                <span className="font-medium">
                  {formatINR(invoice.gstAmount || 0)}
                </span>
              </div>
              <div className="flex justify-between py-3 border-t-2 border-gray-200">
                <span className="text-lg font-semibold">Total:</span>
                <span className="text-2xl font-bold text-indigo-600">
                  {formatINR(invoice.totalAmount || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
