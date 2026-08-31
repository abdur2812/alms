import axios from "axios";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://alms-billing.duckdns.org";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30s for 512MB + heavy reports (stock snapshots, aggregated reports)
  headers: {
    Accept: "application/json",
  },
  withCredentials: false,
});

// Add auth token to requests if available
// vercel redeploy commit
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  },
);

// Customers API
export const customersAPI = {
  getAll: (params) => api.get("/api/customers", { params }),
  getById: (id) => api.get(`/api/customers/${id}`),
  create: (data) => api.post("/api/customers", data),
  update: (id, data) => api.put(`/api/customers/${id}`, data),
  delete: (id) => api.delete(`/api/customers/${id}`),
  getStats: (id) => api.get(`/api/customers/${id}/stats`),
  getCredit: (id) => api.get(`/api/customers/${id}/credit`),
};

// Products API
export const productsAPI = {
  getAll: (params) => api.get("/api/products", { params }),
  getPopular: (params) => api.get("/api/products/popular", { params }),
  getById: (id) => api.get(`/api/products/${id}`),
  create: (data) => api.post("/api/products", data),
  bulkCreate: (data) => api.post("/api/products/bulk", data),
  update: (id, data) => api.put(`/api/products/${id}`, data),
  delete: (id) => api.delete(`/api/products/${id}`),
  adjustStock: (id, data) => api.patch(`/api/products/${id}/stock`, data),
  getLowStock: () => api.get("/api/products/alerts/low-stock"),
  getOutOfStock: () => api.get("/api/products/alerts/out-of-stock"),
};

// Invoices API
export const invoicesAPI = {
  getAll: (params) => api.get("/api/invoices", { params }),
  getById: (id) => api.get(`/api/invoices/${id}`),
  create: (data) => api.post("/api/invoices", data),
  update: (id, data) => api.put(`/api/invoices/${id}`, data),
  delete: (id) => api.delete(`/api/invoices/${id}`),
  getStats: (params) => api.get("/api/invoices/stats/summary", { params }),
  getByDateRange: (params) =>
    api.get("/api/invoices/reports/date-range", { params }),
  getRevenueInsights: (params) =>
    api.get("/api/invoices/reports/revenue", { params }),
  previewNumber: () => api.get("/api/invoices/preview-number"),
  bulkExport: () => api.get("/api/invoices/reports/bulk-pdf"),
};

// Vendors API
export const vendorsAPI = {
  getAll: (params) => api.get("/api/vendors", { params }),
  getById: (id) => api.get(`/api/vendors/${id}`),
  create: (data) => api.post("/api/vendors", data),
  update: (id, data) => api.put(`/api/vendors/${id}`, data),
  delete: (id) => api.delete(`/api/vendors/${id}`),
};

// Purchases API
export const purchasesAPI = {
  getAll: (params) => api.get("/api/purchases", { params }),
  getById: (id) => api.get(`/api/purchases/${id}`),
  create: (data) => api.post("/api/purchases", data),
  update: (id, data) => api.put(`/api/purchases/${id}`, data),
  delete: (id) => api.delete(`/api/purchases/${id}`),
  getNextNumber: () => api.get("/api/purchases/preview-number"),
  getMonthlyReport: (params) => {
    // Supports: { month: "YYYY-MM" } (legacy) or { vendorId, startDate, endDate } or { vendorId, month }
    // If a string is passed for backward compat, treat as month
    const query = typeof params === "string" ? { month: params } : params || {};
    return api.get("/api/purchases/reports/monthly", { params: query });
  },
};

// HSN Codes API
export const hsnsAPI = {
  getAll: (params) => api.get("/api/hsns", { params }),
  create: (data) => api.post("/api/hsns", data),
  delete: (id) => api.delete(`/api/hsns/${id}`),
};

// General Expenses API
export const expensesAPI = {
  getAll: (params) => api.get("/api/expenses", { params }),
  getById: (id) => api.get(`/api/expenses/${id}`),
  create: (data) => api.post("/api/expenses", data),
  update: (id, data) => api.put(`/api/expenses/${id}`, data),
  delete: (id) => api.delete(`/api/expenses/${id}`),
};

// Expense Categories API
export const expenseCategoriesAPI = {
  getAll: (params) => api.get("/api/expense-categories", { params }),
  create: (data) => api.post("/api/expense-categories", data),
  update: (id, data) => api.put(`/api/expense-categories/${id}`, data),
  delete: (id) => api.delete(`/api/expense-categories/${id}`),
};

// Accounts API
export const accountsAPI = {
  getSummary: (params) => api.get("/api/accounts/summary", { params }),
  getHsnSummary: (params) => api.get("/api/accounts/hsn", { params }),
  getReport: (params) => api.get("/api/accounts/report", { params }),
};

// Staff API
export const staffAPI = {
  getAll: (params) => api.get("/api/staff", { params }),
  getById: (id) => api.get(`/api/staff/${id}`),
  create: (data) => api.post("/api/staff", data),
  update: (id, data) => api.put(`/api/staff/${id}`, data),
  delete: (id) => api.delete(`/api/staff/${id}`),
  getDailyAttendance: (date) =>
    api.get("/api/staff/attendance/daily", { params: { date } }),
  saveDailyAttendance: (data) => api.post("/api/staff/attendance/daily", data),
  getPayments: (params) => api.get("/api/staff/payments", { params }),
  getCalendar: (id, params) => api.get(`/api/staff/${id}/calendar`, { params }),
  // Daily per-day payments (track each staff's particular day's payment)
  getDailyPayments: (params) => api.get("/api/staff/payments/daily", { params }),
  markDayPaid: (data) => api.post("/api/staff/payments/daily", data),
  markDayUnpaid: (params) => api.delete("/api/staff/payments/daily", { params }),
};

export default api;
