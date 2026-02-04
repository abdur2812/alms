# ERP Billing System - Complete Implementation Guide

## Overview

This is a complete ERP billing system with Indian GST compliance, user management, and bulk product import features. The system uses Next.js 16 for the frontend and Express.js with MongoDB for the backend.

## Features Implemented

### 1. Indian GST System

- **IGST (Integrated GST)**: For interstate transactions
- **CGST + SGST (Central + State GST)**: For intrastate transactions
- Toggle between IGST and CGST+SGST based on transaction type
- GST rates: CGST 9%, SGST 9%, IGST 18% (configurable)
- Automatic tax calculation based on selected GST type

### 2. Currency - Indian Rupees (₹)

- All prices and amounts displayed in INR format
- Proper formatting: ₹1,00,000.00 (Indian numbering system)
- Centralized formatter utility in `/app/lib/formatters.js`

### 3. Admin Features

#### Owner/Super Admin Page (`/dashboard/admin/users`)

- Complete user management (CRUD operations)
- Create users with roles: Admin, Shop Owner, Staff
- Manage user status (Active/Inactive)
- Password management with bcrypt hashing
- Email validation

#### Shop Admin Page (`/dashboard/admin/bulk-products`)

- Bulk product import via manual form or CSV upload
- Download CSV template for easy bulk import
- Real-time validation and error reporting
- Success/failure tracking for each product
- Keep failed items in form for correction

### 4. Core Features

- **Customers**: Full CRUD with address management
- **Products**: Inventory management with stock tracking, SKU management
- **Invoices**: Create, edit, view, print invoices with GST breakdown
- **Dashboard**: Statistics, recent invoices, low stock alerts
- **Authentication**: Protected routes (mock implementation)

## Technical Stack

### Backend

- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: bcryptjs for password hashing
- **APIs**: RESTful API design

### Frontend

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS 4
- **Icons**: react-icons (Feather Icons)
- **State Management**: React hooks

## File Structure

```
billing/
├── backend/
│   ├── controllers/
│   │   ├── customerController.js
│   │   ├── productController.js
│   │   ├── invoiceController.js
│   │   └── userController.js
│   ├── models/
│   │   ├── Customer.js
│   │   ├── Product.js
│   │   ├── Invoice.js (with GST fields)
│   │   └── User.js
│   ├── routes/
│   │   ├── customerRoutes.js
│   │   ├── productRoutes.js (with bulk import)
│   │   ├── invoiceRoutes.js
│   │   └── userRoutes.js
│   └── index.js
└── app/
    ├── app/
    │   ├── dashboard/
    │   │   ├── page.js (Dashboard with INR)
    │   │   ├── customers/
    │   │   ├── products/ (with INR formatting)
    │   │   ├── invoices/ (with GST support)
    │   │   └── admin/
    │   │       ├── users/ (User management)
    │   │       └── bulk-products/ (Bulk import)
    │   └── login/
    └── lib/
        ├── formatters.js (INR formatting utility)
        └── api.js

```

## API Endpoints

### Users API

- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get single user
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Products API

- `POST /api/products/bulk` - Bulk import products
- All standard CRUD operations

### Invoices API

- Invoice creation with GST fields
- All standard CRUD operations

## Database Schema Updates

### Invoice Model (Major Changes)

```javascript
{
  // Old field removed: taxRate

  // New GST fields:
  isIGST: Boolean,           // Toggle for IGST vs CGST+SGST
  cgstRate: Number,          // Central GST rate (default: 9)
  sgstRate: Number,          // State GST rate (default: 9)
  igstRate: Number,          // Integrated GST rate (default: 18)

  // Computed virtuals:
  cgstAmount: Number,        // Calculated CGST amount
  sgstAmount: Number,        // Calculated SGST amount
  igstAmount: Number,        // Calculated IGST amount
  taxAmount: Number,         // Total tax (IGST OR CGST+SGST)
}
```

### User Model (New)

