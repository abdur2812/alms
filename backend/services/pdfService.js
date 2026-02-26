const puppeteer = require("puppeteer");
const businessConfig = require("../config/business");

class PDFService {
  constructor() {
    this.browser = null;
    this.pdfCache = new Map(); // invoiceId -> { buffer, updatedAt }
  }

  async initBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: "new",
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
    }
    return this.browser;
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  generateInvoiceHTML(invoice) {
    const business = businessConfig.business_details;
    const bank = businessConfig.bank_details;
    const declaration = businessConfig.declaration;

    // Calculate totals
    let subtotal = 0;
    let totalTax = 0;

    const rows = (invoice.items || []).map((item, index) => {
      const itemSubtotal = item.quantity * item.unitPrice;
      const taxAmt = (itemSubtotal * (item.gst || 0)) / 100;
      subtotal += itemSubtotal;
      totalTax += taxAmt;
      return { ...item, index: index + 1, itemSubtotal, taxAmt };
    });

    const grandTotal = subtotal + totalTax;

    const fmt = (n) =>
      new Intl.NumberFormat("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(n || 0);

    const invoiceDate = new Date(invoice.createdAt).toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      },
    );

    const customerData = invoice.customerData || {};
    const customerRef = invoice.customerId || {};
    const custName = customerData.name || customerRef.name || "N/A";
    const custPhone = customerData.phone || customerRef.phone || "";
    const custGst = customerData.gstNumber || customerRef.gstNumber || "";
    const custAddr = customerData.address || customerRef.address || {};
    const custAddrLine1 = custAddr.companyAddress || custAddr.street || "";
    const custAddrLine2 = [
      custAddr.city,
      custAddr.state,
      custAddr.postalCode || custAddr.zipCode,
    ]
      .filter(Boolean)
      .join(", ");

    const amountInWords = this.convertToWords(grandTotal);

    // Filler rows for short invoices
    const fillerCount = rows.length < 5 ? 5 - rows.length : 0;
    const fillerRows = Array.from({ length: fillerCount })
      .map(
        (_, i) => `
      <tr style="background:${(rows.length + i) % 2 === 0 ? "#fff" : "#fafafa"}">
        ${Array.from({ length: 9 })
          .map(
            (__, ci) =>
              `<td style="padding:9px 8px;border-bottom:${i < fillerCount - 1 ? "1px solid #e8e8e8" : "none"};border-right:${ci < 8 ? "1px solid #e8e8e8" : "none"};font-size:11px;">&nbsp;</td>`,
          )
          .join("")}
      </tr>`,
      )
      .join("");

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice ${invoice.invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 12px;
      color: #111;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page {
      width: 794px;
      min-height: 1122px;
      margin: 0 auto;
      border: 2px solid #555;
      border-radius: 4px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .spacer { flex: 1; }
  </style>
</head>
<body>
<div class="page">

  <!-- ① SHOP HEADER -->
  <div style="background:#f5f5f5;border-bottom:2px solid #555;padding:20px 24px;display:flex;justify-content:space-between;align-items:flex-start;">
    <div>
      <div style="font-size:24px;font-weight:800;letter-spacing:0.5px;margin-bottom:4px;">${business.business_name}</div>
      <div style="font-size:11px;color:#444;margin-bottom:8px;">${business.tagline}</div>
      <div style="font-size:11px;line-height:1.8;color:#222;">
        📍 ${business.address.door_no_old}, ${business.address.door_no_new}, ${business.address.street}, ${business.address.area}<br>
        ${business.address.landmark}, ${business.address.district} – ${business.address.pincode}, ${business.address.state}<br>
        📞 ${business.phone_numbers.join("  |  ")}
      </div>
    </div>
    <div style="text-align:right;font-size:11px;line-height:1.8;color:#222;">
      <div style="font-weight:700;font-size:13px;margin-bottom:4px;">GSTIN</div>
      <div style="font-weight:700;font-family:monospace;letter-spacing:1px;margin-bottom:8px;">${business.gst_number}</div>
      <div><span style="font-weight:600;">State: </span>${business.address.state}</div>
      <div><span style="font-weight:600;">State Code: </span>33</div>
    </div>
  </div>

  <!-- ② TAX INVOICE TITLE -->
  <div style="border-bottom:2px solid #555;text-align:center;padding:8px 0;font-size:14px;font-weight:800;letter-spacing:4px;background:#fff;">
    TAX INVOICE
  </div>

  <!-- ③ CUSTOMER + INVOICE META -->
  <div style="display:flex;border-bottom:2px solid #555;">
    <div style="flex:1;padding:14px 18px;border-right:2px solid #555;">
      <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#555;border-bottom:1px solid #ddd;padding-bottom:5px;margin-bottom:8px;">Billed To</div>
      <div style="font-size:15px;font-weight:800;margin-bottom:4px;">${custName}</div>
      <div style="font-size:11px;line-height:1.8;color:#333;">
        ${custPhone ? `📞 ${custPhone}<br>` : ""}
        ${custGst ? `GSTIN: <strong>${custGst}</strong><br>` : ""}
        ${custAddrLine1 ? `${custAddrLine1}<br>` : ""}
        ${custAddrLine2 || ""}
      </div>
    </div>
    <div style="width:240px;padding:14px 18px;">
      <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#555;border-bottom:1px solid #ddd;padding-bottom:5px;margin-bottom:10px;">Invoice Details</div>
      <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:7px;">
        <span style="color:#555;font-weight:600;">Invoice No.</span>
        <span style="font-weight:700;">#${invoice.invoiceNumber}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:7px;">
        <span style="color:#555;font-weight:600;">Date</span>
        <span style="font-weight:700;">${invoiceDate}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:7px;">
        <span style="color:#555;font-weight:600;">Bill Type</span>
        <span style="font-weight:700;background:${invoice.billType === "credit" ? "#fee2e2" : "#dcfce7"};color:${invoice.billType === "credit" ? "#b91c1c" : "#15803d"};padding:1px 10px;border-radius:10px;font-size:10px;">
          ${invoice.billType === "credit" ? "Credit Bill" : "Cash Bill"}
        </span>
      </div>
    </div>
  </div>

  <!-- ④ ITEMS TABLE -->
  <table style="width:100%;border-collapse:collapse;border-bottom:2px solid #555;">
    <thead>
      <tr style="background:#eeeeee;">
        <th style="padding:9px 8px;text-align:center;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;border-bottom:2px solid #555;border-right:1px solid #bbb;width:32px;white-space:nowrap;">Sl.</th>
        <th style="padding:9px 8px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;border-bottom:2px solid #555;border-right:1px solid #bbb;width:160px;">Product Name</th>
        <th style="padding:9px 8px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;border-bottom:2px solid #555;border-right:1px solid #bbb;">Description</th>
        <th style="padding:9px 8px;text-align:center;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;border-bottom:2px solid #555;border-right:1px solid #bbb;width:64px;">HSN/SAC</th>
        <th style="padding:9px 8px;text-align:center;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;border-bottom:2px solid #555;border-right:1px solid #bbb;width:40px;">Qty</th>
        <th style="padding:9px 8px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;border-bottom:2px solid #555;border-right:1px solid #bbb;width:80px;">Unit Price</th>
        <th style="padding:9px 8px;text-align:center;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;border-bottom:2px solid #555;border-right:1px solid #bbb;width:48px;">Tax %</th>
        <th style="padding:9px 8px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;border-bottom:2px solid #555;border-right:1px solid #bbb;width:76px;">Tax Amt</th>
        <th style="padding:9px 8px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;border-bottom:2px solid #555;width:84px;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${rows
        .map(
          (item, ri) => `
      <tr style="background:${ri % 2 === 0 ? "#fff" : "#fafafa"}">
        <td style="padding:9px 8px;text-align:center;font-size:11px;border-bottom:${ri < rows.length - 1 ? "1px solid #e8e8e8" : "none"};border-right:1px solid #e8e8e8;vertical-align:top;">${item.index}</td>
        <td style="padding:9px 8px;font-size:11px;border-bottom:${ri < rows.length - 1 ? "1px solid #e8e8e8" : "none"};border-right:1px solid #e8e8e8;vertical-align:top;"><strong>${item.name || item.productId?.name || "–"}</strong></td>
        <td style="padding:9px 8px;font-size:10px;color:#555;border-bottom:${ri < rows.length - 1 ? "1px solid #e8e8e8" : "none"};border-right:1px solid #e8e8e8;vertical-align:top;">${item.description || "–"}</td>
        <td style="padding:9px 8px;text-align:center;font-size:11px;border-bottom:${ri < rows.length - 1 ? "1px solid #e8e8e8" : "none"};border-right:1px solid #e8e8e8;vertical-align:top;">${item.hsnCode || "–"}</td>
        <td style="padding:9px 8px;text-align:center;font-size:11px;border-bottom:${ri < rows.length - 1 ? "1px solid #e8e8e8" : "none"};border-right:1px solid #e8e8e8;vertical-align:top;">${item.quantity}</td>
        <td style="padding:9px 8px;text-align:right;font-size:11px;border-bottom:${ri < rows.length - 1 ? "1px solid #e8e8e8" : "none"};border-right:1px solid #e8e8e8;vertical-align:top;">₹${fmt(item.unitPrice)}</td>
        <td style="padding:9px 8px;text-align:center;font-size:11px;border-bottom:${ri < rows.length - 1 ? "1px solid #e8e8e8" : "none"};border-right:1px solid #e8e8e8;vertical-align:top;">${item.gst || 0}%</td>
        <td style="padding:9px 8px;text-align:right;font-size:11px;border-bottom:${ri < rows.length - 1 ? "1px solid #e8e8e8" : "none"};border-right:1px solid #e8e8e8;vertical-align:top;">₹${fmt(item.taxAmt)}</td>
        <td style="padding:9px 8px;text-align:right;font-size:11px;border-bottom:${ri < rows.length - 1 ? "1px solid #e8e8e8" : "none"};vertical-align:top;"><strong>₹${fmt(item.itemSubtotal + item.taxAmt)}</strong></td>
      </tr>`,
        )
        .join("")}
      ${fillerRows}
    </tbody>
  </table>

  <!-- ⑤ TOTALS + AMOUNT IN WORDS -->
  <div style="display:flex;border-bottom:2px solid #555;">
    <div style="flex:1;padding:14px 18px;border-right:2px solid #555;display:flex;flex-direction:column;justify-content:center;">
      <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#555;margin-bottom:5px;">Amount in Words</div>
      <div style="font-size:12px;font-weight:700;font-style:italic;">Rupees ${amountInWords} Only</div>
    </div>
    <div style="width:280px;">
      <div style="display:flex;justify-content:space-between;padding:9px 14px;border-bottom:1px solid #e8e8e8;font-size:11px;">
        <span style="color:#444;">Sub Total</span>
        <span style="font-weight:600;">₹${fmt(subtotal)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:9px 14px;border-bottom:1px solid #e8e8e8;font-size:11px;">
        <span style="color:#444;">Total Tax (GST)</span>
        <span style="font-weight:600;">₹${fmt(totalTax)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:9px 14px;background:#111;color:#fff;font-size:13px;font-weight:800;">
        <span style="color:#ddd;">Grand Total</span>
        <span>₹${fmt(grandTotal)}</span>
      </div>
    </div>
  </div>

  <!-- ⑥ DECLARATION -->
  <div style="padding:10px 18px;font-size:10px;color:#555;border-bottom:1.5px solid #ddd;background:#fafafa;">
    We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct. &nbsp;<strong>E. &amp; O.E.</strong>
  </div>

  <!-- SPACER: pushes bank+footer to bottom -->
  <div class="spacer"></div>

  <!-- ⑦ BANK DETAILS + SIGNATURE -->
  <div style="display:flex;border-top:2px solid #555;">
    <div style="flex:1;padding:14px 18px;border-right:2px solid #555;">
      <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#555;border-bottom:1px solid #ddd;padding-bottom:5px;margin-bottom:10px;">Bank Details</div>
      <div style="display:grid;grid-template-columns:auto 1fr;gap:4px 16px;font-size:11px;">
        <span style="color:#555;font-weight:600;">Account Holder</span><span style="font-weight:700;">${bank.account_holder}</span>
        <span style="color:#555;font-weight:600;">Bank</span><span style="font-weight:700;">${bank.bank_name}</span>
        <span style="color:#555;font-weight:600;">Account No.</span><span style="font-weight:700;">${bank.account_number}</span>
        <span style="color:#555;font-weight:600;">IFSC</span><span style="font-weight:700;">${bank.ifsc_code}</span>
        <span style="color:#555;font-weight:600;">Branch</span><span style="font-weight:700;">${bank.branch_name}</span>
      </div>
    </div>
    <div style="width:220px;padding:14px 18px;display:flex;flex-direction:column;align-items:center;justify-content:space-between;text-align:center;">
      <div style="font-size:11px;font-weight:700;">${business.business_name}</div>
      <div>
        <div style="width:140px;border-top:1.5px solid #555;margin:40px auto 6px;"></div>
        <div style="font-size:10px;color:#555;font-weight:600;">Authorised Signatory</div>
      </div>
    </div>
  </div>

  <!-- ⑧ FOOTER -->
  <div style="text-align:center;padding:9px;font-size:11px;color:#444;background:#f5f5f5;border-top:2px solid #555;">
    Thank You for your business! — Visit Again at ${business.business_name}
  </div>

</div>
</body>
</html>`;
  }

  convertToWords(amount) {
    const ones = [
      "",
      "One",
      "Two",
      "Three",
      "Four",
      "Five",
      "Six",
      "Seven",
      "Eight",
      "Nine",
      "Ten",
      "Eleven",
      "Twelve",
      "Thirteen",
      "Fourteen",
      "Fifteen",
      "Sixteen",
      "Seventeen",
      "Eighteen",
      "Nineteen",
    ];
    const tens = [
      "",
      "",
      "Twenty",
      "Thirty",
      "Forty",
      "Fifty",
      "Sixty",
      "Seventy",
      "Eighty",
      "Ninety",
    ];

    function convertThreeDigit(num) {
      let result = "";
      if (num >= 100) {
        result += ones[Math.floor(num / 100)] + " Hundred ";
        num %= 100;
      }
      if (num >= 20) {
        result += tens[Math.floor(num / 10)] + " ";
        num %= 10;
      }
      if (num > 0) {
        result += ones[num] + " ";
      }
      return result;
    }

    function convertToIndianSystem(num) {
      if (num === 0) return "Zero";

      let result = "";
      let crore = Math.floor(num / 10000000);
      let lakh = Math.floor((num % 10000000) / 100000);
      let thousand = Math.floor((num % 100000) / 1000);
      let hundred = num % 1000;

      if (crore > 0) {
        result += convertThreeDigit(crore) + "Crore ";
      }
      if (lakh > 0) {
        result += convertThreeDigit(lakh) + "Lakh ";
      }
      if (thousand > 0) {
        result += convertThreeDigit(thousand) + "Thousand ";
      }
      if (hundred > 0) {
        result += convertThreeDigit(hundred);
      }

      return result.trim();
    }

    const rupees = Math.floor(amount);
    const paise = Math.round((amount - rupees) * 100);

    let result = convertToIndianSystem(rupees) + " Rupees";
    if (paise > 0) {
      result += " and " + convertToIndianSystem(paise) + " Paise";
    }
    return result;
  }

  async generateInvoicePDF(invoice) {
    try {
      const cacheKey = invoice._id.toString();
      const updatedAt = invoice.updatedAt
        ? new Date(invoice.updatedAt).getTime()
        : 0;
      const cached = this.pdfCache.get(cacheKey);

      if (cached && cached.updatedAt === updatedAt) {
        return cached.buffer;
      }

      const browser = await this.initBrowser();
      const page = await browser.newPage();

      const html = this.generateInvoiceHTML(invoice);
      await page.setContent(html, { waitUntil: "domcontentloaded" });

      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "0", bottom: "0", left: "0", right: "0" },
      });

      await page.close();

      this.pdfCache.set(cacheKey, { buffer: pdf, updatedAt });
      return pdf;
    } catch (error) {
      console.error("Error generating PDF:", error);
      throw error;
    }
  }

  clearCache(invoiceId) {
    this.pdfCache.delete(invoiceId.toString());
  }
}

module.exports = new PDFService();
