import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 second timeout
  headers: {
    Accept: "application/json",
    // Don't set Content-Type here - let axios set it automatically to avoid preflight
  },
  withCredentials: false,
});

// Add auth token to requests if available
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
  getStats: () => api.get("/api/invoices/stats/summary"),
  getByDateRange: (params) =>
    api.get("/api/invoices/reports/date-range", { params }),
  previewNumber: () => api.get("/api/invoices/preview-number"),
  bulkExport: () => api.get("/api/invoices/reports/bulk-pdf"),
};

export default api;
