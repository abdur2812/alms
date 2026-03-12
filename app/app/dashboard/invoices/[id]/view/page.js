"use client";

import { use, useState, useEffect } from "react";
import { invoicesAPI } from "@/lib/api";
import { FiArrowLeft, FiDownload, FiEdit2, FiFileText } from "react-icons/fi";
import Link from "next/link";

export default function ViewInvoicePage({ params }) {
  const { id } = use(params);
  const [invoice, setInvoice] = useState(null);
  const [pdfComponents, setPdfComponents] = useState(null); // { PDFViewer, InvoiceDoc }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [converting, setConverting] = useState(false);

  const loadInvoice = () => {
    return Promise.all([
      invoicesAPI.getById(id),
      import("@react-pdf/renderer"),
      import("@/components/InvoicePDF"),
    ])
      .then(([res, pdfLib, invoiceDoc]) => {
        setInvoice(res.data.data);
        setPdfComponents({
          PDFViewer: pdfLib.PDFViewer,
          InvoiceDoc: invoiceDoc.default,
        });
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadInvoice();
  }, [id]);

  const handleDownload = async () => {
    if (!invoice) return;
    try {
      const [{ pdf }, { default: InvoiceDoc }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/components/InvoicePDF"),
      ]);
      const blob = await pdf(<InvoiceDoc invoice={invoice} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${invoice.isGstBill ? "Invoice" : "Estimate"}-${invoice.invoiceNumber || id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Download failed. Please try again.");
    }
  };

  const handleConvertToTaxInvoice = async () => {
    if (!invoice || converting) return;
    if (
      !confirm("Convert this Estimate to a Tax Invoice? This cannot be undone.")
    )
      return;
    setConverting(true);
    try {
      await invoicesAPI.update(id, { isGstBill: true });
      // Reload the invoice
      setLoading(true);
      setPdfComponents(null);
      setInvoice(null);
      await loadInvoice();
    } catch (err) {
      alert(
        err.response?.data?.message || "Failed to convert. Please try again.",
      );
    } finally {
      setConverting(false);
    }
  };

  const { PDFViewer, InvoiceDoc } = pdfComponents || {};

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* TOP BAR */}
      <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-gray-200 shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/invoices"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <FiArrowLeft className="w-4 h-4" /> Back
          </Link>
          <span className="text-gray-300">|</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-700">
              {invoice
                ? `${invoice.isGstBill ? "Invoice" : "Estimate"} #${invoice.invoiceNumber}`
                : "Invoice"}
            </span>
            {invoice && !invoice.isGstBill && (
              <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 border border-amber-200 rounded-full font-medium">
                Estimate
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Convert to Tax Invoice – only shown for estimates */}
          {invoice && !invoice.isGstBill && (
            <button
              onClick={handleConvertToTaxInvoice}
              disabled={converting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <FiFileText className="w-3.5 h-3.5" />
              {converting ? "Converting…" : "Convert to Tax Invoice"}
            </button>
          )}
          <Link
            href={`/dashboard/invoices/${id}/edit`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <FiEdit2 className="w-3.5 h-3.5" /> Edit
          </Link>
          <button
            onClick={handleDownload}
            disabled={!invoice}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <FiDownload className="w-3.5 h-3.5" /> Download
          </button>
        </div>
      </div>

      {/* PDF PREVIEW */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Generating preview…</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-red-600 text-sm">Failed to load invoice.</p>
          </div>
        ) : PDFViewer && InvoiceDoc && invoice ? (
          <PDFViewer width="100%" height="100%" style={{ border: "none" }}>
            <InvoiceDoc invoice={invoice} />
          </PDFViewer>
        ) : null}
      </div>
    </div>
  );
}
