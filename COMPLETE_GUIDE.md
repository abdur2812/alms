# ERP Billing System - Complete Setup Guide

## 🎉 Project Overview

This is a complete **ERP Billing System** with a full-featured frontend and backend. The system allows you to manage:

- **Customers** - Complete customer database with contact information and addresses
- **Products** - Product inventory with SKU, pricing, and stock management
- **Invoices** - Professional invoice generation with line items, tax calculations, and status tracking

## 🏗️ Architecture

### Backend (Express.js + MongoDB)

- RESTful API with Express.js
- MongoDB database with Mongoose ODM
- Complete CRUD operations for all entities
- Data validation and error handling
- CORS enabled for frontend communication

### Frontend (Next.js 16)

- Modern React with Next.js App Router
- Tailwind CSS 4 for styling
- Context API for state management
- Responsive design for mobile and desktop
- Print-friendly invoice layouts

## 🚀 Quick Start

### 1. Start the Backend Server

```bash
cd backend
npm start
```

The backend will run on **http://localhost:3000**

### 2. Start the Frontend Application

```bash
cd app
npm run dev
```

The frontend will run on **http://localhost:3001**

### 3. Access the Application

Open your browser and navigate to: **http://localhost:3001**

**Login**: Use any email and password (demo mode)

## 📋 Features Breakdown

### 🔐 Authentication

- Simple demo authentication system
- Protected dashboard routes
- Auto-redirect based on auth status
- Logout functionality

### 📊 Dashboard

- **Overview Statistics**
  - Total customers count
  - Total products count
  - Total invoices count
  - Total revenue from paid invoices
- **Recent Activity**
  - Last 5 invoices with quick view
  - Status indicators (Draft, Pending, Paid, Cancelled)
- **Alerts**
  - Low stock product warnings
  - Quick navigation to manage inventory
- **Quick Actions**
  - Create new invoice
  - Add customer
  - Add product

### 👥 Customer Management

**List View:**

- Paginated customer list (10 per page)
- Search by name or email
- Display contact information
- Show number of invoices per customer
- Quick edit/delete actions

**Create/Edit:**

- Full name, email, phone (required)
- Complete address fields:
  - Street address
  - City, State/Province
  - ZIP/Postal code
  - Country
- Form validation
- Error handling

### 📦 Product Management

**List View:**

- Paginated product list (10 per page)
- Search by name, SKU, or description
- Display price and stock quantity
- Stock status badges:
  - ✅ In Stock (green)
  - ⚠️ Low Stock (yellow) - less than 10 units
  - ❌ Out of Stock (red) - 0 units
- Quick edit/delete actions

**Create/Edit:**

- Product name, description
- SKU (auto-converts to uppercase)
- Price (with $ symbol)
- Stock quantity
- Form validation
- Unique SKU enforcement

### 📄 Invoice Management

**List View:**

- Paginated invoice list (10 per page)
- Filter by status (Draft, Pending, Paid, Cancelled)
- Display:
  - Invoice number
  - Customer name and email
  - Creation date
  - Total amount
  - Status badge
- Actions: View, Edit, Delete

**Create Invoice:**

- Select customer from dropdown
- Add multiple line items:
  - Select product (shows price)
  - Enter quantity
  - Unit price (auto-filled from product)
  - Subtotal calculated automatically
- Set tax rate (percentage)
- Choose initial status
- Real-time summary sidebar:
  - Subtotal
  - Tax amount
  - Grand total
- Add/remove items dynamically
- Stock validation on creation

**View Invoice:**

- Professional invoice layout
- Customer billing information
- Itemized product list
- Tax and total calculations
- Print functionality (print-friendly CSS)
- Quick status updates:
  - Mark as Pending
  - Mark as Paid
  - Cancel invoice
- Edit button for modifications

**Edit Invoice:**

- Limited editing to maintain integrity:
  - Tax rate can be updated
  - Status can be changed
  - Items cannot be modified after creation

## 🗂️ Database Models

### Customer Schema

```javascript
{
  name: String (required, min 2 chars),
  email: String (required, unique, validated),
  phone: String (required, validated format),
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  invoices: [ObjectId ref Invoice],
  timestamps: true
}
```

### Product Schema

```javascript
{
  name: String (required, min 2 chars),
  description: String (max 500 chars),
  price: Number (required, min 0),
  stockQuantity: Number (required, min 0, default 0),
  sku: String (required, unique, uppercase),
  timestamps: true
}
```

### Invoice Schema

```javascript
{
  invoiceNumber: String (unique, auto-generated),
  customerId: ObjectId ref Customer (required),
  items: [{
    productId: ObjectId ref Product (required),
    quantity: Number (required, min 1),
    unitPrice: Number (required, min 0)
  }],
  totalAmount: Number (auto-calculated),
  taxRate: Number (default 0, 0-100),
  status: String (Draft|Pending|Paid|Cancelled),
  timestamps: true
}
```

