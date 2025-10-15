// src/utils/auth.js
export function setSession({ token, role, name, username }) {
  try {
    localStorage.setItem("token", token);
    localStorage.setItem("role", role);
    localStorage.setItem("name", name || "");
    localStorage.setItem("username", username || "");
  } catch {}
}
export function getRole() {
  try {
    return localStorage.getItem("role") || "VIEWER";
  } catch {
    return "VIEWER";
  }
}
export function isViewer() {
  return getRole() === "VIEWER";
}
export function logout() {
  try {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("name");
    localStorage.removeItem("username");
  } catch {}
}
