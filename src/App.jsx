// src/App.jsx
import { useEffect, useMemo, useState } from "react";
import api from "./apiClient";

/* ====== (opsional) SHADCN/UI jika kamu pakai shadcn ====== */
function Card({ className = "", children }) {
  return <div className={`bg-white rounded-2xl shadow p-5 ${className}`}>{children}</div>;
}
function Button({ className = "", children, ...rest }) {
  return <button className={`px-3 py-2 rounded-xl border border-transparent bg-gray-100 hover:bg-gray-200 active:scale-[.99] transition ${className}`} {...rest}>{children}</button>;
}
function Input(props) {
  return <input className="px-3 py-2 rounded-xl border w-full border-gray-300 focus:outline-none focus:ring focus:ring-blue-200" {...props} />;
}
function Label({ children }) {
  return <label className="text-sm text-gray-600 mb-1 block">{children}</label>;
}

/* ====== Util ====== */
function fmtIDR(n = 0) {
  try { return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n || 0); }
  catch { return `Rp ${Number(n || 0).toLocaleString("id-ID")}`; }
}
function ymdLocal(d) {
  const x = new Date(d);
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
  return x.toISOString().slice(0,10);
}
function todayISO() { return ymdLocal(new Date()); }
function downloadCSV(filename, rows) {
  const csv = rows.map(r => r.map(v => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s;
  }).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/* ====== Auth (Login di dalam App) ====== */
function useToken() {
  const [token, setTokenState] = useState(() => localStorage.getItem("token") || "");
  function setToken(t) { setTokenState(t); localStorage.setItem("token", t); }
  function clearToken() { setTokenState(""); localStorage.removeItem("token"); }
  return { token, setToken, clearToken };
}

/*********************\
|  Login View         |
\*********************/
function LoginView({ onLogin, setToken }) {
  const [pwd, setPwd] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    setLoading(true); setErr("");
    try {
      const { token } = await api.auth.login(pwd);
      setToken(token);
      onLogin();
    } catch (e) {
      setErr(e.message || "Login gagal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-sm">
        <img
          src="/favicon.png?v=1"
          alt="BUMDESMA SILINDA"
          className="w-24 md:w-28 h-auto mx-auto mb-3 select-none"
          draggable="false"
        />
        <h1 className="text-2xl font-bold mb-1 text-center">Masuk</h1>
        <p className="text-gray-500 mb-4 text-center">BUMDESMA SILINDA</p>

        <Label>Password</Label>
        <Input
          type="password"
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          onKeyDown={(e)=>{ if (e.key === "Enter") submit(); }}
          placeholder="Password admin"
        />
        <Button className="mt-4 bg-blue-600 text-white w-full" onClick={submit} disabled={loading}>
          {loading? "Memeriksa..." : "Masuk"}
        </Button>
        {err && <div className="text-red-600 text-sm mt-2">{err}</div>}
      </Card>
    </div>
  );
}

/*********************\
|  Sidebar Layout     |
\*********************/
const MENUS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "products",  label: "Produk" },
  { key: "sales",     label: "Kasir" },
  { key: "customers", label: "Pelanggan" },
  { key: "reports",   label: "Laporan" },
  { key: "settings",  label: "Settings" },
];

function Layout({ page, setPage, onLogout, children }) {
  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-[240px] bg-white min-h-screen border-r hidden md:block">
          <div className="p-4 flex items-center gap-3 border-b">
            <img src="/favicon.png?v=1" alt="logo" className="w-8 h-8" />
            <div className="font-semibold leading-tight">BUMDESMA<br/>SILINDA</div>
          </div>
          <nav className="p-3 space-y-1">
            {MENUS.map(m => (
              <button
                key={m.key}
                onClick={()=>setPage(m.key)}
                className={`w-full text-left px-3 py-2 rounded-xl hover:bg-gray-100 ${page===m.key ? "bg-gray-200 font-semibold" : ""}`}
              >
                {m.label}
              </button>
            ))}
          </nav>
          <div className="p-3">
            <Button className="w-full" onClick={onLogout}>Keluar</Button>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 p-4 md:p-6">
          {/* Mobile header */}
          <div className="md:hidden flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <img src="/favicon.png?v=1" className="w-6 h-6" />
              <div className="font-semibold">BUMDESMA SILINDA</div>
            </div>
            <div className="flex items-center gap-2">
              <select value={page} onChange={e=>setPage(e.target.value)} className="px-2 py-1 rounded-lg border">
                {MENUS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
              </select>
              <Button onClick={onLogout}>Keluar</Button>
            </div>
          </div>

          {children}
        </main>
      </div>
    </div>
  );
}

