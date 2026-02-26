"use client";

import { use, useState, useEffect } from "react";
import { invoicesAPI } from "@/lib/api";
import { FiArrowLeft, FiDownload, FiEdit2 } from "react-icons/fi";
import Link from "next/link";

const API_BASE = "http://localhost:3000";

export default function ViewInvoicePage({ params }) {
  const { id } = use(params);
  const [invoiceNumber, setInvoiceNumber] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };

    invoicesAPI.getById(id).then((res) => {
      setInvoiceNumber(res.data.data?.invoiceNumber);
    });

    fetch(`${API_BASE}/api/invoices/${id}/pdf?preview=1`, { headers })
      .then((r) => {
        if (!r.ok) throw new Error("Failed");
        return r.blob();
      })
      .then((blob) => {
        setPdfUrl(URL.createObjectURL(blob));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const handleDownload = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api/invoices/${id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch PDF");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Invoice-${invoiceNumber || id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
    }
  };

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
          <span className="text-sm font-semibold text-gray-700">
            {invoiceNumber ? `Invoice #${invoiceNumber}` : "Invoice"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/invoices/${id}/edit`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <FiEdit2 className="w-3.5 h-3.5" /> Edit
          </Link>
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
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
              <p className="text-sm text-gray-500">Loading PDF…</p>
            </div>
          </div>
        ) : pdfUrl ? (
          <iframe
            src={pdfUrl}
            className="w-full h-full border-0"
            title="Invoice PDF"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-red-600">Failed to load PDF.</p>
          </div>
        )}
      </div>
    </div>
  );
}
