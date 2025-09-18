import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

/**
 * Inventory POS – Frontend (API Edition)
 * UI sama seperti versi canvas sebelumnya, tapi data diambil dari BACKEND Railway.
 * 
 * Cara pakai:
 * 1) Ganti BASE_URL di bawah sesuai domain backend Railway kamu.
 * 2) Jalankan React app, login pakai password admin dari env backend.
 * 3) Semua operasi (produk/pelanggan/transaksi/pembayaran/laporan) lewat REST API.
 */

/*********************\
|  API Client         |
\*********************/
const BASE_URL = import.meta?.env?.VITE_API_BASE_URL || "https://bumdesma.up.railway.app/api/v1"; // TODO: ganti .env Vite

function getToken() { return localStorage.getItem('token') || ''; }
function setToken(t) { localStorage.setItem('token', t || ''); }
function clearToken() { localStorage.removeItem('token'); }

async function request(path, { method='GET', body, headers={} }={}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(getToken()? { Authorization: `Bearer ${getToken()}` } : {}),
      ...headers
    },
    body: body? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const j = await res.json(); msg = j.error || msg; } catch {}
    throw new Error(msg);
  }
  return res.json();
}

const api = {
  login: (password) => request('/auth/login', { method:'POST', body:{ password } }),
  products: {
    list: (q='') => request(`/products${q?`?q=${encodeURIComponent(q)}`:''}`),
    create: (p) => request('/products', { method:'POST', body:p }),
    update: (id, p) => request(`/products/${id}`, { method:'PUT', body:p }),
    remove: (id) => request(`/products/${id}`, { method:'DELETE' }),
  },
  customers: {
    list: () => request('/customers'),
    create: (c) => request('/customers', { method:'POST', body:c }),
    update: (id, c) => request(`/customers/${id}`, { method:'PUT', body:c }),
    remove: (id) => request(`/customers/${id}`, { method:'DELETE' }),
  },
  sales: {
    create: (payload) => request('/sales', { method:'POST', body:payload }),
    listOpen: () => request('/sales?status=open'),
  },
  payments: {
    create: (p) => request('/payments', { method:'POST', body:p }),
  },
  reports: {
    sales: (from, to) => request(`/reports/sales?from=${from}&to=${to}`),
  },
};

function ymdLocal(d) {
  // kembalikan 'YYYY-MM-DD' dalam zona waktu browser (lokal)
  const x = new Date(d);
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); // normalisasi ke lokal
  return x.toISOString().slice(0, 10);
}
function fmtIDR(n) {
  if (isNaN(n)) return "-";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}
