# Multi-Tenant Invoice & Inventory SaaS - Setup Guide

## 📦 Installation

### 1. Install Dependencies

```bash
cd app
npm install
```

### 2. Environment Setup

Create `.env.local` in the `/app` directory:

```env
# MongoDB Connection
MONGODB_URI="mongodb://localhost:27017/billing_saas"
# Or use MongoDB Atlas:
# MONGODB_URI="mongodb+srv://username:password@cluster.mongodb.net/billing_saas"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-here"
# Generate secret: openssl rand -base64 32

# Google OAuth (Optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# App Configuration
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Start MongoDB

**Option A: Local MongoDB**

```bash
# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Windows
net start MongoDB
```

**Option B: MongoDB Atlas**

1. Create account at https://www.mongodb.com/cloud/atlas
2. Create a cluster
3. Get connection string
4. Add to `MONGODB_URI`

### 4. Run Development Server

```bash
cd app
npm run dev
```

Visit: http://localhost:3000

## 🎯 Quick Start

### Create Your First Organization

1. Sign up or sign in
2. You'll be prompted to create an organization
3. Enter organization details

### Add Sample Data

```javascript
// You can create a seed script in app/scripts/seed.js
import dbConnect from "../lib/dbConnect";
import {
  Customer,
  Product,
  Tenant,
  User,
  TenantMember,
} from "../models/Common";
import bcrypt from "bcryptjs";

async function seed() {
  await dbConnect();

  // Create user
  const user = await User.create({
    name: "John Doe",
    email: "john@example.com",
    password: await bcrypt.hash("password123", 10),
  });

  // Create tenant/organization
  const tenant = await Tenant.create({
    name: "Acme Corp",
    slug: "acme-corp",
    ownerId: user._id,
  });

  // Add user to tenant
  await TenantMember.create({
    tenantId: tenant._id,
    userId: user._id,
    role: "OWNER",
  });

  // Add sample customer
  await Customer.create({
    tenantId: tenant._id,
    name: "Jane Smith",
    email: "jane@example.com",
    phone: "+1234567890",
  });

  // Add sample products
  await Product.create({
    tenantId: tenant._id,
    name: "Widget Pro",
    sku: "WID-001",
    price: 99.99,
    quantity: 100,
    unit: "pcs",
  });

  console.log("✅ Seed data created");
}

seed();
```

Run it:

```bash
node app/scripts/seed.js
```

## 🔧 Development

### Folder Structure

```
app/
├── actions/              # Server Actions (CRUD operations)
├── api/
│   └── auth/            # NextAuth routes
├── components/          # React components
│   ├── dashboard/       # Layout components
│   └── invoices/        # Feature components
├── dashboard/           # Protected pages
├── lib/                 # Utilities
│   ├── auth.js         # NextAuth config
│   ├── dbConnect.js    # MongoDB connection
│   ├── session.js      # Auth helpers
│   └── tenantMiddleware.js
└── models/             # Mongoose schemas
    ├── Common.js
    └── Invoice.js
```

### Key Concepts

#### 1. Multi-Tenancy

Every database query is automatically scoped to the current organization:

```javascript
import { requireTenant } from "@/app/lib/session";

export async function getInvoices() {
  const { tenantId } = await requireTenant();
  return Invoice.find({ tenantId });
}
```

#### 2. Server Actions

Use Server Actions for data mutations:

```javascript
"use server";

export async function createInvoice(data) {
  const { tenantId } = await requireTenant();
  // ... create invoice
}
```

#### 3. Soft Deletes

Instead of permanently deleting records:

```javascript
await Invoice.updateOne({ _id: invoiceId }, { deletedAt: new Date() });
```

## 🚀 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Environment Variables in Production

```env
MONGODB_URI=mongodb+srv://...
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your-production-secret
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

### MongoDB Atlas Setup

1. Whitelist Vercel IP ranges or use `0.0.0.0/0` (all IPs)
2. Create database user
3. Get connection string
4. Add to Vercel environment variables

## 📊 Database Schema

### Collections

- `users` - User accounts
- `tenants` - Organizations
- `tenantmembers` - User-Organization relationships
- `customers` - Customers (tenant-scoped)
- `products` - Products (tenant-scoped)
- `categories` - Product categories (tenant-scoped)
- `invoices` - Invoices (tenant-scoped)

### Indexes

Critical indexes for performance:

```javascript
// Tenant isolation
{ tenantId: 1 }

// Composite indexes
{ tenantId: 1, email: 1 }
{ tenantId: 1, sku: 1 }
{ tenantId: 1, invoiceNumber: 1 }
{ tenantId: 1, status: 1 }
{ tenantId: 1, deletedAt: 1 }
```

## 🔐 Security

### Authentication Flow

1. User signs in via NextAuth
2. JWT token includes user ID
3. Backend fetches user's tenants
4. First tenant (or default) is set as active
5. All queries filtered by `tenantId`

### Data Isolation

```javascript
// ✅ GOOD: Uses tenant isolation
const { tenantId } = await requireTenant();
const invoices = await Invoice.find({ tenantId });

// ❌ BAD: No tenant filtering
const invoices = await Invoice.find({});
```

### Role-Based Access Control (RBAC)

```javascript
import { requireRole } from "@/app/lib/session";

export async function deleteInvoice(id) {
  // Only OWNER and ADMIN can delete
  await requireRole(["OWNER", "ADMIN"]);
  // ... delete logic
}
```

## 🧪 Testing

### Manual Testing

1. Create multiple organizations
2. Add same user to both
3. Switch between orgs using Tenant Switcher
4. Verify data isolation

### Automated Testing (Future)

```bash
npm install --save-dev jest @testing-library/react
```

## 🐛 Troubleshooting

### MongoDB Connection Issues

```bash
# Check MongoDB is running
mongosh

# Check connection string
echo $MONGODB_URI
```

### NextAuth Issues

```bash
# Regenerate secret
openssl rand -base64 32

# Clear browser cookies
# Check NEXTAUTH_URL matches your domain
```

### Build Errors

```bash
# Clear cache
rm -rf .next
npm run build
```

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Mongoose Documentation](https://mongoosejs.com/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## 💡 Tips

### Switching Organizations

Users can belong to multiple organizations. Use the Tenant Switcher in the header to switch between them.

### Invoice Price Locking

Product prices are **locked** when an invoice is created. This prevents historical invoices from showing incorrect amounts if product prices change later.

### Soft Deletes

All deletions are soft deletes. Data is never permanently removed, allowing for recovery and audit trails.

### Performance

- Use MongoDB indexes for frequently queried fields
- Implement pagination for large datasets
- Use lean() for read-only queries
- Cache frequently accessed data

## 🤝 Support

For issues or questions:

1. Check the documentation
2. Search existing issues
3. Create a new issue with details

## ✅ Checklist Before Production

- [ ] Set strong `NEXTAUTH_SECRET`
- [ ] Use MongoDB Atlas or managed database
- [ ] Add proper indexes to all collections
- [ ] Set up monitoring (Vercel Analytics, Sentry)
- [ ] Configure CORS if needed
- [ ] Set up automated backups
- [ ] Enable SSL/TLS for MongoDB
- [ ] Review and test RBAC permissions
- [ ] Add rate limiting to API routes
- [ ] Set up error logging
