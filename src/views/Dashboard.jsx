import { useMemo, useState } from "react";
import Card from "../components/ui/Card";
import { fmtIDR, todayISO, ymdLocal, daysBetween } from "../utils/format";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
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
    const key = ymdLocal(d); // lokal
    map.set(key, 0);
  }
  list.forEach((s) => {
    const key = ymdLocal(s.date); // lokal
    if (map.has(key)) map.set(key, map.get(key) + s.grandTotal);
  });
  return Array.from(map.entries()).map(([date, total]) => ({ date, total }));
}

export default function Dashboard({ products, salesRecent }) {
  const today = todayISO();
  const todaySales = useMemo(
    () => salesRecent.filter((s) => ymdLocal(s.date) === today),
    [salesRecent, today]
  );
  const totalToday = useMemo(
    () => todaySales.reduce((a, s) => a + s.grandTotal, 0),
    [todaySales]
  );

  const [span, setSpan] = useState(7);
  const chartData = useMemo(
    () => aggregateDailyFromSales(salesRecent, span),
    [salesRecent, span]
  );

  const lowStock = products.filter((p) => (p.stockQty ?? 0) <= 5);
  const nearExpiry = products.filter(
    (p) => p.expiryDate && daysBetween(today, p.expiryDate.slice(0, 10)) <= 30
  );

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
          {lowStock.slice(0, 6).map((p) => (
            <div key={p.id} className="text-sm">• {p.name} ({p.stockQty} {p.unit})</div>
          ))}
          {lowStock.length === 0 && (
            <div className="text-sm text-gray-400">Tidak ada</div>
          )}
        </div>
      </Card>

      <Card>
        <div className="text-gray-500">Kadaluarsa Dekat</div>
        <div className="text-3xl font-bold">{nearExpiry.length}</div>
        <div className="mt-2 max-h-32 overflow-auto space-y-1">
          {nearExpiry.slice(0, 6).map((p) => (
            <div key={p.id} className="text-sm">
              • {p.name} (exp {p.expiryDate?.slice(0, 10)})
            </div>
          ))}
          {nearExpiry.length === 0 && (
            <div className="text-sm text-gray-400">Tidak ada</div>
          )}
        </div>
      </Card>

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
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(v) => fmtIDR(v)} />
              <Bar dataKey="total" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
