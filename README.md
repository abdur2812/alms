# AL M.S. TRADERS - Billing System

A full-stack billing and invoicing system for **AL M.S. TRADERS** (auto parts dealer in Urapakkam, Tamil Nadu, India). Built with a Next.js 16 frontend and an Express + MongoDB backend.

## Project Structure

```
billing/
├── backend/          # Express REST API
│   ├── config/       # Business config (shop details, GST, bank info, UPI)
│   ├── controllers/  # Route handlers and business logic
│   ├── middleware/    # Error handler & async wrapper
│   ├── models/       # Mongoose schemas
│   ├── routes/       # API route definitions
│   ├── utils/        # UPI helpers
│   └── index.js      # Server entry point
├── app/              # Next.js 16 frontend (App Router)
│   ├── app/          # Pages and layouts
│   ├── components/   # Reusable UI (DashboardLayout, InvoicePDF, PurchaseReportPDF, UI)
│   ├── context/      # AuthContext
│   └── lib/          # API client, formatters, business config, UPI helpers
└── README.md
```

## Backend (`backend/`)

Express 5 REST API with MongoDB + Mongoose.

### Models

| Model | Description |
|-------|-------------|
| `Customer` | Individual/business customers with separate permanent & shipping addresses, GST number, and invoice references |
| `Product` | Inventory items with name, price, GST rate, HSN code, part number, and stock quantity |
| `Invoice` | Supports both GST tax invoices (`ALMS YY-YY/XXXX`) and non-GST estimates (`EST-XXXX`). Per-item GST, CGST/SGST/IGST, bill type (credit/pay), vehicle number, copy type (original/duplicate), and customer data snapshots |
| `Staff` | Staff members with daily wage, role, phone, and active status |
| `Attendance` | One attendance record per staff per day (UTC-midnight, unique `{staffId, date}`) with `status` enum `present`/`half`/`absent` (legacy `present` boolean synced) |
| `StaffPayment` | Weekly salary credit settlement per staff (keyed by `{staffId, weekStart}`) with `presentDays`, `halfDays`, `amount`, `paidAt` |
| `Vendor` | Suppliers/vendors with name, phone, address, `gstNumber` (uppercase), and `bankDetails` (`accountHolder`, `bankName`, `branchName`, `accountNumber`, `ifscCode` uppercase) |
| `Purchase` | Purchase invoices with auto `purchaseNumber` (`PUR-XXXX`), manual `invoiceNumber`, optional `vendorId`, `date`, `amount`, and cheque tracking (status: Pending/Cleared/Bounced) |
| `Expense` | General business expenses with `date`, `description`, `category` (string, selectable from categories), `amount`, `paidBy` |
| `ExpenseCategory` | Expense categories with `name` (unique, case-insensitive) and `description`; seeded defaults (Utilities, Maintenance, Stationery, Miscellaneous, Rent, Salary, Fuel, Transport) |
| `Shop` | Multi-shop auth with bcrypt password hashing |
| `User` | App users (admin/demo) |
| `Counter` | Atomic sequence counter for race-safe invoice/purchase number generation per fiscal year (Apr–Mar) and `pur`/`est` |

### Key Backend Features

