# ERP Billing System - REST API

A complete, modular REST API for an ERP-style POS system built with Node.js, Express, and MongoDB/Mongoose.

## 🚀 Features

- **Customer Management**: Full CRUD operations with invoice tracking
- **Product Management**: Inventory with stock tracking and alerts
- **Invoice Management**: Complex invoice processing with automatic calculations
- **Stock Management**: Automatic stock deduction when invoices are paid
- **Validation**: Stock availability checks and business logic validation
- **Calculations**: Automatic subtotal, tax, and total calculations using Mongoose virtuals
- **Error Handling**: Centralized error handling with custom error classes

## 📁 Project Structure

```
backend/
├── models/              # Mongoose schemas
│   ├── Customer.js      # Customer model with invoice references
│   ├── Product.js       # Product model with stock management
│   └── Invoice.js       # Invoice model with calculations
├── controllers/         # Business logic
│   ├── customerController.js
│   ├── productController.js
│   └── invoiceController.js
├── routes/             # API routes
│   ├── customerRoutes.js
│   ├── productRoutes.js
│   └── invoiceRoutes.js
├── middleware/         # Middleware functions
│   └── errorHandler.js # Error handling & async wrapper
├── index.js           # Main application file
├── package.json       # Dependencies
└── .env              # Environment variables
```

## 🛠️ Installation

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Set up MongoDB:**
   - Make sure MongoDB is installed and running locally
   - Or update MONGODB_URI in .env to use a cloud MongoDB instance

3. **Configure environment variables:**
   Edit `.env` file with your settings

4. **Start the server:**
   ```bash
   npm run dev    # Development mode with nodemon
   npm start      # Production mode
   ```

## 📚 API Endpoints

### Customers

| Method | Endpoint                   | Description                                  |
| ------ | -------------------------- | -------------------------------------------- |
| GET    | `/api/customers`           | Get all customers (with pagination & search) |
| GET    | `/api/customers/:id`       | Get customer by ID                           |
| POST   | `/api/customers`           | Create new customer                          |
| PUT    | `/api/customers/:id`       | Update customer                              |
| DELETE | `/api/customers/:id`       | Delete customer                              |
| GET    | `/api/customers/:id/stats` | Get customer statistics                      |

### Products

| Method | Endpoint                            | Description                     |
| ------ | ----------------------------------- | ------------------------------- |
| GET    | `/api/products`                     | Get all products (with filters) |
| GET    | `/api/products/:id`                 | Get product by ID               |
| POST   | `/api/products`                     | Create new product              |
| PUT    | `/api/products/:id`                 | Update product                  |
| DELETE | `/api/products/:id`                 | Delete product                  |
| PATCH  | `/api/products/:id/stock`           | Adjust stock quantity           |
| GET    | `/api/products/alerts/low-stock`    | Get low stock products          |
| GET    | `/api/products/alerts/out-of-stock` | Get out of stock products       |

### Invoices

| Method | Endpoint                           | Description                     |
| ------ | ---------------------------------- | ------------------------------- |
| GET    | `/api/invoices`                    | Get all invoices (with filters) |
| GET    | `/api/invoices/:id`                | Get invoice by ID               |
| POST   | `/api/invoices`                    | Create new invoice              |
| PUT    | `/api/invoices/:id`                | Update invoice                  |
| DELETE | `/api/invoices/:id`                | Delete invoice                  |
| PATCH  | `/api/invoices/:id/status`         | Update invoice status           |
| GET    | `/api/invoices/stats/summary`      | Get invoice statistics          |
| GET    | `/api/invoices/reports/date-range` | Get invoices by date range      |

## 📝 Request Examples

### Create Customer

```json
POST /api/customers
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "address": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA"
  }
}
```

### Create Product

```json
POST /api/products
{
  "name": "Laptop",
  "description": "High-performance laptop",
  "price": 999.99,
  "stockQuantity": 50,
  "sku": "LAP001"
}
```

### Create Invoice

```json
POST /api/invoices
{
  "customerId": "65f1234567890abcdef12345",
  "items": [
    {
      "productId": "65f1234567890abcdef67890",
      "quantity": 2,
      "unitPrice": 999.99
    }
  ],
  "taxRate": 10,
  "status": "Draft"
}
```

### Update Invoice Status to Paid

```json
PATCH /api/invoices/:id/status
{
  "status": "Paid"
}
```

_Note: This will automatically decrement stock quantities_

## 🎯 Key Features

### 1. **Data Relationships**

- Customers have references to their invoices
- Invoices reference customers and products
- Products track their usage in invoices

### 2. **Stock Management**

- Automatic stock validation before invoice creation
- Stock decrements when invoice status changes to "Paid"
- Low stock and out-of-stock alerts
- Manual stock adjustment endpoint

### 3. **Calculations**

- Mongoose virtuals for subtotals
- Pre-save hooks for total calculations
- Tax calculations based on configurable tax rate
- Line item subtotals

### 4. **Validation**

- Email and phone format validation
- Unique constraints on email and SKU
- Stock availability checks
- Invoice status transition rules

### 5. **Error Handling**

- Centralized error handler
- Custom error class with status codes
- Mongoose validation error formatting
- Async error wrapper for clean code

## 🔐 Business Logic

### Invoice Status Flow

- **Draft** → Can be edited/deleted
- **Pending** → Can be updated to Paid or Cancelled
- **Paid** → Cannot be edited (stock already decremented)
- **Cancelled** → Cannot be changed

### Stock Rules

- Cannot create invoice if product is out of stock
- Stock decrements only when status becomes "Paid"
- Cannot delete paid invoices (data integrity)
- Low stock alerts for quantities < 10

## 🧪 Testing

Test the API using tools like:

- Postman
- Thunder Client
- cURL
- Insomnia

## 📦 Dependencies

- **express**: Web framework
- **mongoose**: MongoDB ODM
- **dotenv**: Environment variable management
- **nodemon**: Development auto-restart (dev dependency)

## 🌟 Advanced Features

- Pagination support on list endpoints
- Search functionality on customers and products
- Date range reporting for invoices
- Customer and invoice statistics
- Population of related documents
- Virtual fields for computed values

## 📄 License

ISC

## 👨‍💻 Author

Your Name

---

**Happy Coding! 🚀**
