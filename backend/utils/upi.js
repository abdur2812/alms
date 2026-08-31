const businessConfig = require("../config/business");

/**
 * Get configured merchant UPI ID.
 */
function getUpiId() {
  if (businessConfig.upi && businessConfig.upi.id) return businessConfig.upi.id.trim();
  const phones = businessConfig.business_details?.phone_numbers || [];
  const raw = phones[0] || "";
  const digits = raw.replace(/\D/g, "").slice(-10);
  if (digits.length === 10) return `${digits}@upi`;
  return "";
}

function getUpiPayeeName() {
  return (
    (businessConfig.upi && businessConfig.upi.name) ||
    businessConfig.business_details?.business_name ||
    "AL M.S. TRADERS"
  );
}

function getInvoiceAmount(invoice) {
  if (!invoice) return 0;
  if (typeof invoice.totalAmount === "number" && invoice.totalAmount > 0) {
    return Number(invoice.totalAmount);
  }
  const items = invoice.items || [];
  const sum = items.reduce(
    (s, it) => s + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0),
    0
  );
  return Math.round(sum);
}

/**
 * Build UPI URI for an invoice
 */
function buildUpiUri({ amount, invoiceNumber, note }) {
  const pa = getUpiId();
  if (!pa) return null;
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) return null;
  const am = numericAmount.toFixed(2);
  const pn = getUpiPayeeName();
  const rawTr = invoiceNumber
    ? String(invoiceNumber).replace(/[^a-zA-Z0-9]/g, "")
    : `INV${Date.now()}`;
  const tr = rawTr.slice(0, 30);
  const defaultNote = invoiceNumber
    ? `Payment for ${invoiceNumber}`
    : "Payment to AL M.S. TRADERS";
  const tn = (note || defaultNote).slice(0, 80);
  const params = new URLSearchParams();
  params.set("pa", pa);
  params.set("pn", pn);
  params.set("am", am);
  params.set("cu", "INR");
  if (tr) params.set("tr", tr);
  if (tn) params.set("tn", tn);
  return `upi://pay?${params.toString()}`;
}

function buildUpiUriForInvoice(invoice, opts = {}) {
  if (!invoice) return null;
  let amount = getInvoiceAmount(invoice);
  amount = Math.round(Number(amount) || 0);
  if (amount <= 0) return null;
  const invoiceNumber = invoice.invoiceNumber || opts.invoiceNumber || "";
  return buildUpiUri({ amount, invoiceNumber, note: opts.note });
}

async function generateQrDataUrl(upiUri, options = {}) {
  if (!upiUri) return null;
  try {
    const QRCode = require("qrcode");
    const dataUrl = await QRCode.toDataURL(upiUri, {
      errorCorrectionLevel: "M",
      margin: options.margin ?? 1,
      width: options.width ?? 220,
      color: { dark: "#000000", light: "#FFFFFF" },
    });
    return dataUrl;
  } catch (e) {
    console.error("Failed to generate QR", e);
    return null;
  }
}

async function generateUpiQrForInvoice(invoice, opts = {}) {
  const uri = buildUpiUriForInvoice(invoice, opts);
  if (!uri) return null;
  const dataUrl = await generateQrDataUrl(uri, opts);
  return { uri, dataUrl };
}

module.exports = {
  getUpiId,
  getUpiPayeeName,
  getInvoiceAmount,
  buildUpiUri,
  buildUpiUriForInvoice,
  generateQrDataUrl,
  generateUpiQrForInvoice,
};
