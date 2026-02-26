const pdfMake = require("pdfmake/build/pdfmake");
const pdfFonts = require("pdfmake/build/vfs_fonts");
pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts.vfs;
const businessConfig = require("../config/business");

// ─── Custom table layouts ─────────────────────────────────────────────────────

/** Outer border: 1.5pt #555 on all four sides, no inner lines, 0 padding */
const outerLayout = {
  hLineWidth: (i, node) => (i === 0 || i === node.table.body.length ? 1.5 : 0),
  vLineWidth: (i, node) =>
    i === 0 || i === node.table.widths.length ? 1.5 : 0,
  hLineColor: () => "#555555",
  vLineColor: () => "#555555",
  paddingLeft: () => 0,
  paddingRight: () => 0,
  paddingTop: () => 0,
  paddingBottom: () => 0,
};

/**
 * 2-column section splitter:
 * outer v-lines = 0 (outer table draws them), single divider between cols,
 * no h-lines.
 */
const splitLayout = {
  hLineWidth: () => 0,
  vLineWidth: (i, node) => (i === 0 || i === node.table.widths.length ? 0 : 1),
  vLineColor: () => "#555555",
  paddingLeft: (i) => (i === 0 ? 6 : 7),
  paddingRight: (i, node) => (i === node.table.widths.length - 1 ? 6 : 7),
  paddingTop: () => 5,
  paddingBottom: () => 5,
};

/** No borders, tight padding for inner data grids */
const noBorder = {
  hLineWidth: () => 0,
  vLineWidth: () => 0,
  paddingLeft: () => 0,
  paddingRight: () => 4,
  paddingTop: () => 2,
  paddingBottom: () => 2,
};

// ─── Number helpers ───────────────────────────────────────────────────────────

function fmt(n) {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n || 0);
}

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

function numToWords(n) {
  if (n === 0) return "Zero";
  if (n < 0) return "Minus " + numToWords(-n);
  let str = "";
  if (n >= 10000000) {
    str += numToWords(Math.floor(n / 10000000)) + " Crore ";
    n %= 10000000;
  }
  if (n >= 100000) {
    str += numToWords(Math.floor(n / 100000)) + " Lakh ";
    n %= 100000;
  }
  if (n >= 1000) {
    str += numToWords(Math.floor(n / 1000)) + " Thousand ";
    n %= 1000;
  }
  if (n >= 100) {
    str += ones[Math.floor(n / 100)] + " Hundred ";
    n %= 100;
  }
  if (n >= 20) {
    str += tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
  } else if (n > 0) {
    str += ones[n];
  }
  return str.trim();
}

function convertToWords(amount) {
  const intPart = Math.floor(amount);
  const decPart = Math.round((amount - intPart) * 100);
  let result = "Rupees " + numToWords(intPart);
  if (decPart > 0) result += " and " + numToWords(decPart) + " Paise";
  return result + " Only";
}

// ─── Main class ───────────────────────────────────────────────────────────────

class PDFService {
  constructor() {
    this.pdfCache = new Map(); // key: "invoiceId:updatedAt" → Buffer
  }

  clearCache(invoiceId) {
    const prefix = invoiceId.toString() + ":";
    for (const key of this.pdfCache.keys()) {
      if (key.startsWith(prefix)) this.pdfCache.delete(key);
    }
  }

  async generateInvoicePDF(invoice) {
    const cacheKey = `${invoice._id}:${invoice.updatedAt}`;
    if (this.pdfCache.has(cacheKey)) return this.pdfCache.get(cacheKey);
    const buffer = await this._createPDF(invoice);
    this.pdfCache.set(cacheKey, buffer);
    return buffer;
  }

  _createPDF(invoice) {
    return new Promise((resolve, reject) => {
      const docDef = this._buildDoc(invoice);
      pdfMake.createPdf(docDef).getBuffer((buffer) => {
        if (!buffer || buffer.length === 0) {
          reject(new Error("PDF generation produced empty buffer"));
        } else {
          resolve(Buffer.from(buffer));
        }
      });
    });
  }

