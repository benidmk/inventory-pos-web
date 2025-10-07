// src/views/ReportViews.jsx
import { useEffect, useState } from "react";
import api from "../api/apiClient";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Label from "../components/ui/Label";
import { downloadCSV, fmtIDR, ymdLocal } from "../utils/format";
import InvoiceDetailModal from "../components/InvoiceDetailModal";

export default function ReportsView() {
  // default range: 7 hari terakhir (lokal)
  const end = new Date(); end.setHours(0, 0, 0, 0);
  const start = new Date(end); start.setDate(start.getDate() - 7);

  const [range, setRange] = useState({ from: ymdLocal(start), to: ymdLocal(end) });
  const [sales, setSales] = useState({ total: 0, list: [] });
  const [stockIn, setStockIn] = useState({ totalQty: 0, totalValue: 0, list: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // modal detail
  const [openDetail, setOpenDetail] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState(null);
  const [selectedSale, setSelectedSale] = useState(null); // <- penting untuk prefill modal

  async function load() {
    setLoading(true);
    setError("");
    try {
      const r = await api.reports.sales(range.from, range.to);
      const sIn = await api.reports.stockIn(range.from, range.to);
      setSales(r);
      setStockIn(sIn);
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
      setSales({ total: 0, list: [] });
      setStockIn({ totalQty: 0, totalValue: 0, list: [] });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [range]);

  function exportSalesCSV() {
    const rows = [["Tanggal", "Invoice", "Total", "Status"]];
    sales.list.forEach(s => rows.push([
      new Date(s.date).toLocaleString("id-ID"),
      s.invoiceNo, s.grandTotal, s.paymentStatus
    ]));
    downloadCSV("penjualan.csv", rows);
  }

  function exportStockInCSV() {
    const rows = [["Tanggal", "Produk", "Qty", "Harga Beli", "Nilai", "Catatan"]];
    stockIn.list.forEach(m => rows.push([
      new Date(m.date).toLocaleString("id-ID"),
      m.productName, m.qty, m.unitCost, m.value, m.note || ""
    ]));
    downloadCSV("barang_masuk.csv", rows);
  }

  function showDetail(sale) {
    setSelectedSaleId(sale.id);  // untuk fetch detail
    setSelectedSale(sale);       // prefill agar header langsung tampil
    setOpenDetail(true);
  }

  return (
    <div className="grid md:grid-cols-3 gap-4">
      <Card className="md:col-span-3">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <Label>Dari</Label>
            <Input
              type="date"
              value={range.from}
              onChange={e => setRange({ ...range, from: e.target.value })}
            />
          </div>
          <div>
            <Label>Sampai</Label>
            <Input
              type="date"
              value={range.to}
              onChange={e => setRange({ ...range, to: e.target.value })}
            />
          </div>
          <Button onClick={exportSalesCSV}>Ekspor Penjualan (CSV)</Button>
          <Button onClick={exportStockInCSV}>Ekspor Barang Masuk (CSV)</Button>
        </div>
        {loading && <div className="mt-2 text-sm text-gray-500">Memuat laporan…</div>}
        {error && <div className="mt-2 text-sm text-red-600">Error: {error}</div>}
      </Card>

      <Card>
        <div className="text-gray-500">Total Penjualan</div>
        <div className="text-2xl font-bold">{fmtIDR(sales.total)}</div>
      </Card>

      <Card>
        <div className="text-gray-500">Barang Masuk</div>
        <div className="text-sm text-gray-400">Qty: {stockIn.totalQty}</div>
        <div className="text-sm text-gray-400">Nilai: {fmtIDR(stockIn.totalValue)}</div>
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
              {stockIn.list.map(m => (
                <tr key={m.id} className="border-b">
                  <td className="py-2">{new Date(m.date).toLocaleString("id-ID")}</td>
                  <td>{m.productName}</td>
                  <td>{m.qty}</td>
                  <td>{fmtIDR(m.unitCost)}</td>
                  <td>{fmtIDR(m.value)}</td>
                  <td>{m.note}</td>
                </tr>
              ))}
              {stockIn.list.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-gray-400">
                    Tidak ada data barang masuk
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Tabel Penjualan */}
      <Card className="md:col-span-3">
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2">Tanggal</th>
                <th>Invoice</th>
                <th>Total</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {sales.list.map(s => (
                <tr key={s.id} className="border-b">
                  <td className="py-2">{new Date(s.date).toLocaleString("id-ID")}</td>
                  <td>{s.invoiceNo}</td>
                  <td>{fmtIDR(s.grandTotal)}</td>
                  <td>{s.paymentStatus}</td>
                  <td>
                    <Button onClick={() => showDetail(s)} variant="secondary" size="sm">
                      Detail
                    </Button>
                  </td>
                </tr>
              ))}
              {sales.list.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-gray-400">
                    Tidak ada data
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Detail */}
      <InvoiceDetailModal
        open={openDetail}
        onClose={() => setOpenDetail(false)}
        saleId={selectedSaleId}
        initial={selectedSale}
      />
    </div>
  );
}
