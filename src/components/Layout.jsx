// src/components/Layout.jsx
import React from "react";
import Button from "./ui/Button";
import { getRole } from "../utils/auth";

function NavItem({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-lg transition ${
        active ? "bg-blue-600 text-white" : "hover:bg-gray-100 text-gray-800"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Props:
 * - page: string            // "dashboard" | "products" | "pos" | "customers" | "payments" | "reports" | "settings" | "users"
 * - setPage: (p)=>void
 * - onLogout: ()=>void
 * - role?: "ADMIN" | "VIEWER"   // opsional; jika tidak dikirim, akan dibaca dari localStorage
 * - children: ReactNode
 */
export default function Layout({ page, setPage, onLogout, role: roleProp, children }) {
  const role = roleProp || getRole(); // fallback baca dari localStorage

  return (
    <div className="min-h-screen grid grid-cols-12 bg-gray-50">
      {/* Sidebar */}
      <aside className="col-span-12 md:col-span-3 lg:col-span-2 border-r bg-white">
        <div className="p-4">
          <div className="text-xl font-bold">Inventory POS</div>
          <div className="text-xs text-gray-500 mt-1">
            Role: <span className="font-medium">{role}</span>
          </div>
        </div>
        <nav className="px-3 space-y-1">
          <NavItem active={page === "dashboard"} onClick={() => setPage("dashboard")}>
            Dashboard
          </NavItem>
          <NavItem active={page === "products"} onClick={() => setPage("products")}>
            Produk
          </NavItem>
          <NavItem active={page === "pos"} onClick={() => setPage("pos")}>
            POS (Kasir)
          </NavItem>
          <NavItem active={page === "customers"} onClick={() => setPage("customers")}>
            Pelanggan
          </NavItem>
          <NavItem active={page === "payments"} onClick={() => setPage("payments")}>
            Pembayaran
          </NavItem>
          <NavItem active={page === "reports"} onClick={() => setPage("reports")}>
            Laporan
          </NavItem>
          <NavItem active={page === "settings"} onClick={() => setPage("settings")}>
            Pengaturan
          </NavItem>

          {/* Hanya ADMIN yang melihat menu Users */}
          {role === "ADMIN" && (
            <NavItem active={page === "users"} onClick={() => setPage("users")}>
              Users
            </NavItem>
          )}
        </nav>

        <div className="p-4 mt-4">
          <Button className="w-full" onClick={onLogout}>
            Keluar
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="col-span-12 md:col-span-9 lg:col-span-10 p-4">
        {children}
      </main>
    </div>
  );
}
