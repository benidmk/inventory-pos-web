// src/App.jsx
import { useEffect, useMemo, useState } from "react";
import api from "./api/apiClient";
import { ymdLocal } from "./utils/format";

// layout & auth
import LoginView from "./components/LoginView"; 
import Layout from "./components/Layout";

// views
import Dashboard from "./views/Dashboard";
import ProductsView from "./views/ProductsView";
import POSView from "./views/POSView";
import CustomersView from "./views/CustomersView";
import PaymentsView from "./views/PaymentsView";
import ReportsView from "./views/ReportsView";
import SettingsView from "./views/SettingsView";
import UsersView from "./views/UsersView"; // halaman manajemen user (admin-only)

// session utils (role & logout)
import { getRole, isViewer, logout as clearSession } from "./utils/auth";

/* =========================
   Helpers token (fallback)
========================= */
function getToken() {
  try {
    return localStorage.getItem("token") || "";
  } catch {
    return "";
  }
}

export default function App() {
  // routing/tab (nama halaman konsisten dengan Sidebar/Layout milikmu)
  const [page, setPage] = useState("dashboard");

  // auth state
  const [logged, setLogged] = useState(!!getToken());
  const [role, setRole] = useState(() => getRole()); // "ADMIN" | "VIEWER"
  const viewer = useMemo(() => isViewer(), [role]);

  // data utama yang dibutuhkan banyak view
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [salesRecent, setSalesRecent] = useState([]); // untuk dashboard chart & ringkasan

  // filter untuk membuka tab pembayaran dari pelanggan tertentu
  const [paymentFilterCustomer, setPaymentFilterCustomer] = useState("");

  // settings lokal (untuk struk & branding) — disimpan di localStorage
  const [settings, setSettings] = useState({
    receiptWidth: 80,
    storeName: "",
    storeAddress: "",
    storePhone: "",
  });

  /* =========================
     Settings: load & persist
  ========================= */
  useEffect(() => {
    try {
      const s = localStorage.getItem("pos_settings");
      if (s) setSettings((prev) => ({ ...prev, ...JSON.parse(s) }));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("pos_settings", JSON.stringify(settings));
    } catch {}
  }, [settings]);

  /* =========================
     Load core data (products, customers, recent sales)
  ========================= */
  async function reloadAll() {
    try {
      const [p, c] = await Promise.all([api.products.list(""), api.customers.list()]);
      setProducts(p);
      setCustomers(c);

      // ambil sales 30 hari terakhir untuk dashboard
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - 30);
      const r = await api.reports.sales(ymdLocal(from), ymdLocal(to));
      setSalesRecent(r.list || []);
    } catch (e) {
      console.error("reloadAll failed:", e);
    }
  }

  // setelah login → muat semua data & sinkron role
  useEffect(() => {
    if (logged) {
      setRole(getRole());
      reloadAll();
    }
  }, [logged]);

  // jaga-jaga: jika user VIEWER mencoba membuka halaman admin-only
  useEffect(() => {
    if (page === "users" && role !== "ADMIN") {
      setPage("dashboard");
    }
  }, [page, role]);

  /* =========================
     Auth wall (Login)
  ========================= */
  if (!logged) {
    return (
      <LoginView
        onLogin={() => {
          setLogged(true);
          setRole(getRole());
          // optional: redirect ke dashboard
          setPage("dashboard");
        }}
      />
    );
  }

  /* =========================
     App Layout
  ========================= */
  return (
    <Layout
      page={page}
      setPage={setPage}
      role={role} // kalau Layout mau menyesuaikan menu berdasarkan role
      onLogout={() => {
        clearSession();     // hapus token + role + name + username
        setLogged(false);
        setRole("VIEWER");
        setProducts([]);
        setCustomers([]);
        setSalesRecent([]);
        setPage("dashboard");
      }}
    >
      {page === "dashboard" && (
        <Dashboard products={products} salesRecent={salesRecent} />
      )}

      {page === "products" && <ProductsView />}

      {page === "pos" && (
        <POSView
          products={products}
          customers={customers}
          reloadAll={reloadAll}
          settings={settings}
        />
      )}

      {page === "customers" && (
        <CustomersView
          setTab={setPage}
          setPaymentFilterCustomer={setPaymentFilterCustomer}
          sales={salesRecent}
          payments={[]}
        />
      )}

      {page === "payments" && (
        <PaymentsView
          customers={customers}
          paymentFilterCustomer={paymentFilterCustomer}
          setPaymentFilterCustomer={setPaymentFilterCustomer}
        />
      )}

      {page === "reports" && <ReportsView />}

      {page === "settings" && (
        <SettingsView settings={settings} setSettings={setSettings} />
      )}

      {/* Halaman Users (khusus ADMIN) */}
      {page === "users" && role === "ADMIN" && <UsersView />}
    </Layout>
  );
}
