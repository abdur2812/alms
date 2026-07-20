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
- View invoice details
- Print-friendly invoice layout (A4)
- Edit invoice (items, tax rate, HSN, bill type, copy type)
- Duplicate an existing invoice into a new draft
- Delete invoices
- Filter by GST vs estimate and by bill type (pay/credit)

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS 4
- **State Management**: React Context API
- **HTTP Client**: Axios
- **Icons**: React Icons (Feather Icons)
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
│   │   │   │   │   └── page.js (View Invoice)
│   │   │   │   └── page.js (Edit Invoice)
│   │   │   ├── new/
│   │   │   │   └── page.js (New Invoice)
│   │   │   └── page.js (Invoice List)
│   │   ├── layout.js (Dashboard Layout Wrapper)
│   │   └── page.js (Dashboard Home)
│   ├── login/
│   │   └── page.js (Login Page)
│   ├── globals.css
│   ├── layout.js (Root Layout)
│   └── page.js (Home - Redirects to Login/Dashboard)
├── components/
│   └── DashboardLayout.js (Sidebar Navigation)
├── context/
│   └── AuthContext.js (Authentication State)
├── lib/
│   └── api.js (API Client & Endpoints)
├── .env.local
└── package.json
```

## API Endpoints Used

The API client lives in `lib/api.js` (`customersAPI`, `productsAPI`, `invoicesAPI`). Key endpoints:

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
- Real-time calculations
- Print-friendly layout
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
- Invoice PDF generation
- Email notifications
- Advanced reporting and analytics
- Payment tracking
- Multi-currency support
- Bulk operations

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