- **GST-compliant invoice numbering**: Auto-incremented fiscal-year-based format `ALMS 25-26/0001`
- **Atomic counter**: Uses MongoDB `findOneAndUpdate` + `$inc` for unique, race-free ID generation
- **Estimate support**: Non-GST estimates numbered `EST-0001`, convertible to GST invoices
- **Credit/Paid billing**: `billType` field — `"credit"` invoices track amounts owed, `"pay"` invoices deduct stock on create. There is **no `status` field**; billing semantics derive from `billType` + `isGstBill`
- **GST-inclusive pricing**: `unitPrice` already includes GST; `totalAmount` = Σ(qty × unitPrice), and GST is reverse-extracted only for display (CGST/SGST or IGST via `isIgst`)
- **One-time billing**: Supports ad-hoc customers and products without persisting them to the DB (snapshot in invoice)
- **Dynamic UPI QR**: `upi://pay?pa=...&pn=...&am=...&cu=INR&tr=...&tn=...` built from `businessConfig.upi.id` (`almstraders2017-5@okaxis`) and `Math.round(grandTotal)`; QR generated via `qrcode` (`app/lib/upi.js` + `backend/utils/upi.js`)
- **Invoice PDF total qty**: Footer row under Qty column shows Σ `quantity` across all items
- **Bulk product import**: `POST /api/products/bulk`
- **Stock PDF report**: `GET /api/products/reports/stock-pdf`
- **Bulk invoice PDF export**: `GET /api/invoices/reports/bulk-pdf`
- **Popular products**: `GET /api/products/popular` (sorted by invoice frequency)
- **Date-range filtering** on invoices
- **Daily attendance & half-day salary**: per-staff `status` (`present` full wage, `half` 0.5× wage, `absent` 0), one `Attendance` record per staff per day, weekly salary computed server-side as credit `((presentDays + 0.5*halfDays) × dailyWage)` and settled weekly via `StaffPayment` (`halfDays` stored)
- **Individual staff calendar**: `GET /api/staff/:id/calendar?month=YYYY-MM&startDate&endDate` returns attendance + overlapping weekly payments for big calendar
- **Purchases & vendors (enhanced)**: vendor CRUD now includes `gstNumber` + `bankDetails`; purchase invoices paginated 5/page, S.No descending like `purchaseNumber`; vendor `bankDetails`/`gstNumber` searchable
- **Per-vendor purchase reports**: `GET /api/purchases/reports/monthly?month=YYYY-MM&vendorId&startDate&endDate` — `vendorId` optional, `startDate`/`endDate` range takes precedence over `month`; returns vendor header and `vendor` object for PDF; simple PDF without shop header/colors/signature, columns `S.No | Date | Invoice No | Amount | Cheque Details (22-29% wider) | Cheque Amt | Status | Passed Date`, shrunk Date/Invoice/Passed to expand Cheque Details, single 0.5pt dividers, no square vendor box
- **Expense categories**: `ExpenseCategory` CRUD (`GET/POST /api/expense-categories`, `PUT/DELETE /api/expense-categories/:id`), auto-seeded; `Expense` category selectable from managed list
- **Centralized error handling** with custom `AppError` class
- **Counter resync**: Deleted invoices/purchases trigger counter re-sync so the next number reuses gaps

### API Endpoints

**Customers:** `GET/POST /api/customers`, `GET/PUT/DELETE /api/customers/:id`, `GET /api/customers/:id/stats`, `GET /api/customers/:id/credit`

**Products:** `GET/POST /api/products`, `GET/PUT/DELETE /api/products/:id`, `PATCH /api/products/:id/stock`, `GET /api/products/popular`, `GET/POST /api/products/bulk`, `GET /api/products/alerts/low-stock`, `GET /api/products/alerts/out-of-stock`, `GET /api/products/reports/stock-pdf`

**Invoices:** `GET/POST /api/invoices`, `GET/PUT/DELETE /api/invoices/:id`, `GET /api/invoices/stats/summary`, `GET /api/invoices/reports/date-range`, `GET /api/invoices/reports/bulk-pdf`, `GET /api/invoices/preview-number`

**Staff:** `GET/POST /api/staff`, `GET/PUT/DELETE /api/staff/:id`, `GET/POST /api/staff/attendance/daily`, `GET /api/staff/payments/weekly`, `POST /api/staff/payments/weekly` (mark paid), `DELETE /api/staff/payments/weekly` (mark unpaid), `GET /api/staff/payments`, `GET /api/staff/:id/calendar?month&startDate&endDate`

**Vendors:** `GET/POST /api/vendors`, `GET/PUT/DELETE /api/vendors/:id`

**Purchases:** `GET/POST /api/purchases`, `GET/PUT/DELETE /api/purchases/:id`, `GET /api/purchases/preview-number`, `GET /api/purchases/reports/monthly?month=YYYY-MM&vendorId&startDate&endDate`

**Expenses:** `GET/POST /api/expenses`, `GET/PUT/DELETE /api/expenses/:id` (date/category filtered)

**Expense Categories:** `GET/POST /api/expense-categories`, `PUT/DELETE /api/expense-categories/:id`

**Shops/Auth:** `POST /api/shops/login`, `GET/POST /api/shops`, `GET/PUT/DELETE /api/shops/:id`

### Backend Setup

```bash
cd backend
npm install
# Set MONGODB_URI in .env
npm run dev    # nodemon
npm start      # production
```

## Frontend (`app/`)

Next.js 16 (App Router) + Tailwind CSS 4 + Axios.

### Pages

