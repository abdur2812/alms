import axios from "axios";

const API_BASE_URL = "http://localhost:3000";
//process.env.NEXT_PUBLIC_API_URL ||

// Debug: Log the API base URL being used
console.log("🔧 API Configuration:", {
  baseURL: API_BASE_URL,
  debugMode: process.env.NEXT_PUBLIC_DEBUG_API,
  environment: process.env.NODE_ENV,
});

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

    // Debug logging if enabled
    if (process.env.NEXT_PUBLIC_DEBUG_API === "true") {
      console.log("🚀 API Request:", {
        url: `${config.baseURL}${config.url}`,
        method: config.method?.toUpperCase(),
        headers: config.headers,
      });
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor for debugging and error handling
api.interceptors.response.use(
  (response) => {
    if (process.env.NEXT_PUBLIC_DEBUG_API === "true") {
      console.log("✅ API Response:", response.status, response.config.url);
    }
    return response;
  },
  (error) => {
    if (process.env.NEXT_PUBLIC_DEBUG_API === "true") {
      console.error("❌ API Error:", {
        url: error.config?.url || "Unknown URL",
        method: error.config?.method?.toUpperCase() || "Unknown Method",
        baseURL: error.config?.baseURL || "Unknown Base URL",
        status: error.response?.status || "No Response Status",
        statusText: error.response?.statusText || "No Status Text",
        message: error.message || "No Error Message",
        details: error.response?.data || "No Response Data",
        code: error.code || "No Error Code",
        fullError: error.name || "Unknown Error Type",
      });
    }

    // Handle common network errors
    if (!error.response) {
      console.error(
        "🌐 Network Error: Cannot reach server. Check if the server is running and CORS is configured properly.",
        `Attempting to reach: ${error.config?.baseURL}${error.config?.url || ""}`,
      );
    }

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
  getById: (id) => api.get(`/api/products/${id}`),
  create: (data) => api.post("/api/products", data),
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
};

export default api;
