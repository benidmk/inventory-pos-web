// src/api/apiClient.js
const BASE_URL =
  import.meta?.env?.VITE_API_BASE_URL ||
  "https://bumdesma.up.railway.app/api/v1";

function getToken() {
  try {
    return localStorage.getItem("token") || "";
  } catch {
    return "";
  }
}

function qs(params = {}) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") sp.append(k, v);
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}

async function request(
  path,
  { method = "GET", body, headers = {}, signal } = {}
) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = {};
  }

  if (!res.ok) {
    const msg = json?.error || json?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json;
}

const api = {
  // ===== Convenience methods supaya kompatibel dengan pemanggilan api.get(...) dkk =====
  get: (path, opts = {}) => request(path, { ...opts, method: "GET" }),
  post: (path, body, opts = {}) =>
    request(path, { ...opts, method: "POST", body }),
  put: (path, body, opts = {}) =>
    request(path, { ...opts, method: "PUT", body }),
  delete: (path, opts = {}) => request(path, { ...opts, method: "DELETE" }),

  // ===== Modules =====
  auth: {
    login: (password) => api.post("/auth/login", { password }),
  },

  products: {
    list: (q = "") => api.get(`/products${qs({ q })}`),
    create: (p) => api.post("/products", p),
    update: (id, p) => api.put(`/products/${id}`, p),
    remove: (id) => api.delete(`/products/${id}`),
    addStock: (id, payload) => api.post(`/products/${id}/add-stock`, payload),
  },

  customers: {
    list: () => api.get("/customers"),
    create: (c) => api.post("/customers", c),
    update: (id, c) => api.put(`/customers/${id}`, c),
    remove: (id) => api.delete(`/customers/${id}`),
  },

  sales: {
    create: (payload) => api.post("/sales", payload),
    list: (status) => api.get(`/sales${qs({ status })}`),
    detail: (id) => api.get(`/sales/${id}/detail`),
  },

  payments: {
    create: (p) => api.post("/payments", p),
  },

  reports: {
    sales: (from, to) => api.get(`/reports/sales${qs({ from, to })}`),
    stockIn: (from, to) => api.get(`/reports/stock-in${qs({ from, to })}`),
    profit: (from, to) => api.get(`/reports/profit${qs({ from, to })}`),
    totalSales: (from, to) =>
      api.get(`/reports/total-sales${qs({ from, to })}`),
  },
};

export default api;
