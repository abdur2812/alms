# AL M.S. TRADERS Billing System

## Project Structure
- `backend/` — Express 5 REST API (port 3000, MongoDB + Mongoose 8)
- `app/` — Next.js 16 App Router frontend (port 3001, Tailwind CSS 4, Axios)

## Commands
- **Backend:** `cd backend && npm run dev` (nodemon) / `npm start` (production)
- **Frontend:** `cd app && npm run dev` (port 3001) / `npm run build` / `npm run lint`

## Key Conventions
- Backend uses `asyncHandler` wrapper + custom `AppError` class; every controller wraps route logic in `asyncHandler`
- Mongoose virtuals used for computed fields (`subtotal`, `gstAmount`, `grandTotal`); always set `toJSON: { virtuals: true }`
- **Prices are GST-INCLUSIVE.** `unitPrice` already contains GST. The stored `totalAmount` = sum of `qty * unitPrice`; GST is *reverse-extracted* (base = price / (1 + gst/100)) only for display/splitting. Do NOT add GST on top of `unitPrice`.
- Invoice numbering: GST bills use `ALMS YY-YY/XXXX`, estimates use `EST-XXXX`; generate via `Invoice.generateInvoiceNumber()` / `generateEstimateNumber()`, preview via `peekNextInvoiceNumber()` / `peekNextEstimateNumber()`
- Atomic `Counter` model (`findOneAndUpdate` + `$inc`) for race-safe invoice/estimate ID generation; counter id `inv-<FYseries>` (GST) and `est` (estimates)
- On delete, call `Invoice.syncCounterAfterDelete()` to resync counters so the next number reuses gaps
- Business config (shop details, GSTIN, bank info) in `backend/config/business.js` and `app/lib/businessConfig.js` — keep these in sync
- Frontend uses React Context (`AuthContext`) for demo auth (admin: `alms@gmail.com` / `alms`)
- API client in `app/lib/api.js` — functions grouped by resource: `customersAPI`, `productsAPI`, `invoicesAPI`, `staffAPI`, `vendorsAPI`, `purchasesAPI`
- Search inputs are regex-escaped in controllers (`escapeRegex`) to prevent ReDoS/injection
- No formal test suite; manual testing via curl/Postman/Thunder Client

## Staff & Salary Conventions
- **Salary is DAILY, paid weekly.** Each staff member has a `dailyWage`; the daily salary total = Σ `dailyWage` of present staff for that date (attendance-based). The **weekly salary is only credit** (per staff: `presentDays × dailyWage`) that is settled weekly.
- One `Attendance` record per staff per day (dates stored as UTC-midnight, unique index `{staffId, date}`). Saved in bulk via `POST /api/staff/attendance/daily`; saved per-staff `status` enum `present`/`half`/`absent` (legacy `present` boolean synced via pre-validate). `half` = 0.5× wage.
- Weekly credit is computed server-side from Attendance records (`GET /api/staff/payments/weekly?weekStart&weekEnd`) as `((presentDays + 0.5*halfDays) × dailyWage)`. `StaffPayment` stores `presentDays`, `halfDays`, `amount`, `paidAt`. **Always reload it after an attendance save** — the Staff page does this via `loadSalary(weekStart)` after `saveDailyAttendance` (now removed from attendance tab; still used in report).
- Marking a week paid upserts a `StaffPayment` record (keyed by `{staffId, weekStart}`); unmarking deletes it. Payments are credit settlements only.
- The Staff page tabs are synced to the URL (`?tab=attendance`) so the active tab survives a page reload.
- **Attendance tab redesigned:** shows only active staff in shop, 3-state segmented control `Present`/`Half`/`Absent`, debounced auto-save, fixed date navigation (prev/next + `input[type=date]` + Today) — weekly salary UI removed. Date header uses white card with `formatWeekday`, not broken cyan input.
- **Individual staff calendar:** `GET /api/staff/:id/calendar?month=YYYY-MM&startDate&endDate` returns attendance + overlapping weekly payments for big calendar. Report page `app/app/dashboard/staff/[id]/report` shows month nav, big grid (green=present/amber=half/red=absent, blue ring=paid), click date to cycle status (`present→half→absent`) via `POST /api/staff/attendance/daily` for that single staff/date, and report below (present/half/absent/paidDays/salaryPaid/totalSalary). Staff list has per-row calendar icon linking to report.

