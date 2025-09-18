// src/apiClient.js
const BASE = import.meta.env.VITE_API_BASE_URL;

function getToken() {
  try {
    return localStorage.getItem("token") || "";
  } catch {
    return "";
  }
}

async function request(path, { method = "GET", body, headers } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: getToken() ? `Bearer ${getToken()}` : "",
      ...(headers || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let data;
    try {
      data = await res.json();
    } catch {
      /* ignore */
    }
    throw new Error(data?.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  auth: {
    login: (password) =>
      request("/auth/login", { method: "POST", body: { password } }),
  },
  products: {
    list: (q = "") =>
      request(`/products${q ? `?q=${encodeURIComponent(q)}` : ""}`),
    create: (p) => request("/products", { method: "POST", body: p }),
    update: (id, p) => request(`/products/${id}`, { method: "PUT", body: p }),
    remove: (id) => request(`/products/${id}`, { method: "DELETE" }),
    addStock: (id, payload) =>
      request(`/products/${id}/add-stock`, { method: "POST", body: payload }), // <—
  },
  customers: {
    list: () => request("/customers"),
    create: (c) => request("/customers", { method: "POST", body: c }),
    update: (id, c) => request(`/customers/${id}`, { method: "PUT", body: c }),
    remove: (id) => request(`/customers/${id}`, { method: "DELETE" }),
  },
  sales: {
    create: (payload) => request("/sales", { method: "POST", body: payload }),
    list: (status) => request(`/sales${status ? `?status=${status}` : ""}`),
  },
  payments: {
    create: (payload) =>
      request("/payments", { method: "POST", body: payload }),
  },
  reports: {
    sales: (from, to) => request(`/reports/sales?from=${from}&to=${to}`),
    stockIn: (from, to) => request(`/reports/stock-in?from=${from}&to=${to}`),
  },
};

export default api;