## 🎨 UI/UX Features

### Responsive Design

- ✅ Mobile-first approach
- ✅ Hamburger menu for mobile navigation
- ✅ Responsive tables
- ✅ Touch-friendly buttons
- ✅ Adaptive layouts

### User Feedback

- ✅ Loading spinners during API calls
- ✅ Error messages with clear descriptions
- ✅ Success confirmations
- ✅ Confirmation dialogs for destructive actions
- ✅ Form validation with inline errors
- ✅ Disabled states during processing

### Navigation

- ✅ Sidebar with active state highlighting
- ✅ Breadcrumb-style back navigation
- ✅ Quick action buttons
- ✅ Logo and branding

### Color Coding

- 🔵 Blue - Customers
- 🟢 Green - Products, Paid status
- 🟣 Purple - Invoices
- 🟡 Yellow - Pending status, Low stock
- 🔴 Red - Cancelled status, Out of stock
- ⚫ Gray - Draft status

## 📡 API Endpoints Reference

### Customers

```
GET    /api/customers              Get all (pagination, search)
GET    /api/customers/:id          Get one by ID
POST   /api/customers              Create new
PUT    /api/customers/:id          Update
DELETE /api/customers/:id          Delete
```

### Products

```
GET    /api/products               Get all (pagination, search)
GET    /api/products/:id           Get one by ID
POST   /api/products               Create new
PUT    /api/products/:id           Update
DELETE /api/products/:id           Delete
GET    /api/products/alerts/low-stock    Low stock alerts
GET    /api/products/alerts/out-of-stock Out of stock products
```

### Invoices

```
GET    /api/invoices               Get all (pagination, status filter)
GET    /api/invoices/:id           Get one by ID
POST   /api/invoices               Create new
PUT    /api/invoices/:id           Update
DELETE /api/invoices/:id           Delete
PATCH  /api/invoices/:id/status    Update status only
GET    /api/invoices/stats/summary Statistics
```

## 🔧 Configuration

### Backend Environment Variables

Create `backend/.env`:

```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/erp_billing
```

### Frontend Environment Variables

Create `app/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

## 🧪 Testing the Application

### 1. Add Sample Data

**Create a Customer:**

1. Go to Customers → Add Customer
2. Fill in: Name, Email, Phone
3. Optionally add address
4. Click "Create Customer"

**Create a Product:**

1. Go to Products → Add Product
2. Fill in: Name, SKU, Price, Stock Quantity
3. Click "Create Product"

**Create an Invoice:**

1. Go to Invoices → Create Invoice
2. Select a customer
3. Click "Add Item"
4. Select product and quantity
5. Set tax rate (e.g., 10%)
6. Choose status
7. Click "Create Invoice"

### 2. Test Features

- ✅ Search customers by name/email
- ✅ Filter invoices by status
- ✅ Edit customer information
- ✅ Update product stock
- ✅ View invoice and print it
- ✅ Change invoice status
- ✅ Check dashboard statistics

## 🐛 Troubleshooting

### Backend won't start

- Check if MongoDB is running: `mongod` or start MongoDB service
- Check if port 3000 is already in use
- Verify dependencies are installed: `npm install`

### Frontend won't start

- Check if backend is running on port 3000
- Verify .env.local file exists with correct API URL
- Clear Next.js cache: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`

### CORS Issues

- Backend has CORS enabled by default
- If issues persist, check the backend CORS configuration in `index.js`

### Database Connection Issues

- Ensure MongoDB is running
- Check MONGODB_URI in backend .env
- Verify database name and connection string

## 📈 Future Enhancements

### Authentication & Security

- [ ] JWT-based authentication
- [ ] User roles (Admin, Manager, Staff)
- [ ] Password encryption
- [ ] Session management
- [ ] API rate limiting

### Features

- [ ] PDF invoice generation
- [ ] Email notifications
- [ ] Payment tracking and receipts
- [ ] Multi-currency support
- [ ] Recurring invoices
- [ ] Invoice templates
- [ ] Advanced reporting
- [ ] Export to Excel/CSV
- [ ] Bulk operations
- [ ] Product categories
- [ ] Customer groups
- [ ] Discount management

### UI Improvements

- [ ] Dark mode
- [ ] Customizable themes
- [ ] Drag-and-drop file uploads
- [ ] Rich text editor for descriptions
- [ ] Charts and graphs
- [ ] Data visualization

## 📝 License

This is a demo project for educational purposes.

## 🤝 Support

For issues or questions, please refer to the code comments or create an issue in the repository.

---

**Built with ❤️ using Next.js, Express, and MongoDB**
