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
- API client in `app/lib/api.js` — functions grouped by resource: `customersAPI`, `productsAPI`, `invoicesAPI`
- Search inputs are regex-escaped in controllers (`escapeRegex`) to prevent ReDoS/injection
- No formal test suite; manual testing via curl/Postman/Thunder Client

## Architecture Notes
- Invoice items snapshot product data (name, price, GST, HSN) at creation time; `productId` can be `null` for one-time products
- There is **NO `status` field** on the Invoice model. Billing semantics come from `billType`: `"pay"` (cash sale, deducts stock on create) vs `"credit"` (tracks amount owed). Revenue/totals are computed off `billType`, not a status string. (The edit page still renders a vestigial "Payment Status" dropdown in `app/app/dashboard/invoices/[id]/page.js`, but it is NOT persisted to the model — ignore it when wiring logic.)
- `isIgst` (boolean) switches between CGST/SGST (intra-state) and IGST (inter-state) display
- `copyType`: `"original"` | `"duplicate"`
- One-time billing: invoices can embed `customerData` inline without creating a Customer record; `customerId` may be null
- Estimates (`isGstBill: false`) get an `EST-XXXX` number immediately; they can be converted to GST invoices on PUT (triggers `generateInvoiceNumber()` + sets `numberAssignedAt`). `numberAssignedAt` also drives list ordering.
- `preview-number` endpoint returns the next GST number live (used on the New Invoice page header)
- PDF generation uses `@react-pdf/renderer` in `app/components/InvoicePDF.js`
- Bulk import: `POST /api/products/bulk`
- Reusable UI: `app/components/UI.js` exports `Dropdown` (debounced async search with race-condition guard), `NumberInput`, `PageHeader`, etc. Prefer these over ad-hoc inputs.

## ENV / URLs
- Backend `MONGODB_URI` + `PORT=3000` (+ `CORS_ORIGIN`) in `backend/.env`
- Frontend `NEXT_PUBLIC_API_URL` in `app/.env.local` (default `https://alms-billing.duckdns.org`); `app/lib/api.js` falls back to that default if unset. Local dev: `http://localhost:3000/api`
