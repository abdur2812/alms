# AL M.S. TRADERS - Billing System

A complete Billing System for AL M.S. TRADERS built with Next.js 16, featuring invoice management, customer tracking, and product inventory.

## Features

### Authentication

- Simple login system (demo mode)
- Protected routes with authentication context
- Session management with localStorage

### Dashboard

- Overview statistics (customers, products, invoices, revenue)
- Recent invoices list
- Low stock product alerts
- Quick action buttons

### Customer Management

- Full CRUD operations (Create, Read, Update, Delete)
- Customer listing with pagination
- Search functionality
- Address management
- View customer's invoice history

### Product Management

- Full CRUD operations
- Product listing with pagination
- Search by name or SKU
- Stock quantity tracking
- Low stock alerts
- Out of stock indicators
- SKU auto-uppercase conversion

### Invoice Management

- Create invoices with multiple line items
- Select customers and products from dropdown
- Auto-calculate prices from products
- Real-time subtotal, GST, and total calculations
- GST/Estimate toggle: create tax invoices or estimates; estimates can be converted to GST invoices on edit
- View invoice details with dynamic UPI QR (amount-embedded, `upi://pay` with `almstraders2017-5@okaxis`) and total qty footer under Qty
- Print-friendly invoice layout (A4) with on-demand QR generation
- Edit invoice (items, tax rate, HSN, bill type, copy type)
- Duplicate an existing invoice into a new draft
- Delete invoices
- Filter by GST vs estimate and by bill type (pay/credit)

### Staff Management

- Staff list (name, phone, role, daily wage) with search and CRUD; per-row calendar icon to report
- Daily attendance: per-day present/half/absent segmented control (active staff only, debounced auto-save, fixed date navigation with prev/next + `input[type=date]` + Today) — one record per staff per day (UTC-midnight)
- **Salary is daily, paid weekly**: each staff earns `dailyWage` per present day (`half` = 0.5× wage); weekly credit `((presentDays + 0.5*halfDays) × dailyWage)` settled weekly via mark paid/unpaid (status synced to `present` boolean)
- Individual staff report: big month calendar `app/app/dashboard/staff/[id]/report` (green=present/amber=half/red=absent, blue ring=paid week), click date to cycle status via `POST /api/staff/attendance/daily`, report below shows present/half/absent/paidDays/salaryPaid/totalSalary
- Tab synced to URL (`?tab=attendance`) so it survives page reloads

### Purchases & Vendors

- Vendor management (add, edit, delete, search by name/GST/bank/IFSC) with `gstNumber` (uppercase) and `bankDetails` (accountHolder, bankName, branchName, accountNumber, ifscCode)
- Purchase invoices with optional vendor link and cheque tracking (Pending / Cleared / Bounced, cheque amount, passed date), auto `PUR-XXXX` number, paginated 5/page with S.No descending like `purchaseNumber`
- Per-vendor purchase reports: `GET /api/purchases/reports/monthly?month=YYYY-MM&vendorId&startDate&endDate` — simple PDF without shop header, columns `S.No | Date | Invoice No | Amount | Cheque Details (wider 29%) | Cheque Amt | Status | Passed Date` (Date/Invoice/Passed shrunk), vendor header + bank, per-row Report icon to `/dashboard/purchases/report?vendorId=...`, Generate button only (no auto preview)

### Accounts & Revenue

- Accounts: financial overview with date-range filtering (sales by `createdAt`, purchases by `date`, expenses by `date`, staff payments by `paidAt`, `netBalance`), HSN summary, purchase/expenses/salaries breakdowns
- Expenses: general expenses with `date`/`description`/`category`/`amount`/`paidBy`, category selectable from managed `ExpenseCategory` list (`Manage Categories` in Accounts → Expenses), auto-seeded defaults (Utilities, Maintenance, Stationery, Miscellaneous, Rent, Salary, Fuel, Transport)
- Revenue: revenue insights by date range (daily trend, top customers, top products)

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS 4
- **State Management**: React Context API
- **HTTP Client**: Axios
- **Icons**: React Icons (Feather Icons)
- **PDF**: @react-pdf/renderer + qrcode (dynamic UPI QR)
- **Backend API**: Express.js with MongoDB

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Backend server running on `http://localhost:3000`

### Installation

1. Navigate to the app directory:

```bash
cd app
```

2. Install dependencies:

```bash
npm install
```

3. Configure environment variables:
   Create a `.env.local` file with:

```
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

4. Start the development server:

```bash
npm run dev
```

5. Open your browser and visit `http://localhost:3001`

### Login

Demo auth via `AuthContext`: login with `alms@gmail.com` / `alms`. The session is kept in localStorage.

## Project Structure