## Purchases & Vendors Conventions
- `Vendor` model: name (required), phone, address, `gstNumber` (uppercase), and `bankDetails` (`accountHolder`, `bankName`, `branchName`, `accountNumber`, `ifscCode` uppercase). `Purchase` model: `purchaseNumber` auto `PUR-XXXX` (atomic Counter `pur`), `invoiceNumber` (required, manual), optional `vendorId` (may be null), `date`, `amount`, and cheque tracking (`chequeDetails`, `chequeAmount`, `chequeStatus`, `passedDate`).
- Cheque status enum: `"Pending"` | `"Cleared"` | `"Bounced"`.
- `Purchase` populates `vendorId` (name/phone/address/gstNumber/bankDetails); the list uses `vendorId?.name` directly. Vendor search includes `gstNumber`/`bankDetails` fields.
- Purchase list: paginated 5/page, S.No descending like `purchaseNumber` (`S.No = filtered.length - globalIndex`), sorted by `purchaseNumber` numeric descending; searchable by `purchaseNumber`/`invoiceNumber`.
- There **is** a backend for general expenses: `Expense` model + `GET/POST/PUT/DELETE /api/expenses` (date/category filtered). Expense categories via `ExpenseCategory` model (`GET/POST /api/expense-categories`, `PUT/DELETE /api/expense-categories/:id`), auto-seeded defaults (Utilities, Maintenance, Stationery, Miscellaneous, Rent, Salary, Fuel, Transport); `Expense` `category` selectable from managed list in Accounts → Expenses → Manage Categories. The Accounts page (`/dashboard/accounts`) loads a single aggregated summary from `GET /api/accounts/summary?startDate&endDate` which returns sales (invoices by `createdAt`), purchases (by `date`), expenses (by `date`) and staff salary payments (by `paidAt`), plus `netBalance = sales − purchases − expenses − staff`. Purchase "paid" = cleared cheques, "credit" = pending cheques.
- **Per-vendor purchase reports:** `GET /api/purchases/reports/monthly?month=YYYY-MM&vendorId&startDate&endDate` — `vendorId` optional, `startDate`/`endDate` range takes precedence over `month`; returns vendor header and `vendor` object for PDF; simple PDF without shop header/colors/signature, columns `S.No | Date | Invoice No | Amount | Cheque Details (wider 29%) | Cheque Amt | Status | Passed Date`, shrunk Date/Invoice/Passed to expand Cheque Details, single 0.5pt dividers, no square vendor box. Vendor list has per-row `Report` icon linking to `/dashboard/purchases/report?vendorId=...`; global report button removed. Report page requires `Generate Report` click (no auto preview), shows vendor header/bank, handles month shortcut + start/end range.

## Architecture Notes
- Invoice items snapshot product data (name, price, GST, HSN) at creation time; `productId` can be `null` for one-time products
- There is **NO `status` field** on the Invoice model. Billing semantics come from `billType`: `"pay"` (cash sale, deducts stock on create) vs `"credit"` (tracks amount owed). Revenue/totals are computed off `billType`, not a status string. (The edit page still renders a vestigial "Payment Status" dropdown in `app/app/dashboard/invoices/[id]/page.js`, but it is NOT persisted to the model — ignore it when wiring logic.)
- `isIgst` (boolean) switches between CGST/SGST (intra-state) and IGST (inter-state) display
- `copyType`: `"original"` | `"duplicate"`
- One-time billing: invoices can embed `customerData` inline without creating a Customer record; `customerId` may be null
- Estimates (`isGstBill: false`) get an `EST-XXXX` number immediately; they can be converted to GST invoices on PUT (triggers `generateInvoiceNumber()` + sets `numberAssignedAt`). `numberAssignedAt` also drives list ordering.
- `preview-number` endpoint returns the next GST number live (used on the New Invoice page header)
- PDF generation uses `@react-pdf/renderer` in `app/components/InvoicePDF.js` (dynamic UPI QR via `qrcode` + `app/lib/upi.js`/`backend/utils/upi.js`, total qty footer row under Qty) and `app/components/PurchaseReportPDF.js` (simplified per-vendor, no shop header)
- Bulk import: `POST /api/products/bulk`
- Reusable UI: `app/components/UI.js` exports `Dropdown` (debounced async search with race-condition guard), `NumberInput`, `PageHeader`, etc. Prefer these over ad-hoc inputs.

## ENV / URLs
- Backend `MONGODB_URI` + `PORT=3000` (+ `CORS_ORIGIN`) in `backend/.env`
- Frontend `NEXT_PUBLIC_API_URL` in `app/.env.local` (default `https://alms-billing.duckdns.org`); `app/lib/api.js` falls back to that default if unset. Local dev: `http://localhost:3000/api`
