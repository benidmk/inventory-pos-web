// src/views/Dashboard.jsx
import { useEffect, useMemo, useState } from "react";
import api from "../api/apiClient";
import Card from "../components/ui/Card";
import { fmtIDR, todayISO, ymdLocal, daysBetween } from "../utils/format";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

function aggregateDailyFromSales(list, span = 7) {
  const map = new Map();
  const now = new Date();
  for (let i = span - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = ymdLocal(d);
    map.set(key, 0);
  }
  list.forEach((s) => {
    const key = ymdLocal(s.date);
    if (map.has(key)) map.set(key, map.get(key) + (s.grandTotal || 0));
  });
  return Array.from(map.entries()).map(([date, total]) => ({ date, total }));
}

export default function Dashboard({ products, salesRecent }) {
  const today = todayISO();

  // ==== KPI Penjualan Hari Ini (tetap dipakai untuk konteks harian) ====
  const todaySales = useMemo(
    () => salesRecent.filter((s) => ymdLocal(s.date) === today),
    [salesRecent, today]
  );
  const totalToday = useMemo(
    () => todaySales.reduce((a, s) => a + (s.grandTotal || 0), 0),
    [todaySales]
  );

  // ==== KPI All-time ====
  const [totalAll, setTotalAll] = useState(0);
  const [profitAll, setProfitAll] = useState(0);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [errorSummary, setErrorSummary] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoadingSummary(true);
        setErrorSummary("");

        const [ts, pf] = await Promise.all([
          api.reports.totalSales(), // all-time
          api.reports.profit(),     // all-time
        ]);

        setTotalAll(ts?.total || 0);
        setProfitAll(pf?.profit || 0);
      } catch (e) {
        setErrorSummary(e.message || "Gagal memuat ringkasan");
        setTotalAll(0);
        setProfitAll(0);
      } finally {
        setLoadingSummary(false);
      }
    })();
  }, []);

  // ==== Chart penjualan (7/30 hari) ====
  const [span, setSpan] = useState(7);
  const chartData = useMemo(
    () => aggregateDailyFromSales(salesRecent, span),
    [salesRecent, span]
  );

  // ==== Stok kritis & kadaluarsa ====
  const lowStock = products.filter((p) => (p.stockQty ?? 0) <= 5);
  const nearExpiry = products
    .filter((p) => p.expiryDate && daysBetween(today, p.expiryDate.slice(0, 10)) <= 30)
    .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));

  // ==== Small Skeleton ====
  const Skel = ({ w = "w-24", h = "h-8" }) => (
    <div className={`animate-pulse bg-gray-200 rounded ${w} ${h}`} />
  );

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      {/* Total Penjualan Keseluruhan */}
      <Card>
        <div className="text-gray-500">Total Penjualan Keseluruhan</div>
        <div className="mt-1 text-3xl font-extrabold tracking-tight">
          {loadingSummary ? <Skel w="w-40" h="h-9" /> : fmtIDR(totalAll)}
        </div>
        <div className="text-xs text-gray-400 mt-1">
          {errorSummary ? <span className="text-red-600">Error: {errorSummary}</span> : "Semua transaksi hingga saat ini"}
        </div>
      </Card>

      {/* Keuntungan Keseluruhan */}
      <Card>
        <div className="text-gray-500">Keuntungan Keseluruhan</div>
        <div className="mt-1 text-3xl font-extrabold tracking-tight">
          {loadingSummary ? <Skel w="w-40" h="h-9" /> : fmtIDR(profitAll)}
        </div>
        <div className="text-xs text-gray-400 mt-1">
          {errorSummary ? <span className="text-red-600">Error: {errorSummary}</span> : "Pendapatan - HPP (aproksimasi)"}
        </div>
      </Card>

      {/* Stok Kritis */}
      <Card>
        <div className="text-gray-500">Stok Kritis</div>
        <div className="mt-1 text-3xl font-extrabold tracking-tight">{lowStock.length}</div>
        <div className="mt-2 max-h-32 overflow-auto space-y-1">
          {lowStock.slice(0, 6).map((p) => (
            <div key={p.id} className="text-sm">• {p.name} ({p.stockQty} {p.unit})</div>
          ))}
          {lowStock.length === 0 && <div className="text-sm text-gray-400">Tidak ada</div>}
        </div>
      </Card>

      {/* Info harian kecil untuk kasir (opsional, tetap berguna) */}
      <Card>
        <div className="text-gray-500">Penjualan Hari Ini</div>
        <div className="mt-1 text-2xl font-bold">{fmtIDR(totalToday)}</div>
        <div className="text-xs text-gray-400 mt-1">{todaySales.length} transaksi</div>
      </Card>

      {/* Kadaluarsa dekat */}
      <Card>
        <div className="text-gray-500">Kadaluarsa Dekat (≤ 30 hari)</div>
        <div className="mt-1 text-2xl font-bold">{nearExpiry.length}</div>
        <div className="mt-2 max-h-32 overflow-auto space-y-1">
          {nearExpiry.slice(0, 6).map((p) => (
            <div key={p.id} className="text-sm">
              • {p.name} (exp {p.expiryDate?.slice(0, 10)})
            </div>
          ))}
          {nearExpiry.length === 0 && <div className="text-sm text-gray-400">Tidak ada</div>}
        </div>
      </Card>

      {/* Grafik Penjualan (Area) */}
      <Card className="lg:col-span-3">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold">Grafik Penjualan</div>
          <div className="flex gap-2">
            <button
              className={`px-3 py-1 rounded ${span === 7 ? "bg-blue-600 text-white" : "bg-gray-100"}`}
              onClick={() => setSpan(7)}
            >
              7 Hari
            </button>
            <button
              className={`px-3 py-1 rounded ${span === 30 ? "bg-blue-600 text-white" : "bg-gray-100"}`}
              onClick={() => setSpan(30)}
            >
              30 Hari
            </button>
          </div>
        </div>

        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="fillSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopOpacity={0.3} />
                  <stop offset="95%" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(v) => fmtIDR(v)} />
              <Area type="monotone" dataKey="total" fill="url(#fillSales)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