```
app/
├── app/
│   ├── dashboard/
│   │   ├── customers/
│   │   │   ├── [id]/
│   │   │   │   └── page.js (Edit Customer)
│   │   │   ├── new/
│   │   │   │   └── page.js (New Customer)
│   │   │   └── page.js (Customer List)
│   │   ├── products/
│   │   │   ├── [id]/
│   │   │   │   └── page.js (Edit Product)
│   │   │   ├── new/
│   │   │   │   └── page.js (New Product)
│   │   │   └── page.js (Product List)
│   │   ├── invoices/
│   │   │   ├── [id]/
│   │   │   │   ├── view/
│   │   │   │   │   └── page.js (View Invoice — dynamic UPI QR, total qty)
│   │   │   │   └── page.js (Edit Invoice)
│   │   │   ├── new/
│   │   │   │   └── page.js (New Invoice)
│   │   │   └── page.js (Invoice List)
│   │   ├── staff/
│   │   │   ├── [id]/
│   │   │   │   ├── report/page.js (Big calendar + report)
│   │   │   │   └── page.js (Edit Staff)
│   │   │   ├── new/page.js (New Staff)
│   │   │   └── page.js (Staff List + Attendance (present/half/absent) + Report link)
│   │   ├── purchases/
│   │   │   ├── [id]/
│   │   │   │   ├── edit/page.js (Edit Purchase)
│   │   │   │   └── view/page.js (View Purchase — vendor GST/bank)
│   │   │   ├── new/page.js (New Purchase)
│   │   │   ├── report/page.js (Per-vendor report, vendor+month/range, Generate only)
│   │   │   └── page.js (Purchase Invoices 5/page + Vendors with GST/bank + Report per vendor)
│   │   ├── accounts/page.js (Financial Overview + Expenses with categories + HSN)
│   │   ├── revenue/page.js (Revenue Insights)
│   │   ├── admin/
│   │   │   ├── bulk-products/page.js (Bulk Import)
│   │   │   └── shops/page.js (Shop Management)
│   │   ├── layout.js (Dashboard Layout Wrapper)
│   │   └── page.js (Dashboard Home)
│   ├── login/
│   │   └── page.js (Login Page)
│   ├── globals.css
│   ├── layout.js (Root Layout)
│   └── page.js (Home - Redirects to Login/Dashboard)
├── components/
│   ├── DashboardLayout.js (Sidebar Navigation)
│   ├── InvoicePDF.js (React-PDF Invoice — dynamic UPI QR, total qty)
│   ├── PurchaseReportPDF.js (Simplified per-vendor, no shop header)
│   ├── DateRangePicker.js
│   └── UI.js (PageHeader, Card, Button, Input, Select, Dropdown, etc.)
├── context/
│   └── AuthContext.js (Authentication State)
├── lib/
│   ├── api.js (API Client & Endpoints — customers, products, invoices, staff, vendors, purchases, expenses, expenseCategories, upi)
│   ├── formatters.js
│   ├── businessConfig.js (shop + bank + UPI `almstraders2017-5@okaxis`)
│   └── upi.js (buildUpiUri, generateUpiQrForInvoice)
├── .env.local
└── package.json
```

## API Endpoints Used

The API client lives in `lib/api.js` (`customersAPI`, `productsAPI`, `invoicesAPI`, `staffAPI`, `vendorsAPI`, `purchasesAPI`, `expensesAPI`, `expenseCategoriesAPI`). Key endpoints:

### Customers

- `GET /api/customers` - List (pagination, search by name/phone)
- `GET /api/customers/:id` - Get by ID
- `POST /api/customers` - Create
- `PUT /api/customers/:id` - Update
- `DELETE /api/customers/:id` - Delete
- `GET /api/customers/:id/stats` - Stats (paid/pending counts derived from `billType`)
- `GET /api/customers/:id/credit` - Credit summary

### Products

- `GET /api/products` - List (pagination, search by name/description)
- `GET /api/products/popular` - Sorted by invoice frequency (used to seed the item dropdown)
- `GET /api/products/:id` - Get by ID
- `POST /api/products` - Create
- `PUT /api/products/:id` - Update
- `DELETE /api/products/:id` - Delete
- `PATCH /api/products/:id/stock` - Adjust stock
- `GET /api/products/alerts/low-stock` / `out-of-stock` - Alerts
- `POST /api/products/bulk` - Bulk import

### Invoices

- `GET /api/invoices` - List (pagination, search, GST/estimate & bill-type filters)
- `GET /api/invoices/:id` - Get by ID
- `POST /api/invoices` - Create
- `PUT /api/invoices/:id` - Update (can convert estimate -> GST invoice)
- `DELETE /api/invoices/:id` - Delete (resyncs counter)
- `GET /api/invoices/preview-number` - Next GST number (live header)
- `GET /api/invoices/stats/summary`, `/reports/date-range`, `/reports/bulk-pdf`