function todayISO() {
  return ymdLocal(new Date());
}
function daysBetween(a, b) {
  const A = new Date(a), B = new Date(b);
  return Math.round((B - A) / (1000 * 60 * 60 * 24));
}
function downloadCSV(filename, rows) {
  const process = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = rows.map(r => r.map(process).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/*********************\
|  Basic UI           |
\*********************/
function Card({ children, className = "" }) {
  return <div className={`bg-white rounded-2xl shadow p-4 ${className}`}>{children}</div>;
}
function Button({ children, onClick, type = "button", className = "" }) {
  return (
    <button type={type} onClick={onClick} className={`px-4 py-2 rounded-xl shadow hover:shadow-md active:scale-[.99] transition border border-gray-200 ${className}`}>
      {children}
    </button>
  );
}
function Input({ className = "", ...props }) {
  return <input className={`px-3 py-2 rounded-xl border w-full border-gray-300 focus:outline-none focus:ring focus:ring-blue-200 ${className}`} {...props} />;
}
function Select({ className = "", children, ...props }) {
  return <select className={`px-3 py-2 rounded-xl border w-full border-gray-300 focus:outline-none focus:ring focus:ring-blue-200 ${className}`} {...props}>{children}</select>;
}
function Label({ children }) {
  return <label className="text-sm text-gray-600 mb-1 block">{children}</label>;
}

/*********************\
|  Auth               |
\*********************/
function LoginView({ onLogin }) {
  const [pwd, setPwd] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    setLoading(true); setErr("");
    try {
      const { token } = await api.login(pwd);
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
        {/* Logo di atas form (center, responsif) */}
        <img
          src="/favicon.png?v=1"   /* cache-buster supaya nggak ke-cache */
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
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          placeholder="Password"
        />

        <Button
          className="mt-4 bg-blue-600 text-white w-full"
          onClick={submit}
          disabled={loading}
        >
          {loading ? "Memeriksa..." : "Masuk"}
        </Button>

        {err && <div className="text-red-600 text-sm mt-2">{err}</div>}
      </Card>
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
    const key = ymdLocal(d);      // <— pakai lokal
    map.set(key, 0);
  }
  list.forEach(s => {
    const key = ymdLocal(s.date); // <— pakai lokal
    if (map.has(key)) map.set(key, map.get(key) + s.grandTotal);
  });
  return Array.from(map.entries()).map(([date, total]) => ({ date, total }));
}

function Dashboard({ products, salesRecent, settings }) {
  const today = todayISO();
  const todaySales = useMemo(() => salesRecent.filter(s => ymdLocal(s.date) === today), [salesRecent, today]);
  const totalToday = useMemo(() => todaySales.reduce((a, s) => a + s.grandTotal, 0), [todaySales]);

  const [span, setSpan] = useState(7);
  const chartData = useMemo(() => aggregateDailyFromSales(salesRecent, span), [salesRecent, span]);

  // stok kritis/kadaluarsa dihitung dari products
  const lowStock = products.filter(p => (p.stockQty ?? 0) <= 5);
  const nearExpiry = products.filter(p => p.expiryDate && daysBetween(today, p.expiryDate.slice(0,10)) <= 30);

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <Card>
        <div className="text-gray-500">Penjualan Hari Ini</div>
        <div className="text-3xl font-bold">{fmtIDR(totalToday)}</div>
        <div className="text-sm text-gray-400 mt-1">{todaySales.length} transaksi</div>
      </Card>
      <Card>
        <div className="text-gray-500">Stok Kritis</div>
        <div className="text-3xl font-bold">{lowStock.length}</div>
        <div className="mt-2 max-h-32 overflow-auto space-y-1">
          {lowStock.slice(0,6).map(p => <div key={p.id} className="text-sm">• {p.name} ({p.stockQty} {p.unit})</div>)}
          {lowStock.length===0 && <div className="text-sm text-gray-400">Tidak ada</div>}
        </div>
      </Card>
      <Card>
        <div className="text-gray-500">Kadaluarsa Dekat</div>
        <div className="text-3xl font-bold">{nearExpiry.length}</div>
        <div className="mt-2 max-h-32 overflow-auto space-y-1">
          {nearExpiry.slice(0,6).map(p => <div key={p.id} className="text-sm">• {p.name} (exp {p.expiryDate?.slice(0,10)})</div>)}
          {nearExpiry.length===0 && <div className="text-sm text-gray-400">Tidak ada</div>}
        </div>
      </Card>

      <Card className="lg:col-span-3">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold">Grafik Penjualan</div>
          <div className="flex gap-2">
            <Button className={span===7?"bg-blue-600 text-white":""} onClick={()=>setSpan(7)}>7 Hari</Button>
            <Button className={span===30?"bg-blue-600 text-white":""} onClick={()=>setSpan(30)}>30 Hari</Button>
          </div>
        </div>
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(v)=>fmtIDR(v)} />
              <Bar dataKey="total" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

/*********************\
|  Products CRUD (API)|
\*********************/
function ProductsView() {
  const blank = { id: "", name: "", category: "Pupuk", unit: "sak", costPrice: 0, sellPrice: 0, stockQty: 0, expiryDate: "", imageUrl: "" };
  const [form, setForm] = useState(blank);
  const [q, setQ] = useState("");
  const [list, setList] = useState([]);

  async function load() {
    const data = await api.products.list(q);
    setList(data);
  }
  useEffect(()=>{ load(); }, [q]);

  async function save() {
    if (!form.name) return alert("Nama wajib diisi");
    if (!form.id) {
      await api.products.create({ ...form, expiryDate: form.expiryDate || null, imageUrl: form.imageUrl || null });
    } else {
      const id = form.id; const { id:_, ...payload } = form;
      await api.products.update(id, { ...payload, expiryDate: form.expiryDate || null, imageUrl: form.imageUrl || null });
    }
    setForm(blank); await load();
  }
  function edit(p) { setForm({ ...p, expiryDate: p.expiryDate? p.expiryDate.slice(0,10): '' }); }
  async function remove(p) { if (!confirm(`Hapus ${p.name}?`)) return; await api.products.remove(p.id); await load(); }

  return (
    <div className="grid md:grid-cols-3 gap-4">
      <Card className="md:col-span-1">
        <h2 className="text-lg font-semibold mb-3">Tambah/Ubah Produk</h2>
        <div className="space-y-2">
          <div>
            <Label>Nama</Label>
            <Input value={form.name} onChange={e=>setForm({ ...form, name:e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Kategori</Label>
              <Select value={form.category} onChange={e=>setForm({ ...form, category:e.target.value })}>
                <option>Pupuk</option>
                <option>Obat</option>
              </Select>
            </div>
            <div>
              <Label>Satuan</Label>
              <Select value={form.unit} onChange={e=>setForm({ ...form, unit:e.target.value })}>
                <option>sak</option>
                <option>ml</option>
                <option>liter</option>
                <option>kg</option>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Harga Beli</Label>
              <Input type="number" value={form.costPrice} onChange={e=>setForm({ ...form, costPrice:Number(e.target.value) })} />
            </div>
            <div>
              <Label>Harga Jual</Label>
              <Input type="number" value={form.sellPrice} onChange={e=>setForm({ ...form, sellPrice:Number(e.target.value) })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Stok</Label>
              <Input type="number" value={form.stockQty} onChange={e=>setForm({ ...form, stockQty:Number(e.target.value) })} />
            </div>
            <div>
              <Label>Kadaluarsa</Label>
              <Input type="date" value={form.expiryDate} onChange={e=>setForm({ ...form, expiryDate:e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Gambar (URL)</Label>
            <Input value={form.imageUrl} onChange={e=>setForm({ ...form, imageUrl:e.target.value })} placeholder="https://..." />
          </div>
          <div className="flex gap-2 pt-2">
            <Button className="bg-green-600 text-white" onClick={save}>{form.id?"Simpan Perubahan":"Tambah"}</Button>
            <Button className="bg-gray-100" onClick={()=>setForm(blank)}>Reset</Button>
          </div>
        </div>
      </Card>

      <Card className="md:col-span-2">
        <div className="flex items-center justify-between mb-3 gap-2">
          <Input placeholder="Cari produk..." value={q} onChange={e=>setQ(e.target.value)} />
          <Button onClick={()=>{
            const rows = [["Nama","Kategori","Satuan","Stok","Harga Beli","Harga Jual","Kadaluarsa"]];
            list.forEach(p=>rows.push([p.name,p.category,p.unit,p.stockQty,p.costPrice,p.sellPrice,p.expiryDate]));
            downloadCSV("produk.csv", rows);
          }}>Ekspor CSV</Button>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2">Produk</th>
                <th>Kategori</th>
                <th>Stok</th>
                <th>Harga Jual</th>
                <th>Kadaluarsa</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.map(p=> (
                <tr key={p.id} className="border-b hover:bg-gray-50">
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      {p.imageUrl && <img src={p.imageUrl} alt="thumb" className="w-10 h-10 object-cover rounded" />}
                      <div>
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-gray-500">{fmtIDR(p.sellPrice)} / {p.unit}</div>
                      </div>
                    </div>
                  </td>
                  <td>{p.category}</td>
                  <td>{p.stockQty}</td>
                  <td>{fmtIDR(p.sellPrice)}</td>
                  <td>{p.expiryDate?.slice(0,10) || '-'}</td>
                  <td className="text-right">
                    <Button className="text-blue-700" onClick={()=>edit(p)}>Edit</Button>
                    <Button className="ml-2 text-red-700" onClick={()=>remove(p)}>Hapus</Button>
                    {/* Tambah stok */}
                    <Button className="ml-2 bg-green-600 text-white" onClick={async ()=>{
                      const q = prompt(`Tambah stok untuk "${p.name}" (qty)?`, "1");
                      if (!q) return;
                      const qty = parseInt(q, 10);
                      if (!Number.isFinite(qty) || qty <= 0) return alert('Qty tidak valid');

                      const ucStr = prompt(`Harga beli per ${p.unit}? (opsional, kosongkan jika tidak dicatat)`, "");
                      const unitCost = ucStr ? parseInt(ucStr, 10) : undefined;
                      if (ucStr && (!Number.isFinite(unitCost) || unitCost < 0)) return alert('Harga beli tidak valid');

                      try {
                        await api.products.addStock(p.id, { qty, unitCost });
                        await load();
                        alert('Stok ditambahkan');
                      } catch(e) {
                        alert(e.message);
                      }
                    }}>Tambah Stok</Button>
                  </td>
                </tr>
              ))}
              {list.length===0 && (
                <tr><td colSpan={6} className="text-center py-6 text-gray-400">Belum ada produk</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/*********************\
|  Customers          |
\*********************/
function CustomersView({ setTab, setPaymentFilterCustomer, sales, payments }) {
  const blank = { id: "", name: "", phone: "", address: "", notes: "" };
  const [form, setForm] = useState(blank);
  const [q, setQ] = useState("");
  const [list, setList] = useState([]);

  async function load() { setList(await api.customers.list()); }
  useEffect(()=>{ load(); }, []);

  async function save() {
    if (!form.name) return alert("Nama wajib diisi");
    if (!form.id) await api.customers.create(form);
    else await api.customers.update(form.id, form);
    setForm(blank); await load();
  }
  async function remove(c) { if (!confirm(`Hapus ${c.name}?`)) return; await api.customers.remove(c.id); await load(); }

  const filtered = useMemo(()=> list.filter(c => c.name.toLowerCase().includes(q.toLowerCase())), [list, q]);

  // hitung saldo dari sales+payments (opsional; bisa juga bikin endpoint khusus)
  function balanceOf(customerId) {
    const custSales = (sales||[]).filter(s=>s.customerId===customerId);
    const billed = custSales.reduce((a,s)=>a+s.grandTotal,0);
    const paid = (payments||[]).filter(p=> custSales.some(s=> s.id===p.saleId)).reduce((a,p)=>a+p.amount,0);
    return billed - paid;
  }

  return (
    <div className="grid md:grid-cols-3 gap-4">
      <Card>
        <h2 className="text-lg font-semibold mb-3">Tambah/Ubah Pelanggan</h2>
        <div className="space-y-2">
          <div>
            <Label>Nama</Label>
            <Input value={form.name} onChange={e=>setForm({ ...form, name:e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Telepon</Label>
              <Input value={form.phone} onChange={e=>setForm({ ...form, phone:e.target.value })} />
            </div>
            <div>
              <Label>Alamat</Label>
              <Input value={form.address} onChange={e=>setForm({ ...form, address:e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Catatan</Label>
            <Input value={form.notes} onChange={e=>setForm({ ...form, notes:e.target.value })} />
          </div>
          <div className="flex gap-2 pt-2">
            <Button className="bg-green-600 text-white" onClick={save}>{form.id?"Simpan":"Tambah"}</Button>
            <Button onClick={()=>setForm(blank)}>Reset</Button>
          </div>
        </div>
      </Card>

      <Card className="md:col-span-2">
        <div className="flex items-center justify-between mb-3 gap-2">
          <Input placeholder="Cari pelanggan..." value={q} onChange={e=>setQ(e.target.value)} />
        </div>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2">Nama</th>
                <th>Telepon</th>
                <th>Alamat</th>
                <th>Sisa Utang</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c=> (
                <tr key={c.id} className="border-b hover:bg-gray-50">
                  <td className="py-2">{c.name}</td>
                  <td>{c.phone}</td>
                  <td>{c.address}</td>
                  <td className={balanceOf(c.id)>0?"text-red-600":"text-gray-700"}>{fmtIDR(balanceOf(c.id))}</td>
                  <td className="text-right">
                    <Button className="text-blue-700" onClick={()=>setForm(c)}>Edit</Button>
                    <Button className="ml-2 text-red-700" onClick={()=>remove(c)}>Hapus</Button>
                    <Button className="ml-2 bg-green-600 text-white" onClick={()=>{ setPaymentFilterCustomer(c.id); setTab("payments"); }}>Bayar Hutang</Button>
                  </td>
                </tr>
              ))}
              {filtered.length===0 && <tr><td colSpan={5} className="text-center py-6 text-gray-400">Belum ada pelanggan</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/*********************\
|  POS (Sales)        |
\*********************/
function POSView({ products, customers, reloadAll, settings }) {
  const [items, setItems] = useState([]); // {productId,name,unit,unitPrice,qty}
  const [customerId, setCustomerId] = useState("");
  const [note, setNote] = useState("");
  const [paid, setPaid] = useState(0);
  const [method, setMethod] = useState("Tunai");
  const [q, setQ] = useState("");

  const filteredProducts = useMemo(() => products.filter(p => p.name.toLowerCase().includes(q.toLowerCase())), [products, q]);
  const subtotal = useMemo(() => items.reduce((a,i)=> a + i.unitPrice * i.qty, 0), [items]);
  const grandTotal = subtotal;

  function addItem(p) {
    const exist = items.find(i => i.productId === p.id);
    if (exist) setItems(items.map(i => i.productId===p.id ? { ...i, qty: i.qty + 1 } : i));
    else setItems([{ productId: p.id, name: p.name, unitPrice: p.sellPrice, qty: 1, unit: p.unit }, ...items]);
  }
  function changeQty(id, qty) { setItems(items.map(i => i.productId===id ? { ...i, qty: Math.max(1, qty) } : i)); }
  function removeItem(id) { setItems(items.filter(i => i.productId !== id)); }

  function printReceipt(sale) {
    const width = (settings?.receiptWidth) || 80;
    const name = (settings?.storeName) || "BUMDESMA KETAPANG SILINDA";
    const addr = (settings?.storeAddress) || "Dusun I Desa Sungai Buaya";
    const phone = (settings?.storePhone) || "";

    const rows = sale.items.map(i => `<div class="row"><span>${i.name} x${i.qty}</span><span>${fmtIDR(i.unitPrice * i.qty)}</span></div>`).join("");

    const html = `<!DOCTYPE html><html><head><title>${sale.invoiceNo||''}</title><style>
      @page { size: ${width}mm auto; margin: 4mm; }
      body { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
      .title { font-weight: 700; font-size: 14px; text-align:center; }
      .small { font-size: 11px; text-align:center; white-space: pre-line; }
      .row { display:flex; justify-content:space-between; font-size:12px; }
      hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
    </style></head><body>
      <div class="title">${name}</div>
      <div class="small">${addr}${addr && phone ? "\n" : ""}${phone ? "Telp: "+phone : ""}</div>
      <hr />
      <div class="small">${new Date().toLocaleString('id-ID')} • ${sale.invoiceNo||''}</div>
      <hr />
      ${rows}
      <hr />
      <div class="row"><strong>Total</strong><strong>${fmtIDR(sale.grandTotal)}</strong></div>
      <div class="row"><span>Bayar</span><span>${fmtIDR(sale.amountPaid)}</span></div>
      <div class="row"><span>Status</span><span>${sale.paymentStatus}</span></div>
      <hr />
      <div class="small">Terima kasih.</div>
    </body></html>`;

    const printWin = window.open("", "_blank", "width=400,height=600");
    printWin.document.write(html);
    printWin.document.close();
    printWin.focus();
    printWin.print();
    printWin.close();
  }

  async function finalize() {
    if (items.length === 0) return alert("Belum ada item");
    const payload = { customerId: customerId || null, note, items: items.map(i=>({ productId: i.productId, qty: i.qty })), amountPaid: paid, method };
    try {
      const sale = await api.sales.create(payload);
      printReceipt({ ...sale, items, grandTotal, amountPaid: paid });
      setItems([]); setCustomerId(""); setNote(""); setPaid(0);
      alert(`Transaksi tersimpan. No: ${sale.invoiceNo}`);
      await reloadAll();
    } catch (e) {
      alert(e.message);
    }
  }

  return (
    <div className="grid md:grid-cols-3 gap-4">
      <Card className="md:col-span-2">
        <div className="flex items-center gap-2 mb-3">
          <Input placeholder="Cari produk untuk ditambahkan..." value={q} onChange={e=>setQ(e.target.value)} />
        </div>
        <div className="grid md:grid-cols-2 gap-3 max-h-64 overflow-auto">
          {filteredProducts.map(p => (
            <div key={p.id} className="border rounded-xl p-2 flex items-center justify-between">
              <div>
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-gray-500">{fmtIDR(p.sellPrice)} / {p.unit} • Stok: {p.stockQty}</div>
              </div>
              <Button className="bg-blue-600 text-white" onClick={()=>addItem(p)}>Tambah</Button>
            </div>
          ))}
          {filteredProducts.length===0 && <div className="text-gray-400">Tidak ada produk</div>}
        </div>

        <h3 className="text-lg font-semibold mt-4 mb-2">Keranjang</h3>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left border-b"><th>Item</th><th>Harga</th><th>Qty</th><th>Subtotal</th><th></th></tr></thead>
            <tbody>
              {items.map(i => (
                <tr key={i.productId} className="border-b">
                  <td className="py-2">{i.name}</td>
                  <td>{fmtIDR(i.unitPrice)}</td>
                  <td>
                    <Input type="number" value={i.qty} onChange={e=>changeQty(i.productId, Number(e.target.value))} className="w-20" />
                  </td>
                  <td>{fmtIDR(i.unitPrice * i.qty)}</td>
                  <td className="text-right"><Button className="text-red-700" onClick={()=>removeItem(i.productId)}>Hapus</Button></td>
                </tr>
              ))}
              {items.length===0 && <tr><td colSpan={5} className="text-center py-6 text-gray-400">Belum ada item</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold mb-3">Pembayaran</h3>
        <div className="space-y-2">
          <div>
            <Label>Pelanggan (untuk piutang)</Label>
            <Select value={customerId} onChange={e=>setCustomerId(e.target.value)}>
              <option value="">— Tanpa Pelanggan —</option>
              {customers.map(c => <option value={c.id} key={c.id}>{c.name}</option>)}
            </Select>
          </div>
          <div>
            <Label>Catatan</Label>
            <Input value={note} onChange={e=>setNote(e.target.value)} placeholder="contoh: bayar saat panen" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Subtotal</Label>
              <div className="font-semibold">{fmtIDR(grandTotal)}</div>
            </div>
            <div>
              <Label>Bayar Sekarang</Label>
              <Input type="number" value={paid} onChange={e=>setPaid(Number(e.target.value))} />
              <div className="text-xs text-gray-500 mt-1">Biarkan 0 untuk **pinjam** (piutang)</div>
            </div>
          </div>
          <div>
            <Label>Metode</Label>
            <Select value={method} onChange={e=>setMethod(e.target.value)}>
              <option>Tunai</option>
              <option>Transfer</option>
              <option>QRIS</option>
            </Select>
          </div>
          <Button className="bg-green-600 text-white w-full" onClick={finalize}>Simpan & Cetak</Button>
        </div>
      </Card>
    </div>
  );
}

/*********************\
|  Payments           |
\*********************/
function PaymentsView({ customers, paymentFilterCustomer, setPaymentFilterCustomer }) {
  const [q, setQ] = useState("");
  const [openSales, setOpenSales] = useState([]);
  const [paying, setPaying] = useState(null);
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState("Tunai");
  const [refNo, setRefNo] = useState("");

  async function load() {
    const data = await api.sales.listOpen();
    setOpenSales(data.map(s=> ({ ...s, customerName: customers.find(c=>c.id===s.customerId)?.name || '-' })));
  }
  useEffect(()=>{ load(); }, [customers]);

  function paidSum(sale) { return (sale.payments||[]).reduce((a,p)=>a+p.amount,0) || sale.amountPaid || 0; }
  function dueOf(sale) { return sale.grandTotal - paidSum(sale); }

  async function submitPayment() {
    if (!paying) return; const due = dueOf(paying);
    if (amount <= 0) return alert('Nominal harus > 0');
    if (amount > due) return alert('Nominal melebihi sisa tagihan');
    await api.payments.create({ saleId: paying.id, amount, method, refNo });
    setPaying(null); setAmount(0); setMethod('Tunai'); setRefNo('');
    await load();
    alert('Pembayaran tersimpan');
  }

  const filtered = useMemo(()=> openSales
    .filter(s => (paymentFilterCustomer? s.customerId===paymentFilterCustomer : true))
    .filter(s => [s.invoiceNo, s.customerName].join(' ').toLowerCase().includes(q.toLowerCase()))
    .sort((a,b)=> new Date(b.date) - new Date(a.date))
  , [openSales, q, paymentFilterCustomer]);

  return (
    <div className="grid gap-4">
      <Card>
        <div className="flex flex-wrap items-end gap-2">
          <div className="grow">
            <Label>Cari invoice / pelanggan</Label>
            <Input placeholder="Ketik nomor invoice atau nama pelanggan" value={q} onChange={e=>setQ(e.target.value)} />
          </div>
          {paymentFilterCustomer && (
            <Button onClick={()=>setPaymentFilterCustomer("")}>Hapus filter pelanggan</Button>
          )}
        </div>
      </Card>

      <Card>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left border-b"><th>Invoice</th><th>Tanggal</th><th>Pelanggan</th><th>Total</th><th>Terbayar</th><th>Sisa</th><th></th></tr></thead>
            <tbody>
              {filtered.map(s => {
                const paid = paidSum(s);
                const due = s.grandTotal - paid;
                return (
                  <tr key={s.id} className="border-b">
                    <td className="py-2 font-medium">{s.invoiceNo}</td>
                    <td>{new Date(s.date).toLocaleString('id-ID')}</td>
                    <td>{s.customerName}</td>
                    <td>{fmtIDR(s.grandTotal)}</td>
                    <td>{fmtIDR(paid)}</td>
                    <td className={due>0?"text-red-600":""}>{fmtIDR(due)}</td>
                    <td className="text-right"><Button className="bg-green-600 text-white" onClick={()=>{ setPaying(s); setAmount(due); }}>Bayar</Button></td>
                  </tr>
                );
              })}
              {filtered.length===0 && <tr><td colSpan={7} className="text-center py-6 text-gray-400">Tidak ada invoice terbuka</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      {paying && (
        <Card>
          <div className="font-semibold mb-2">Pembayaran untuk {paying.invoiceNo}</div>
          <div className="grid md:grid-cols-4 gap-3">
            <div>
              <Label>Nominal</Label>
              <Input type="number" value={amount} onChange={e=>setAmount(Number(e.target.value))} />
              <div className="text-xs text-gray-500 mt-1">Sisa tagihan: {fmtIDR(dueOf(paying))}</div>
            </div>
            <div>
              <Label>Metode</Label>
              <Select value={method} onChange={e=>setMethod(e.target.value)}>
                <option>Tunai</option>
                <option>Transfer</option>
                <option>QRIS</option>
              </Select>
            </div>
            <div>
              <Label>Ref/No. Bukti</Label>
              <Input value={refNo} onChange={e=>setRefNo(e.target.value)} placeholder="opsional" />
            </div>
            <div className="flex items-end gap-2">
              <Button className="bg-green-600 text-white" onClick={submitPayment}>Simpan</Button>
              <Button onClick={()=>setPaying(null)}>Batal</Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

/*********************\
|  Reports            |
\*********************/
function ReportsView() {
  function iso(d){ return d.toISOString().slice(0,10); }
  const end = new Date(); end.setHours(0,0,0,0);
  const start = new Date(end); start.setDate(start.getDate()-7);
  const [range, setRange] = useState({ from: ymdLocal(start), to: ymdLocal(end) });
  const [data, setData] = useState({ total: 0, list: [] });
  const [stockIn, setStockIn] = useState({ totalQty: 0, totalValue: 0, list: [] });

  async function load() {
    const r = await api.reports.sales(range.from, range.to);
    setData(r);
    const sIn = await api.reports.stockIn(range.from, range.to);
    setStockIn(sIn); // <—
  }
  useEffect(()=>{ load(); }, [range]);

  function exportSalesCSV() {
    const rows = [["Tanggal","Invoice","Pelanggan","Total"]];
    data.list.forEach(s=>rows.push([s.date, s.invoiceNo, s.customerId||"-", s.grandTotal]));
    downloadCSV("penjualan.csv", rows);
  }

  return (
    <div className="grid md:grid-cols-3 gap-4">
      <Card className="md:col-span-3">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <Label>Dari</Label>
            <Input type="date" value={range.from} onChange={e=>setRange({ ...range, from:e.target.value })} />
          </div>
          <div>
            <Label>Sampai</Label>
            <Input type="date" value={range.to} onChange={e=>setRange({ ...range, to:e.target.value })} />
          </div>
          <Button onClick={exportSalesCSV}>Ekspor Penjualan (CSV)</Button>
        </div>
      </Card>

      <Card>
        <div className="text-gray-500">Total Penjualan</div>
        <div className="text-2xl font-bold">{fmtIDR(data.total)}</div>
      </Card>

      {/* Ringkas Barang Masuk */}
      <Card>
        <div className="text-gray-500">Barang Masuk</div>
        <div className="text-sm text-gray-400">Qty: {stockIn.totalQty}</div>
        <div className="text-sm text-gray-400">Nilai: {fmtIDR(stockIn.totalValue)}</div>
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

      {/* Tabel Barang Masuk */}
      <Card className="md:col-span-3">
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

      <Card className="md:col-span-3">
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left border-b"><th>Tanggal</th><th>Invoice</th><th>Total</th><th>Status</th></tr></thead>
            <tbody>
              {data.list.map(s => (
                <tr key={s.id} className="border-b">
                  <td className="py-2">{new Date(s.date).toLocaleString("id-ID")}</td>
                  <td>{s.invoiceNo}</td>
                  <td>{fmtIDR(s.grandTotal)}</td>
                  <td>{s.paymentStatus}</td>
                </tr>
              ))}
              {data.list.length===0 && <tr><td colSpan={4} className="text-center py-6 text-gray-400">Tidak ada data</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/*********************\
|  Settings (local)   |
\*********************/
function SettingsView({ settings, setSettings }) {
  const [form, setForm] = useState(settings);
  return (
    <Card className="max-w-2xl">
      <h2 className="text-lg font-semibold mb-3">Pengaturan (local)</h2>
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <Label>Lebar Kertas Struk (mm)</Label>
          <Input type="number" value={form.receiptWidth} onChange={e=>setForm({ ...form, receiptWidth:Number(e.target.value) })} />
        </div>
        <div>
          <Label>Nama Toko</Label>
          <Input value={form.storeName} onChange={e=>setForm({ ...form, storeName:e.target.value })} />
        </div>
        <div>
          <Label>Alamat</Label>
          <Input value={form.storeAddress} onChange={e=>setForm({ ...form, storeAddress:e.target.value })} />
        </div>
        <div>
          <Label>Telepon</Label>
          <Input value={form.storePhone} onChange={e=>setForm({ ...form, storePhone:e.target.value })} />
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <Button className="bg-blue-600 text-white" onClick={()=>setSettings(form)}>Simpan</Button>
        <Button onClick={()=>setForm(settings)}>Reset</Button>
      </div>
      <p className="text-xs text-gray-400 mt-2">Catatan: Pengaturan ini hanya tersimpan di browser frontend (bukan di server).</p>
    </Card>
  );
}

/*********************\
|  App Shell          |
\*********************/
export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [logged, setLogged] = useState(!!getToken());
  const [paymentFilterCustomer, setPaymentFilterCustomer] = useState("");

  // data utama
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [salesRecent, setSalesRecent] = useState([]); // untuk dashboard chart

  // settings lokal (untuk struk & tampilan)
  const [settings, setSettings] = useState({ receiptWidth:80, storeName:"", storeAddress:"", storePhone:"" });

  async function reloadAll() {
    try {
      const [p, c] = await Promise.all([
        api.products.list(''),
        api.customers.list(),
      ]);
      setProducts(p); setCustomers(c);
      // ambil sales recent via reports (7-30 hari)
      const from = new Date(); from.setDate(from.getDate()-30);
      const to = new Date();
      const r = await api.reports.sales(from.toISOString().slice(0,10), to.toISOString().slice(0,10));
      setSalesRecent(r.list);
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(()=>{ if (logged) reloadAll(); }, [logged]);

  useEffect(() => {
    const s = localStorage.getItem('pos_settings');
    if (s) {
      try { setSettings(JSON.parse(s)); } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('pos_settings', JSON.stringify(settings));
  }, [settings]);

  if (!logged) return <LoginView onLogin={()=>setLogged(true)} />;

  const tabs = [
    { key: "dashboard", label: "Dashboard", icon: "🏠" },
    { key: "products", label: "Produk", icon: "📦" },
    { key: "pos", label: "Kasir", icon: "🧾" },
    { key: "customers", label: "Pelanggan", icon: "👥" },
    { key: "payments", label: "Pembayaran", icon: "💰" },
    { key: "reports", label: "Laporan", icon: "📈" },
    { key: "settings", label: "Settings", icon: "⚙️" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r sticky top-0 h-screen hidden md:flex md:flex-col">
        <div className="p-4 text-lg font-bold border-b">BUMDESMA SILINDA</div>
        <nav className="p-2 space-y-1 overflow-auto">
          {tabs.map(t => (
            <button key={t.key} onClick={()=>setTab(t.key)} className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-2 hover:bg-gray-100 ${tab===t.key?"bg-blue-600 text-white hover:bg-blue-600":""}`}>
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
        <div className="mt-auto p-2">
          <Button className="w-full" onClick={()=> { clearToken(); setLogged(false); }}>Keluar</Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0">
        <header className="md:hidden sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
          <div className="p-3 flex items-center justify-between">
            <div className="text-lg font-bold">BUMDESMA SILINDA</div>
            <div className="flex gap-2">
              <Button onClick={()=> { clearToken(); setLogged(false); }}>Keluar</Button>
            </div>
          </div>
          <div className="flex overflow-auto gap-2 p-2">
            {tabs.map(t => (
              <Button key={t.key} className={`${tab===t.key?"bg-blue-600 text-white":""}`} onClick={()=>setTab(t.key)}>{t.label}</Button>
            ))}
          </div>
        </header>

        <main className="max-w-6xl mx-auto p-4 space-y-4">
          {tab === "dashboard" && <Dashboard products={products} salesRecent={salesRecent} settings={settings} />}
          {tab === "products" && <ProductsView />}
          {tab === "pos" && <POSView products={products} customers={customers} reloadAll={reloadAll} settings={settings} />}
          {tab === "customers" && <CustomersView setTab={setTab} setPaymentFilterCustomer={setPaymentFilterCustomer} />}
          {tab === "payments" && <PaymentsView customers={customers} paymentFilterCustomer={paymentFilterCustomer} setPaymentFilterCustomer={setPaymentFilterCustomer} />}
          {tab === "reports" && <ReportsView />}
          {tab === "settings" && <SettingsView settings={settings} setSettings={setSettings} />}
        </main>

        <footer className="max-w-6xl mx-auto p-4 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} – Beni.
        </footer>
      </div>
    </div>
  );
}
