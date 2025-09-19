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

async function request(path, { method = "GET", body, headers = {} } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  // ambil body text dulu supaya kalau bukan JSON tetap kebaca
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
      request(`/products/${id}/add-stock`, { method: "POST", body: payload }),
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
    create: (p) => request("/payments", { method: "POST", body: p }),
  },
  reports: {
    sales: (from, to) => request(`/reports/sales?from=${from}&to=${to}`),
    stockIn: (from, to) => request(`/reports/stock-in?from=${from}&to=${to}`),
  },
};

export default api;