/*********************\
|  Dashboard          |
\*********************/
function aggregateDailyFromSales(list, span = 7) {
  const map = new Map();
  const now = new Date();
  for (let i = span - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = ymdLocal(d);
    map.set(key, 0);
  }
  list.forEach(s => {
    const key = ymdLocal(s.date);
    if (map.has(key)) map.set(key, map.get(key) + s.grandTotal);
  });
  return Array.from(map.entries()).map(([date, total]) => ({ date, total }));
}

function Sparkline({ data }) {
  // mini sparkline pakai SVG biar tanpa lib chart
  if (!data.length) return null;
  const w = 260, h = 56, pad = 6;
  const xs = data.map((_, i) => pad + (i*(w-2*pad))/(data.length-1));
  const max = Math.max(...data.map(d => d.total), 1);
  const ys = data.map(d => h - pad - (d.total/max)*(h-2*pad));
  const d = xs.map((x,i)=>`${i===0?'M':'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
  return (
    <svg width={w} height={h} className="opacity-80">
      <polyline fill="none" stroke="currentColor" strokeWidth="2" points={xs.map((x,i)=>`${x},${ys[i]}`).join(" ")} />
      <path d={d} fill="none" />
    </svg>
  );
}

function Dashboard({ salesRecent }) {
  const today = todayISO();
  const todaySales = useMemo(
    () => salesRecent.filter(s => ymdLocal(s.date) === today),
    [salesRecent, today]
  );
  const sumToday = todaySales.reduce((a,s)=>a+s.grandTotal,0);
  const chart = aggregateDailyFromSales(salesRecent, 7);
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card>
        <div className="text-gray-500">Penjualan Hari Ini</div>
        <div className="text-2xl font-bold mt-1">{fmtIDR(sumToday)}</div>
        <div className="text-xs text-gray-400">Tanggal: {today}</div>
      </Card>
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-gray-500">7 Hari Terakhir</div>
            <div className="text-xs text-gray-400">Total per hari</div>
          </div>
          <Sparkline data={chart} />
        </div>
      </Card>
    </div>
  );
}

/*********************\
|  Products           |
\*********************/
function ProductsView() {
  const [q, setQ] = useState("");
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const rows = await api.products.list(q);
      setList(rows);
    } finally { setLoading(false); }
  }
  useEffect(()=>{ load(); /* eslint-disable-next-line */ },[]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Input value={q} onChange={e=>setQ(e.target.value)} placeholder="Cari produk..." />
        <Button onClick={load}>Cari</Button>
      </div>
      <Card>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2">Nama</th>
                <th>Kategori</th>
                <th>Stok</th>
                <th>Harga Jual</th>
                <th>Unit</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {list.map(p=>(
                <tr key={p.id} className="border-b">
                  <td className="py-2">{p.name}</td>
                  <td>{p.category}</td>
                  <td>{p.stockQty}</td>
                  <td>{fmtIDR(p.sellPrice)}</td>
                  <td>{p.unit}</td>
                  <td className="text-right">
                    <Button className="bg-green-600 text-white"
                      onClick={async ()=>{
                        const qStr = prompt(`Tambah stok untuk "${p.name}" (qty)?`, "1");
                        if (!qStr) return;
                        const qty = parseInt(qStr,10);
                        if (!Number.isFinite(qty) || qty<=0) return alert("Qty tidak valid");
                        const ucStr = prompt(`Harga beli per ${p.unit}? (opsional, kosongkan jika tidak dicatat)`, "");
                        const unitCost = ucStr ? parseInt(ucStr,10) : undefined;
                        if (ucStr && (!Number.isFinite(unitCost) || unitCost<0)) return alert("Harga beli tidak valid");
                        try {
                          await api.products.addStock(p.id, { qty, unitCost });
                          await load();
                          alert("Stok ditambahkan");
                        } catch(e) { alert(e.message); }
                      }}
                    >Tambah Stok</Button>
                  </td>
                </tr>
              ))}
              {(!loading && list.length===0) && (
                <tr><td colSpan={6} className="text-center py-6 text-gray-400">Tidak ada produk</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/*********************\
|  Reports            |
\*********************/
function ReportsView() {
  const end = new Date(); end.setHours(0,0,0,0);
  const start = new Date(end); start.setDate(start.getDate()-7);

  const [range, setRange] = useState({ from: ymdLocal(start), to: ymdLocal(end) });
  const [sales, setSales] = useState({ total: 0, list: [] });
  const [stockIn, setStockIn] = useState({ totalQty: 0, totalValue: 0, list: [] });

  async function load() {
    const s = await api.reports.sales(range.from, range.to);
    const si = await api.reports.stockIn(range.from, range.to);
    setSales(s);
    setStockIn(si);
  }
  useEffect(()=>{ load(); /* eslint-disable-next-line */ },[]);
  async function applyRange(e) { e.preventDefault(); await load(); }

  return (
    <div className="space-y-4">
      <Card>
        <form onSubmit={applyRange} className="flex items-end gap-2">
          <div>
            <Label>Dari</Label>
            <Input type="date" value={range.from} onChange={e=>setRange(r=>({...r, from:e.target.value}))} />
          </div>
          <div>
            <Label>Sampai</Label>
            <Input type="date" value={range.to} onChange={e=>setRange(r=>({...r, to:e.target.value}))} />
          </div>
          <Button className="bg-blue-600 text-white" type="submit">Terapkan</Button>
        </form>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <div className="text-gray-500">Total Penjualan</div>
          <div className="text-2xl font-bold mt-1">{fmtIDR(sales.total)}</div>
          <div className="mt-2">
            <Button onClick={()=>{
              const rows = [["Tanggal","Invoice","Total"]];
              sales.list.forEach(s=>{
                rows.push([new Date(s.date).toLocaleString('id-ID'), s.invoiceNo, s.grandTotal]);
              });
              downloadCSV("penjualan.csv", rows);
            }}>Ekspor Penjualan (CSV)</Button>
          </div>
        </Card>

        <Card>
          <div className="text-gray-500">Barang Masuk</div>
          <div className="text-sm text-gray-600">Qty: <b>{stockIn.totalQty}</b></div>
          <div className="text-sm text-gray-600">Nilai: <b>{fmtIDR(stockIn.totalValue)}</b></div>
          <div className="mt-2">
            <Button onClick={()=>{
              const rows = [["Tanggal","Produk","Qty","Harga Beli","Nilai","Catatan"]];
              stockIn.list.forEach(m=>{
                rows.push([
                  new Date(m.date).toLocaleString('id-ID'),
                  m.productName, m.qty, m.unitCost, m.value, m.note || ''
                ]);
              });
              downloadCSV("barang_masuk.csv", rows);
            }}>Ekspor Barang Masuk (CSV)</Button>
          </div>
        </Card>
      </div>

      <Card className="md:col-span-2">
        <div className="text-lg font-semibold mb-2">Detail Barang Masuk</div>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2">Tanggal</th>
                <th>Produk</th>
                <th>Qty</th>
                <th>Harga Beli</th>
                <th>Nilai</th>
                <th>Catatan</th>
              </tr>
            </thead>
            <tbody>
              {stockIn.list.map(m=>(
                <tr key={m.id} className="border-b">
                  <td className="py-2">{new Date(m.date).toLocaleString('id-ID')}</td>
                  <td>{m.productName}</td>
                  <td>{m.qty}</td>
                  <td>{fmtIDR(m.unitCost)}</td>
                  <td>{fmtIDR(m.value)}</td>
                  <td>{m.note}</td>
                </tr>
              ))}
              {stockIn.list.length===0 && (
                <tr><td colSpan={6} className="text-center py-6 text-gray-400">Tidak ada data barang masuk</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/*********************\
|  Customers (ringkas)|
\*********************/
function CustomersView() {
  const [list, setList] = useState([]);
  useEffect(()=>{ (async ()=> setList(await api.customers.list()))(); },[]);
  return (
    <Card>
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left border-b"><th className="py-2">Nama</th><th>Telp</th><th>Alamat</th></tr></thead>
          <tbody>
            {list.map(c=>(
              <tr key={c.id} className="border-b">
                <td className="py-2">{c.name}</td><td>{c.phone||"-"}</td><td>{c.address||"-"}</td>
              </tr>
            ))}
            {list.length===0 && <tr><td colSpan={3} className="py-6 text-center text-gray-400">Belum ada pelanggan</td></tr>}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/*********************\
|  Sales placeholder  |
\*********************/
function SalesView() {
  return (
    <Card>
      <div className="text-gray-500">Kasir sementara: gunakan modul yang sudah kamu punya sebelumnya.</div>
      <div className="text-sm text-gray-400">Integrasi ke API /sales sudah tersedia.</div>
    </Card>
  );
}

/*********************\
|  Settings           |
\*********************/
function SettingsView() {
  const [shop, setShop] = useState(()=>({
    name: localStorage.getItem("shop_name") || "BUMDESMA KETAPANG SILINDA",
    address: localStorage.getItem("shop_addr") || "Dusun I Desa Sungai Buaya",
  }));
  function save() {
    localStorage.setItem("shop_name", shop.name);
    localStorage.setItem("shop_addr", shop.address);
    alert("Tersimpan");
  }
  return (
    <Card className="max-w-xl">
      <div className="text-lg font-semibold mb-3">Informasi Toko</div>
      <Label>Nama Toko</Label>
      <Input value={shop.name} onChange={e=>setShop(s=>({ ...s, name:e.target.value }))} />
      <Label className="mt-3">Alamat</Label>
      <Input value={shop.address} onChange={e=>setShop(s=>({ ...s, address:e.target.value }))} />
      <Button className="mt-4 bg-blue-600 text-white" onClick={save}>Simpan</Button>
    </Card>
  );
}

/*********************\
|  App Root           |
\*********************/
export default function App() {
  const { token, setToken, clearToken } = useToken();
  const [logged, setLogged] = useState(!!token);
  const [page, setPage] = useState("dashboard");

  // muat data untuk dashboard: ambil 14 hari transaksi (pakai endpoint sales saja)
  const [salesRecent, setSalesRecent] = useState([]);
  useEffect(()=>{
    if (!logged) return;
    (async ()=>{
      try {
        const rows = await api.sales.list(""); // semua status
        // ambil 14 hari terakhir
        const cutoff = new Date(); cutoff.setDate(cutoff.getDate()-14);
        setSalesRecent(rows.filter(s => new Date(s.date) >= cutoff));
      } catch {}
    })();
  }, [logged]);

  function logout() {
    clearToken();
    setLogged(false);
  }

  if (!logged) return <LoginView onLogin={()=>setLogged(true)} setToken={setToken} />;

  return (
    <Layout page={page} setPage={setPage} onLogout={logout}>
      {page==="dashboard" && <Dashboard salesRecent={salesRecent} />}
      {page==="products"  && <ProductsView />}
      {page==="sales"     && <SalesView />}
      {page==="customers" && <CustomersView />}
      {page==="reports"   && <ReportsView />}
      {page==="settings"  && <SettingsView />}
    </Layout>
  );
}
