import { useEffect, useState } from "react";
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

/** helpers token */
function getToken() {
  try { return localStorage.getItem("token") || ""; } catch { return ""; }
}
function clearToken() {
  try { localStorage.removeItem("token"); } catch {}
}

export default function App() {
  // routing/tab
  const [page, setPage] = useState("dashboard");

  // auth state
  const [logged, setLogged] = useState(!!getToken());

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

  // muat settings dari localStorage
  useEffect(() => {
    try {
      const s = localStorage.getItem("pos_settings");
      if (s) setSettings((prev) => ({ ...prev, ...JSON.parse(s) }));
    } catch {}
  }, []);

  // simpan settings ke localStorage setiap berubah
  useEffect(() => {
    try { localStorage.setItem("pos_settings", JSON.stringify(settings)); } catch {}
  }, [settings]);

  // fungsi memuat ulang data inti (produk, pelanggan, penjualan recent)
  async function reloadAll() {
    try {
      const [p, c] = await Promise.all([
        api.products.list(""),
        api.customers.list(),
      ]);
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

  // saat login sukses → muat semua data
  useEffect(() => {
    if (logged) reloadAll();
  }, [logged]);

  // tampilan login
  if (!logged) {
    return <LoginView onLogin={() => setLogged(true)} />;
  }

  return (
    <Layout
      page={page}
      setPage={setPage}
      onLogout={() => {
        clearToken();
        setLogged(false);
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
          // opsional: kalau mau hitung saldo lokal pakai salesRecent
          sales={salesRecent}
          payments={[]} // kita tidak memuat list payments global di UI ini
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
    </Layout>
  );
}
