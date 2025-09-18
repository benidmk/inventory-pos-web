const BASE = import.meta.env.VITE_API_BASE_URL;
console.log("API BASE =", BASE);

export function getToken() {
  return localStorage.getItem("token") || "";
}
export function setToken(t) {
  localStorage.setItem("token", t || "");
}
export function clearToken() {
  localStorage.removeItem("token");
}

async function request(path, { method = "GET", body, headers = {} } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      msg = j.error || msg;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

// Auth
export async function loginWithPassword(password) {
  const data = await request("/auth/login", {
    method: "POST",
    body: { password },
  });
  setToken(data.token);
  return data;
}

// Produk
export const productsApi = {
  list: (q = "") =>
    request(`/products${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  create: (p) => request("/products", { method: "POST", body: p }),
  update: (id, p) => request(`/products/${id}`, { method: "PUT", body: p }),
  remove: (id) => request(`/products/${id}`, { method: "DELETE" }),
};
