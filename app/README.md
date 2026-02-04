# ERP Billing System - Frontend

A complete ERP Billing System built with Next.js 16, featuring invoice management, customer tracking, and product inventory.

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
- Real-time subtotal, tax, and total calculations
- Invoice status management (Draft, Pending, Paid, Cancelled)
- View invoice details
- Print-friendly invoice layout
- Edit invoice (limited to tax rate and status)
- Delete invoices
- Filter by status

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

For demo purposes, you can login with any email and password combination. The authentication is simplified for development.

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

### Customers

- `GET /api/customers` - Get all customers (with pagination & search)
- `GET /api/customers/:id` - Get customer by ID
- `POST /api/customers` - Create new customer
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

### Products

- `GET /api/products` - Get all products (with pagination & search)
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create new product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `GET /api/products/alerts/low-stock` - Get low stock products

### Invoices

- `GET /api/invoices` - Get all invoices (with pagination & status filter)
- `GET /api/invoices/:id` - Get invoice by ID
- `POST /api/invoices` - Create new invoice
- `PUT /api/invoices/:id` - Update invoice
- `DELETE /api/invoices/:id` - Delete invoice
- `PATCH /api/invoices/:id/status` - Update invoice status

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
- The application uses demo authentication - implement proper JWT authentication for production
- Invoice items cannot be edited after creation (by design to maintain invoice integrity)
- All monetary values are displayed with 2 decimal places