| Route | Description |
|-------|-------------|
| `/login` | Demo auth (admin: `alms@gmail.com` / `alms`) |
| `/dashboard` | Home with stats, recent invoices, low-stock alerts |
| `/dashboard/customers` | Customer list (paginated, searchable) |
| `/dashboard/customers/new` | Create customer |
| `/dashboard/customers/[id]` | Edit customer |
| `/dashboard/products` | Product list (paginated, searchable) |
| `/dashboard/products/new` | Create product |
| `/dashboard/products/[id]` | Edit product |
| `/dashboard/invoices` | Invoice list (filtered by GST/estimate & bill type, paginated) |
| `/dashboard/invoices/new` | Create invoice (dynamic line items, HSN dropdown, auto-calculated GST-inclusive totals) |
| `/dashboard/invoices/[id]/edit` | Edit invoice (items, tax rate, HSN, bill type, copy type) |
| `/dashboard/invoices/[id]/view` | Invoice detail with dynamic UPI QR (amount-embedded) + total qty footer |
| `/dashboard/staff` | Staff list + simple daily attendance (present/half/absent, active staff only, debounced auto-save, fixed date navigation) — weekly salary UI removed |
| `/dashboard/staff/new`, `/dashboard/staff/[id]` | Create/edit staff (name, phone, role, daily wage) |
| `/dashboard/staff/[id]/report` | Individual staff big calendar (month nav, green=present/amber=half/red=absent, blue ring=paid, click date to cycle status) + report below (present/half/absent/paidDays/salaryPaid/totalSalary) |
| `/dashboard/purchases` | Purchase invoices (5/page, S.No descending like `PUR-XXXX`, searchable) + vendor management (GST + bank details, per-vendor Report button) |
| `/dashboard/purchases/report` | Per-vendor purchase report (vendor dropdown + month shortcut + startDate/endDate range, Generate button only — no auto preview, vendor header + bank, simple PDF) |
| `/dashboard/purchases/new`, `/dashboard/purchases/[id]/edit`, `/dashboard/purchases/[id]/view` | Create/edit/view purchase with cheque tracking; view shows vendor GST/bank when available |
| `/dashboard/accounts` | Financial overview (sales, salary payments, date-range filtered) + general expenses with manageable categories (create/edit/delete, selectable on expense form) |
| `/dashboard/revenue` | Revenue insights by date range (daily trend, top customers/products) |
| `/dashboard/admin/bulk-products` | Bulk import products |
| `/dashboard/admin/shops` | Shop management |

### Key Frontend Features

- **Invoice PDF generation**: `<InvoicePDF />` React-PDF component with shop logo, customer addresses, itemized GST breakdown, total qty footer row under Qty, dynamic UPI QR (via `qrcode`, `upi://pay` with `pa=almstraders2017-5@okaxis`), amount-in-words, bank details, and signature block
- **Purchase Report PDF**: `<PurchaseReportPDF />` simplified — no shop header/logos/colors/signature, just bordered vendor name, 8-col table `S.No | Date | Invoice | Amount | Cheque Details (wider) | Cheque Amt | Status | Passed` (Date/Invoice/Passed shrunk, Cheque Details expanded), single 0.5pt dividers
- **Real-time calculations**: Subtotal, GST, and grand total computed client-side as items are added (GST-inclusive pricing)
- **GST/Estimate toggle**: Create either tax invoices or estimates; estimates can be converted to GST invoices on edit
- **Print-friendly view**: Dedicated invoice view page styled for A4 printing with on-demand QR generation (preview via `generateUpiQrForInvoice`, download via `pdf().toBlob` with `qrDataUrl`)
- **Bulk product import**: Upload multiple products at once
- **Staff attendance (redesigned)**: per-day present/half/absent segmented control, active-staff only, fixed date navigation (prev/next + `input[type=date]` + Today), auto-save debounced, `half` = 0.5× wage
- **Staff calendar report**: big month grid per staff, click date to cycle status (present→half→absent), paid ring from weekly `StaffPayment`, summary below (present/half/absent/paidDays/salaryPaid/totalSalary)
- **Purchases & vendors (enhanced)**: vendor GST + bankDetails CRUD, searchable (name/GST/bank/IFSC), purchase list 5/page descending S.No, per-vendor `Report` icon in Actions, report page vendor+date filtered
- **Expense categories**: manage categories (add/edit/delete) in Accounts → Expenses → Manage Categories, then choose category in Add Expense dropdown (dynamic from `expenseCategoriesAPI`)
- **Responsive sidebar**: Collapsible navigation with mobile hamburger menu
- **External links**: E-Way Bill portal shortcut in sidebar
- **State management**: React Context API for auth

### Frontend Setup

```bash
cd app
npm install
# Set NEXT_PUBLIC_API_URL in .env.local (default: https://alms-billing.duckdns.org)
npm run dev      # runs on port 3001
npm run build    # production build
```

## Business Configuration

`backend/config/business.js` and `app/lib/businessConfig.js` contain:

- Shop name, address, phone, GSTIN
- Bank account details (HDFC, Urapakkam)
- UPI ID (`almstraders2017-5@okaxis`) for dynamic QR
- Invoice defaults (currency INR, footer notes, declaration)

## Running Both

```bash
# Terminal 1 - Backend (port 3000)
cd backend && npm run dev

# Terminal 2 - Frontend (port 3001)
cd app && npm run dev
```

## Dependencies

**Backend:** express 5, mongoose 8, bcryptjs, cors, dotenv, nodemon, qrcode
**Frontend:** next 16, react 19, axios, react-icons, @react-pdf/renderer, qrcode, tailwindcss 4