  _buildDoc(invoice) {
    const biz = businessConfig.business_details;
    const bank = businessConfig.bank_details;
    const decl = businessConfig.declaration;
    const addr = biz.address;

    const customer = invoice.customerData || {};
    const permAddr = customer.permanentAddress || {};

    // ── Totals ───────────────────────────────────────────────────────────────
    let subtotal = 0;
    const gstGroups = {};
    const items = invoice.items || [];

    items.forEach((item) => {
      const ls = item.quantity * item.unitPrice;
      subtotal += ls;
      if (invoice.isGstBill && item.gst > 0) {
        if (!gstGroups[item.gst]) gstGroups[item.gst] = 0;
        gstGroups[item.gst] += (ls * item.gst) / 100;
      }
    });

    const totalGst = Object.values(gstGroups).reduce((s, v) => s + v, 0);
    const grandTotal = subtotal + totalGst;

    // ── Item rows ─────────────────────────────────────────────────────────────
    const itemHeaderRow = [
      { text: "S.No", style: "th", alignment: "center" },
      { text: "Particulars", style: "th" },
      { text: "HSN", style: "th", alignment: "center" },
      { text: "Qty", style: "th", alignment: "center" },
      { text: "Unit", style: "th", alignment: "center" },
      { text: "Rate", style: "th", alignment: "right" },
      { text: "GST%", style: "th", alignment: "center" },
      { text: "GST Amt", style: "th", alignment: "right" },
      { text: "Amount", style: "th", alignment: "right" },
    ];

    const cell = (text, alignment, bg) => ({
      text: String(text),
      style: "td",
      alignment: alignment || "left",
      ...(bg ? { fillColor: bg } : {}),
    });

    const itemRows = items.map((item, idx) => {
      const ls = item.quantity * item.unitPrice;
      const gstAmt = invoice.isGstBill ? (ls * item.gst) / 100 : 0;
      const total = ls + gstAmt;
      const bg = idx % 2 === 1 ? "#fafafa" : null;
      return [
        cell(idx + 1, "center", bg),
        cell(item.name || "", "left", bg),
        cell(item.hsnCode || "-", "center", bg),
        cell(item.quantity, "center", bg),
        cell("Nos", "center", bg),
        cell(fmt(item.unitPrice), "right", bg),
        cell(invoice.isGstBill ? (item.gst || 0) + "%" : "-", "center", bg),
        cell(invoice.isGstBill ? fmt(gstAmt) : "-", "right", bg),
        cell(fmt(total), "right", bg),
      ];
    });

    // Pad to min 5 visible rows
    while (itemRows.length < 5) {
      itemRows.push(Array(9).fill({ text: " ", style: "td" }));
    }

    // ── GST breakdown ─────────────────────────────────────────────────────────
    const gstRows = [];
    if (invoice.isGstBill) {
      Object.keys(gstGroups)
        .sort((a, b) => a - b)
        .forEach((rate) => {
          const half = gstGroups[rate] / 2;
          gstRows.push([
            { text: `CGST @ ${rate / 2}%`, style: "totalsLabel" },
            { text: fmt(half), style: "totalsValue" },
          ]);
          gstRows.push([
            { text: `SGST @ ${rate / 2}%`, style: "totalsLabel" },
            { text: fmt(half), style: "totalsValue" },
          ]);
        });
    }

    // ── Address strings ───────────────────────────────────────────────────────
    const bizAddress =
      `${addr.door_no_old}/${addr.door_no_new}, ${addr.street}, ${addr.area},\n` +
      `${addr.landmark}, ${addr.district} - ${addr.pincode}`;
    const bizPhones = biz.phone_numbers.join(" | ");

    const custAddrStr = [
      permAddr.companyAddress,
      permAddr.city,
      permAddr.state,
      permAddr.postalCode,
    ]
      .filter(Boolean)
      .join(", ");

    const invoiceDate = invoice.createdAt
      ? new Date(invoice.createdAt).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : "-";

    const billLabel =
      invoice.billType === "credit" ? "Credit Bill" : "Cash Bill";

    // ── Items table layout ────────────────────────────────────────────────────
    const itemsLayout = {
      hLineWidth: (i, node) =>
        i === 0 || i === 1 || i === node.table.body.length ? 0.5 : 0,
      vLineWidth: (i, node) =>
        i === 0 || i === node.table.widths.length ? 0 : 0.4,
      hLineColor: () => "#cccccc",
      vLineColor: () => "#cccccc",
      paddingLeft: (i) => (i === 0 ? 4 : 3),
      paddingRight: (i, node) => (i === node.table.widths.length - 1 ? 4 : 3),
      paddingTop: () => 3,
      paddingBottom: () => 3,
    };

    // ── Totals right-side layout ──────────────────────────────────────────────
    const totalsLayout = {
      hLineWidth: (i, node) =>
        i === 0 || i === node.table.body.length ? 0 : 0.3,
      vLineWidth: () => 0,
      hLineColor: () => "#dddddd",
      paddingLeft: () => 4,
      paddingRight: () => 4,
      paddingTop: () => 2,
      paddingBottom: () => 2,
    };

    // ── Document definition ───────────────────────────────────────────────────
    return {
      pageSize: "A4",
      pageMargins: [20, 20, 20, 20],
      defaultStyle: { font: "Roboto", fontSize: 8 },
      styles: {
        th: { fontSize: 7.5, bold: true, fillColor: "#eeeeee" },
        td: { fontSize: 7.5 },
        totalsLabel: { fontSize: 8, alignment: "right" },
        totalsValue: { fontSize: 8, alignment: "right" },
      },

      content: [
        {
          table: {
            widths: ["*"],
            body: [
              // ① HEADER ────────────────────────────────────────────────────
              [
                {
                  fillColor: "#f5f5f5",
                  table: {
                    widths: ["65%", "35%"],
                    body: [
                      [
                        {
                          stack: [
                            {
                              text: biz.business_name,
                              bold: true,
                              fontSize: 18,
                              color: "#111111",
                              margin: [0, 0, 0, 3],
                            },
                            {
                              text: biz.tagline,
                              fontSize: 7.5,
                              color: "#555555",
                              margin: [0, 0, 0, 4],
                            },
                            {
                              text: bizAddress,
                              fontSize: 7.5,
                              color: "#333333",
                            },
                            {
                              text: `Ph: ${bizPhones}`,
                              fontSize: 7.5,
                              color: "#333333",
                              margin: [0, 3, 0, 0],
                            },
                          ],
                        },
                        {
                          stack: [
                            { text: "GSTIN", fontSize: 7, color: "#888888" },
                            { text: biz.gst_number, bold: true, fontSize: 9 },
                            {
                              text: `State: ${addr.state}`,
                              fontSize: 7.5,
                              color: "#555555",
                              margin: [0, 6, 0, 0],
                            },
                          ],
                          alignment: "center",
                        },
                      ],
                    ],
                  },
                  layout: splitLayout,
                },
              ],

              // ② TAX INVOICE TITLE ─────────────────────────────────────────
              [
                {
                  text: "TAX INVOICE",
                  alignment: "center",
                  bold: true,
                  fontSize: 11,
                  characterSpacing: 4,
                  margin: [0, 6, 0, 6],
                  border: [false, true, false, true],
                },
              ],

              // ③ CUSTOMER + META ────────────────────────────────────────────
              [
                {
                  table: {
                    widths: ["60%", "40%"],
                    body: [
                      [
                        {
                          stack: [
                            {
                              text: "Bill To",
                              fontSize: 7,
                              color: "#888888",
                              margin: [0, 0, 0, 2],
                            },
                            {
                              text: customer.name || "-",
                              bold: true,
                              fontSize: 12,
                            },
                            ...(customer.phone
                              ? [
                                  {
                                    text: `Ph: ${customer.phone}`,
                                    fontSize: 7.5,
                                    margin: [0, 2, 0, 0],
                                  },
                                ]
                              : []),
                            ...(customer.gstNumber
                              ? [
                                  {
                                    text: `GST: ${customer.gstNumber}`,
                                    fontSize: 7.5,
                                  },
                                ]
                              : []),
                            ...(custAddrStr
                              ? [
                                  {
                                    text: custAddrStr,
                                    fontSize: 7.5,
                                    color: "#555555",
                                    margin: [0, 2, 0, 0],
                                  },
                                ]
                              : []),
                          ],
                        },
                        {
                          table: {
                            widths: ["auto", "*"],
                            body: [
                              [
                                {
                                  text: "Invoice No",
                                  fontSize: 7,
                                  color: "#888888",
                                },
                                {
                                  text: invoice.invoiceNumber || "-",
                                  bold: true,
                                  fontSize: 8.5,
                                },
                              ],
                              [
                                { text: "Date", fontSize: 7, color: "#888888" },
                                { text: invoiceDate, fontSize: 8 },
                              ],
                              [
                                {
                                  text: "Bill Type",
                                  fontSize: 7,
                                  color: "#888888",
                                },
                                { text: billLabel, fontSize: 8 },
                              ],
                              [
                                {
                                  text: "GST Bill",
                                  fontSize: 7,
                                  color: "#888888",
                                },
                                {
                                  text: invoice.isGstBill ? "Yes" : "No",
                                  fontSize: 8,
                                },
                              ],
                            ],
                          },
                          layout: noBorder,
                        },
                      ],
                    ],
                  },
                  layout: splitLayout,
                },
              ],

              // ④ ITEMS TABLE ───────────────────────────────────────────────
              [
                {
                  table: {
                    widths: [20, 95, "*", 42, 25, 55, 30, 50, 55],
                    headerRows: 1,
                    body: [itemHeaderRow, ...itemRows],
                  },
                  layout: itemsLayout,
                },
              ],

              // ⑤ TOTALS + WORDS ────────────────────────────────────────────
              [
                {
                  table: {
                    widths: ["55%", "45%"],
                    body: [
                      [
                        {
                          stack: [
                            {
                              text: "Amount in Words",
                              fontSize: 7,
                              color: "#888888",
                              margin: [0, 0, 0, 3],
                            },
                            {
                              text: convertToWords(grandTotal),
                              italics: true,
                              fontSize: 8,
                              color: "#333333",
                            },
                          ],
                        },
                        {
                          table: {
                            widths: ["*", "auto"],
                            body: [
                              [
                                { text: "Subtotal", style: "totalsLabel" },
                                { text: fmt(subtotal), style: "totalsValue" },
                              ],
                              ...gstRows,
                              [
                                {
                                  text: "Grand Total",
                                  bold: true,
                                  fontSize: 9,
                                  alignment: "right",
                                  fillColor: "#111111",
                                  color: "#ffffff",
                                },
                                {
                                  text: `\u20B9 ${fmt(grandTotal)}`,
                                  bold: true,
                                  fontSize: 9,
                                  alignment: "right",
                                  fillColor: "#111111",
                                  color: "#ffffff",
                                },
                              ],
                            ],
                          },
                          layout: totalsLayout,
                        },
                      ],
                    ],
                  },
                  layout: splitLayout,
                },
              ],

              // ⑥ DECLARATION ───────────────────────────────────────────────
              [
                {
                  fillColor: "#fafafa",
                  stack: [
                    {
                      text: "DECLARATION",
                      fontSize: 7,
                      bold: true,
                      color: "#888888",
                      margin: [0, 0, 0, 3],
                    },
                    {
                      text: "We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.",
                      fontSize: 7.5,
                      color: "#444444",
                    },
                  ],
                  margin: [6, 5, 6, 5],
                },
              ],

              // ⑦ BANK + SIGNATURE ──────────────────────────────────────────
              [
                {
                  table: {
                    widths: ["55%", "45%"],
                    body: [
                      [
                        {
                          table: {
                            widths: [55, "*"],
                            body: [
                              [
                                {
                                  text: "Bank Name",
                                  fontSize: 7,
                                  color: "#888888",
                                },
                                { text: bank.bank_name, fontSize: 7.5 },
                              ],
                              [
                                {
                                  text: "Branch",
                                  fontSize: 7,
                                  color: "#888888",
                                },
                                { text: bank.branch_name, fontSize: 7.5 },
                              ],
                              [
                                {
                                  text: "Account No",
                                  fontSize: 7,
                                  color: "#888888",
                                },
                                { text: bank.account_number, fontSize: 7.5 },
                              ],
                              [
                                {
                                  text: "IFSC Code",
                                  fontSize: 7,
                                  color: "#888888",
                                },
                                { text: bank.ifsc_code, fontSize: 7.5 },
                              ],
                              [
                                {
                                  text: "A/C Holder",
                                  fontSize: 7,
                                  color: "#888888",
                                },
                                { text: bank.account_holder, fontSize: 7.5 },
                              ],
                            ],
                          },
                          layout: noBorder,
                        },
                        {
                          stack: [
                            {
                              text: `For ${biz.business_name}`,
                              bold: true,
                              fontSize: 8,
                              alignment: "center",
                              margin: [0, 0, 0, 30],
                            },
                            {
                              canvas: [
                                {
                                  type: "line",
                                  x1: 20,
                                  y1: 0,
                                  x2: 155,
                                  y2: 0,
                                  lineWidth: 0.5,
                                  lineColor: "#555555",
                                },
                              ],
                            },
                            {
                              text:
                                decl.signature_label || "Authorised Signatory",
                              fontSize: 7.5,
                              alignment: "center",
                              margin: [0, 3, 0, 0],
                            },
                          ],
                        },
                      ],
                    ],
                  },
                  layout: splitLayout,
                },
              ],

              // ⑧ FOOTER ────────────────────────────────────────────────────
              [
                {
                  fillColor: "#f5f5f5",
                  text: decl.thank_you_note || "Thank You For Your Business",
                  alignment: "center",
                  fontSize: 7.5,
                  color: "#555555",
                  italics: true,
                  margin: [0, 5, 0, 5],
                },
              ],
            ],
          },
          layout: outerLayout,
        },
      ],
    };
  }
}

module.exports = new PDFService();
