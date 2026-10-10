import { invoicesAPI } from "@/lib/api";

const PAGE_SIZE = 50; // backend list endpoints are capped at 50 per page

const safeName = (s) => String(s).replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim();

// Fetch every invoice between two YYYY-MM-DD dates (inclusive), page by page.
export async function fetchInvoicesInRange({ startDate, endDate, isGstBill }, onProgress) {
  const all = [];
  let page = 1;
  let totalPages = 1;
  do {
    const params = { page, limit: PAGE_SIZE, startDate, endDate };
    if (isGstBill) params.isGstBill = isGstBill;
    const res = await invoicesAPI.getAll(params);
    all.push(...(res.data.data || []));
    totalPages = res.data.totalPages || 1;
    onProgress?.({ phase: "fetch", done: all.length, total: res.data.total ?? all.length });
    page += 1;
  } while (page <= totalPages);
  return all;
}

// Render each invoice to a PDF in the browser and bundle them into one ZIP
// that is downloaded locally. Nothing is zipped or stored on the server.
export async function downloadInvoicesZip(invoices, { startDate, endDate }, onProgress) {
  const [{ pdf }, JSZipMod, invoiceMod, cleanMod, upiMod] = await Promise.all([
    import("@react-pdf/renderer"),
    import("jszip"),
    import("@/components/InvoicePDF"),
    import("@/components/EstimateCleanPDF"),
    import("@/lib/upi"),
  ]);
  const JSZip = JSZipMod.default || JSZipMod;
  const zip = new JSZip();
  const used = new Set();
  const failed = [];

  for (let i = 0; i < invoices.length; i++) {
    const inv = invoices[i];
    onProgress?.({ phase: "pdf", done: i, total: invoices.length });
    try {
      const isClean = !!inv.isCleanEstimate;
      const Doc = isClean ? cleanMod.default : invoiceMod.default;
      let element;
      if (isClean) {
        element = <Doc invoice={inv} />;
      } else {
        let qr = null;
        try {
          qr = await upiMod.generateUpiQrForInvoice(inv);
        } catch (_) {
          // no QR fallback
        }
        element = <Doc invoice={inv} qrDataUrl={qr?.dataUrl} upiUri={qr?.uri} />;
      }
      const blob = await pdf(element).toBlob();
      const prefix = isClean ? "Estimate-Clean" : inv.isGstBill ? "Invoice" : "Estimate";
      let name = safeName(`${prefix}-${inv.invoiceNumber || inv._id}`);
      let unique = name;
      for (let n = 2; used.has(unique.toLowerCase()); n++) unique = `${name} (${n})`;
      used.add(unique.toLowerCase());
      zip.file(`${unique}.pdf`, blob);
    } catch (err) {
      console.error("PDF failed for", inv.invoiceNumber, err);
      failed.push(inv.invoiceNumber || inv._id);
    }
  }

  onProgress?.({ phase: "zip", done: invoices.length, total: invoices.length });
  const content = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  const url = URL.createObjectURL(content);
  const a = document.createElement("a");
  a.href = url;
  a.download = `invoices_${startDate}_to_${endDate}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return { count: invoices.length - failed.length, failed };
}