> Note: Invoices have **no `status` field**. Use `billType` (`pay`/`credit`) and `isGstBill` (`true`/`false`) to filter/classify. Prices are **GST-inclusive**.

### Staff

- `GET/POST /api/staff` - List (paginated, searchable) / Create
- `GET/PUT/DELETE /api/staff/:id` - Get / Update / Delete (soft delete preserves history)
- `GET /api/staff/attendance/daily?date=` - Get attendance for a date (all active staff) — now returns `status` `present/half/absent`
- `POST /api/staff/attendance/daily` - Bulk upsert attendance for a date (`status` preferred, `present` legacy)
- `GET /api/staff/payments/weekly?weekStart&weekEnd` - Weekly salary credit per staff (`presentDays` + `halfDays` + `absentDays`, `total` = `(present+0.5*half)*dailyWage`)
- `POST /api/staff/payments/weekly` - Mark a week paid (upserts a `StaffPayment` with `halfDays`)
- `DELETE /api/staff/payments/weekly` - Mark a week unpaid
- `GET /api/staff/payments` - Salary payment history (used by Accounts)
- `GET /api/staff/:id/calendar?month=YYYY-MM&startDate&endDate` - Individual calendar: attendance + overlapping weekly payments for big calendar (click to cycle status)

> Salary is **daily** (attendance-based, `dailyWage` per present day, `half` = 0.5×); the weekly figure is only the **credit** owed, paid weekly.

### Vendors

- `GET/POST /api/vendors` - List (paginated, searchable by name/GST/bank/IFSC) / Create (with `gstNumber` + `bankDetails`)
- `GET/PUT/DELETE /api/vendors/:id` - Get / Update / Delete

### Purchases

- `GET/POST /api/purchases` - List (paginated 5/page, S.No descending, searchable, date-filterable) / Create (`PUR-XXXX` auto)
- `GET/PUT/DELETE /api/purchases/:id` - Get / Update / Delete
- `GET /api/purchases/preview-number` - Next `PUR-XXXX`
- `GET /api/purchases/reports/monthly?month=YYYY-MM&vendorId&startDate&endDate` - Per-vendor (or all) report, `startDate`/`endDate` range takes precedence over `month`
- Cheque tracking via `chequeStatus` (`Pending`/`Cleared`/`Bounced`), `chequeDetails`, `chequeAmount`, `passedDate`; optional `vendorId` reference.

### Expenses

- `GET/POST /api/expenses` - List (paginated, date/category filtered) / Create (category from `ExpenseCategory`)
- `GET/PUT/DELETE /api/expenses/:id` - Get / Update / Delete
- `GET/POST /api/expense-categories` - List / Create categories
- `PUT/DELETE /api/expense-categories/:id` - Update / Delete categories (seeded defaults: Utilities, Maintenance, Stationery, Miscellaneous, Rent, Salary, Fuel, Transport)

## Features in Detail

### Responsive Design

- Mobile-friendly navigation with hamburger menu
- Responsive tables and forms
- Optimized for desktop and mobile devices

### User Experience

- Loading states with spinners
- Error handling with user-friendly messages
- Form validation
- Confirmation dialogs for destructive actions
- Success feedback

### Invoice Features

- Dynamic line items (add/remove)
- Auto-fill product prices
- Real-time calculations (GST-inclusive, total qty footer)
- Print-friendly layout with dynamic UPI QR (`almstraders2017-5@okaxis`)
- Status badge indicators
- Quick status updates

### Dashboard Analytics

- Total customers count
- Total products count
- Total invoices count
- Total revenue (from paid invoices)
- Recent invoices preview
- Low stock alerts

## Future Enhancements

- Real authentication with JWT
- User roles and permissions
- Email notifications
- Advanced reporting and analytics (revenue/accounts already have date-range views)
- General expenses backend (Accounts currently has no expense source)
- Multi-currency support
- More bulk operations

## Development

```bash
# Development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## Notes

- Make sure the backend server is running before starting the frontend
- Auth is demo-only (`AuthContext` + localStorage); implement proper JWT for production
- Invoice items are fully editable on the edit page (and via "duplicate" to seed a new draft)
- All monetary values are formatted as INR with `formatINR` in `lib/formatters.js`
- HSN codes are selected from a fixed dropdown of common auto-parts HSNs on the invoice item form

// Todo
a5 size estimate
accounts reports (opening, closing stock)

estimate creation from left side bar. new estimate.
Bill Type Cash Bill
GST Bill No
Vehicle No -



Accounts, monthly filtering, Accounts report, expenses, Hsn code addition.

Purchase, vendors, individual vendor report. 

Staff, individual staff report, attendance

Invoice copy.