```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  role: String (enum: admin, shop_owner, staff),
  isActive: Boolean,
  timestamps: true
}
```

## Key Features & How to Use

### Creating an Invoice with GST

1. Navigate to `/dashboard/invoices/new`
2. Select customer
3. Add products (prices in ₹)
4. Check "Interstate Transaction" checkbox for IGST
5. If unchecked, CGST + SGST will be applied
6. GST rates can be customized
7. Invoice shows breakdown:
   - Subtotal
   - IGST OR (CGST + SGST)
   - Total Amount in ₹

### Managing Users (Owner Admin)

1. Navigate to `/dashboard/admin/users`
2. Click "Add New User"
3. Fill in details: name, email, password, role
4. Set user as Active/Inactive
5. Edit or delete existing users

### Bulk Product Import (Shop Admin)

1. Navigate to `/dashboard/admin/bulk-products`
2. Option 1: Download CSV template, fill it, and upload
3. Option 2: Manually add rows in the form
4. Click "Import Products"
5. View success/failed results
6. Failed items remain in form for correction

### Viewing Invoices

1. Navigate to `/dashboard/invoices`
2. Click eye icon to view invoice
3. Invoice displays:
   - Customer details
   - Product line items with ₹ prices
   - GST breakdown (IGST or CGST+SGST)
   - Total in ₹
4. Print functionality available

## Running the Application

### Backend

```bash
cd backend
npm install
node index.js
# Server runs on http://localhost:3000
```

### Frontend

```bash
cd app
npm install
npm run dev
# App runs on http://localhost:3001
```

## Environment Variables

### Backend (.env)

```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/erp-billing
NODE_ENV=development
```

## Currency Formatting

The `formatINR()` function uses the Indian numbering system:

- ₹1,00,000.00 (1 lakh)
- ₹10,00,000.00 (10 lakh)
- ₹1,00,00,000.00 (1 crore)

## GST Calculation Logic

### For IGST (Interstate)

```
Subtotal = Sum of (quantity × unitPrice)
IGST Amount = Subtotal × (igstRate / 100)
Total = Subtotal + IGST Amount
```

### For CGST + SGST (Intrastate)

```
Subtotal = Sum of (quantity × unitPrice)
CGST Amount = Subtotal × (cgstRate / 100)
SGST Amount = Subtotal × (sgstRate / 100)
Total = Subtotal + CGST Amount + SGST Amount
```

## Next.js 16 Compatibility

All dynamic routes use React.use() to unwrap params Promise:

```javascript
import { use } from "react";

export default function Page({ params }) {
  const { id } = use(params);
  // Use id here
}
```

## Navigation Structure

- Dashboard (/)
- Customers (/dashboard/customers)
- Products (/dashboard/products)
- Invoices (/dashboard/invoices)
- User Management (/dashboard/admin/users) - Owner only
- Bulk Import (/dashboard/admin/bulk-products) - Shop admin

## Security Features

- Password hashing with bcryptjs (10 rounds)
- Email validation
- Protected routes (basic implementation)
- Input validation on all forms

## Future Enhancements

- JWT-based authentication
- Role-based access control (RBAC)
- Invoice PDF generation
- Email notifications
- Payment gateway integration
- Advanced reporting and analytics
- Multi-currency support
- Tax reports generation

## Testing

1. Start MongoDB
2. Start backend server
3. Start frontend dev server
4. Access http://localhost:3001
5. Test invoice creation with GST
6. Test user management
7. Test bulk product import

## Troubleshooting

### Backend not starting

- Check MongoDB is running
- Verify .env file exists
- Check port 3000 is not in use

### Frontend not starting

- Check backend is running on port 3000
- Clear .next folder and rebuild
- Check all dependencies installed

### GST not calculating

- Verify Invoice model has GST fields
- Check backend has latest code
- Ensure pre-save hooks are working

## Credits

Built with Next.js 16, Express.js, MongoDB, and Tailwind CSS 4.
Compliant with Indian GST regulations (as of 2024).
