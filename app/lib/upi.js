import businessConfig from "./businessConfig";

/**
 * Get configured merchant UPI ID.
 * Falls back to phone-based VPA if not explicitly configured.
 */
export function getUpiId() {
  if (businessConfig.upi?.id) return businessConfig.upi.id.trim();
  if (businessConfig.upiId) return String(businessConfig.upiId).trim();
  // Fallback: derive from primary phone number (last 10 digits + @upi)
  const phones = businessConfig.business_details?.phone_numbers || [];
  const raw = phones[0] || "";
  const digits = raw.replace(/\D/g, "").slice(-10);
  if (digits.length === 10) return `${digits}@upi`;
  return "";
}

/**
 * Get payee name shown in UPI apps.
 */
export function getUpiPayeeName() {
  return (
    businessConfig.upi?.name ||
    businessConfig.business_details?.business_name ||
    "AL M.S. TRADERS"
  );
}

/**
 * Compute payable amount for an invoice.
 * Uses invoice.totalAmount if present, otherwise sums items (GST-inclusive).
 */
export function getInvoiceAmount(invoice) {
  if (!invoice) return 0;
  if (typeof invoice.totalAmount === "number" && invoice.totalAmount > 0) {
    return Number(invoice.totalAmount);
  }
  // Fallback: sum of qty * unitPrice (GST-inclusive as per app convention)
  const items = invoice.items || [];
  const sum = items.reduce(
    (s, it) => s + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0),
    0
  );
  // Also consider virtual grandTotal if computed elsewhere
  return Math.round(sum);
}

/**
 * Build a UPI payment URI: upi://pay?pa=...&pn=...&am=...&cu=INR&tr=...&tn=...
 * https://www.npci.org.in/what-we-do/upi/upi-specification (common fields)
 *
 * @param {Object} opts
 * @param {number|string} opts.amount - payable amount (>0)
 * @param {string} [opts.invoiceNumber] - used for tr (txn ref) and tn (note)
 * @param {string} [opts.note] - custom transaction note (tn param)
 * @returns {string|null} UPI URI or null if pa/amount invalid
 */
export function buildUpiUri({ amount, invoiceNumber, note }) {
  const pa = getUpiId();
  if (!pa) return null;

  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) return null;

  // UPI spec expects amount formatted to 2 decimal places, e.g. 1499.00
  const am = numericAmount.toFixed(2);
  const pn = getUpiPayeeName();

  // tr = transaction reference: alphanumeric, max ~30-35 chars, use invoiceNumber sanitized
  const rawTr = invoiceNumber
    ? String(invoiceNumber).replace(/[^a-zA-Z0-9]/g, "")
    : `INV${Date.now()}`;
  const tr = rawTr.slice(0, 30);

  // tn = transaction note visible to payer
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

/**
 * Build UPI URI directly from an invoice object.
 * Uses Math.round of grandTotal (consistent with PDF display) as amount.
 */
export function buildUpiUriForInvoice(invoice, opts = {}) {
  if (!invoice) return null;

  // Recompute grandTotal the same way InvoicePDF does (GST-inclusive sum)
  let amount = getInvoiceAmount(invoice);
  // InvoicePDF displays Math.round(grandTotal); use same for UPI to avoid paise mismatches
  amount = Math.round(Number(amount) || 0);

  // Don't generate URI for zero/negative amount (e.g. empty invoice)
  if (amount <= 0) return null;

  const invoiceNumber = invoice.invoiceNumber || opts.invoiceNumber || "";
  return buildUpiUri({
    amount,
    invoiceNumber,
    note: opts.note,
  });
}

/**
 * Generate a QR Code data URL (PNG base64) for a UPI URI.
 * Uses the `qrcode` package (must be installed in app/).
 *
 * @param {string} upiUri - e.g. upi://pay?pa=...&am=...
 * @param {Object} [options]
 * @param {number} [options.width=220] - pixel width of QR
 * @param {number} [options.margin=1] - quiet zone
 * @returns {Promise<string|null>} data:image/png;base64,... or null on failure
 */
export async function generateQrDataUrl(upiUri, options = {}) {
  if (!upiUri) return null;
  try {
    const QRCode = (await import("qrcode")).default;
    const dataUrl = await QRCode.toDataURL(upiUri, {
      errorCorrectionLevel: "M",
      margin: options.margin ?? 1,
      width: options.width ?? 220,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });
    return dataUrl;
  } catch (e) {
    console.error("Failed to generate QR data URL", e);
    return null;
  }
}

/**
 * Convenience: build URI + generate QR in one call for an invoice.
 * @returns {Promise<{uri:string,dataUrl:string|null}|null>}
 */
export async function generateUpiQrForInvoice(invoice, opts = {}) {
  const uri = buildUpiUriForInvoice(invoice, opts);
  if (!uri) return null;
  const dataUrl = await generateQrDataUrl(uri, opts);
  return { uri, dataUrl };
}
