// src/api/apiClient.js
const BASE_URL =
  import.meta?.env?.VITE_API_BASE_URL ||
  "https://inventory-pos-api.benalexsandro.workers.dev/api/v1";

/* =========================
   Helpers
========================= */
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
    const err = new Error(msg);
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}

/* =========================
   API Object
========================= */
const api = {
  // Convenience methods (biar bisa api.get/post/put/delete)
  get: (path, opts = {}) => request(path, { ...opts, method: "GET" }),
  post: (path, body, opts = {}) =>
    request(path, { ...opts, method: "POST", body }),
  put: (path, body, opts = {}) =>
    request(path, { ...opts, method: "PUT", body }),
  delete: (path, opts = {}) => request(path, { ...opts, method: "DELETE" }),

  /* ===== Auth (username + password) ===== */
  auth: {
    login: (username, password) =>
      api.post("/auth/login", { username, password }),
  },

  /* ===== Products ===== */
  products: {
    list: (q = "") => api.get(`/products${qs({ q })}`),
    create: (p) => api.post("/products", p),
    update: (id, p) => api.put(`/products/${id}`, p),
    remove: (id) => api.delete(`/products/${id}`),
    addStock: (id, payload) => api.post(`/products/${id}/add-stock`, payload),
  },

  /* ===== Customers ===== */
  customers: {
    list: () => api.get("/customers"),
    create: (c) => api.post("/customers", c),
    update: (id, c) => api.put(`/customers/${id}`, c),
    remove: (id) => api.delete(`/customers/${id}`),
  },

  /* ===== Sales / POS ===== */
  sales: {
    create: (payload) => api.post("/sales", payload),
    list: (status) => api.get(`/sales${qs({ status })}`),
    detail: (id) => api.get(`/sales/${id}/detail`),
  },

  /* ===== Payments ===== */
  payments: {
    create: (p) => api.post("/payments", p),
  },

  /* ===== Reports ===== */
  reports: {
    sales: (from, to) => api.get(`/reports/sales${qs({ from, to })}`),
    stockIn: (from, to) => api.get(`/reports/stock-in${qs({ from, to })}`),
    profit: (from, to) => api.get(`/reports/profit${qs({ from, to })}`),
    totalSales: (from, to) =>
      api.get(`/reports/total-sales${qs({ from, to })}`),
  },

  /* ===== Users (admin only) ===== */
  users: {
    list: () => api.get("/users"),
    create: (u) => api.post("/users", u), // { username, name, password, role }
    update: (id, u) => api.put(`/users/${id}`, u), // atau PATCH di backend jika kamu pakai patch
    patch: (id, u) => request(`/users/${id}`, { method: "PATCH", body: u }),
    remove: (id) => api.delete(`/users/${id}`),
  },

  /* ===== Login Audits (admin only) ===== */
  audits: {
    loginList: () => api.get("/audits/login"),
  },
};

export default api;
