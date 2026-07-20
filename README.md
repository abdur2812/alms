# AL M.S. TRADERS - Billing System

A full-stack billing and invoicing system for **AL M.S. TRADERS** (auto parts dealer in Urapakkam, Tamil Nadu, India). Built with a Next.js 16 frontend and an Express + MongoDB backend.

## Project Structure

```
billing/
├── backend/          # Express REST API
│   ├── config/       # Business config (shop details, GST, bank info)
│   ├── controllers/  # Route handlers and business logic
│   ├── middleware/    # Error handler & async wrapper
│   ├── models/       # Mongoose schemas
│   ├── routes/       # API route definitions
│   └── index.js      # Server entry point
├── app/              # Next.js 16 frontend (App Router)
│   ├── app/          # Pages and layouts
│   ├── components/   # Reusable UI (DashboardLayout, InvoicePDF, UI)
│   ├── context/      # AuthContext
│   └── lib/          # API client, formatters, business config
└── README.md
```

## Backend (`backend/`)

Express 5 REST API with MongoDB + Mongoose.

### Models

| Model      | Description |
|------------|-------------|
| `Customer` | Individual/business customers with separate permanent & shipping addresses, GST number, and invoice references |
| `Product`  | Inventory items with name, price, GST rate, HSN code, part number, and stock quantity |
| `Invoice`  | Supports both GST tax invoices (`ALMS YY-YY/XXXX`) and non-GST estimates (`EST-XXXX`). Per-item GST, CGST/SGST/IGST, bill type (credit/pay), vehicle number, copy type (original/duplicate), and customer data snapshots |
| `Shop`     | Multi-shop auth with bcrypt password hashing |
| `User`     | App users (admin/demo) |
| `Counter`  | Atomic sequence counter for race-safe invoice number generation per fiscal year (Apr–Mar) |

### Key Backend Features

- **GST-compliant invoice numbering**: Auto-incremented fiscal-year-based format `ALMS 25-26/0001`
- **Atomic counter**: Uses MongoDB `findOneAndUpdate` + `$inc` for unique, race-free ID generation
- **Estimate support**: Non-GST estimates numbered `EST-0001`, convertible to GST invoices
- **Credit/Paid billing**: `billType` field — `"credit"` invoices track amounts owed, `"pay"` invoices deduct stock on create. There is **no `status` field**; billing semantics derive from `billType` + `isGstBill`
- **GST-inclusive pricing**: `unitPrice` already includes GST; `totalAmount` = Σ(qty × unitPrice), and GST is reverse-extracted only for display (CGST/SGST or IGST via `isIgst`)
- **One-time billing**: Supports ad-hoc customers and products without persisting them to the DB (snapshot in invoice)
- **Bulk product import**: `POST /api/products/bulk`
- **Stock PDF report**: `GET /api/products/reports/stock-pdf`
- **Bulk invoice PDF export**: `GET /api/invoices/reports/bulk-pdf`
- **Popular products**: `GET /api/products/popular` (sorted by invoice frequency)
- **Date-range filtering** on invoices
- **Centralized error handling** with custom `AppError` class
- **Counter resync**: Deleted invoices trigger counter re-sync so the next number reuses gaps

### API Endpoints

**Customers:** `GET/POST /api/customers`, `GET/PUT/DELETE /api/customers/:id`, `GET /api/customers/:id/stats`, `GET /api/customers/:id/credit`

**Products:** `GET/POST /api/products`, `GET/PUT/DELETE /api/products/:id`, `PATCH /api/products/:id/stock`, `GET /api/products/popular`, `GET/POST /api/products/bulk`, `GET /api/products/alerts/low-stock`, `GET /api/products/alerts/out-of-stock`, `GET /api/products/reports/stock-pdf`

**Invoices:** `GET/POST /api/invoices`, `GET/PUT/DELETE /api/invoices/:id`, `GET /api/invoices/stats/summary`, `GET /api/invoices/reports/date-range`, `GET /api/invoices/reports/bulk-pdf`, `GET /api/invoices/preview-number`

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
| `/dashboard/invoices/[id]/view` | Invoice detail with print-friendly layout |
| `/dashboard/admin/bulk-products` | Bulk import products |
| `/dashboard/admin/shops` | Shop management |

### Key Frontend Features

- **Invoice PDF generation**: `<InvoicePDF />` React-PDF component with shop logo, customer addresses, itemized GST breakdown, amount-in-words, bank details, and signature block
- **Real-time calculations**: Subtotal, GST, and grand total computed client-side as items are added (GST-inclusive pricing)
- **GST/Estimate toggle**: Create either tax invoices or estimates; estimates can be converted to GST invoices on edit
- **Print-friendly view**: Dedicated invoice view page styled for A4 printing
- **Bulk product import**: Upload multiple products at once
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
- Invoice defaults (currency INR, footer notes, declaration)

## Running Both

```bash
# Terminal 1 - Backend (port 3000)
cd backend && npm run dev

# Terminal 2 - Frontend (port 3001)
cd app && npm run dev
```

## Dependencies

**Backend:** express 5, mongoose 8, bcryptjs, cors, dotenv, nodemon
**Frontend:** next 16, react 19, axios, react-icons, @react-pdf/renderer, tailwindcss 4
