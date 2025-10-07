// src/components/InvoiceDetailModal.jsx
import { useEffect, useState } from "react";
import api from "../api/apiClient";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";

const fmtIDR = (n) => (n ?? 0).toLocaleString("id-ID");

export default function InvoiceDetailModal({ open, onClose, saleId, initial }) {
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState(initial || null);
  const [error, setError] = useState("");

  // jika initial berubah (klik baris lain), update prefill
  useEffect(() => {
    if (open) setDetail(initial || null);
  }, [open, initial]);

  useEffect(() => {
    if (!open || !saleId) return;
    const ctrl = new AbortController();
    setLoading(true);
    setError("");

    api.sales.detail(saleId)
      .then((d) => setDetail(d))
      .catch((e) => {
        // tampilkan error jelas agar tahu penyebab (401/404/dll.)
        setError(e?.message || "Gagal memuat detail");
      })
      .finally(() => setLoading(false));

    return () => ctrl.abort();
  }, [open, saleId]);

  if (!open) return null;

  // header yang bisa tampil instan:
  const header = {
    invoiceNo: detail?.invoiceNo ?? initial?.invoiceNo ?? "-",
    date: detail?.date ?? initial?.date ?? null,
    paymentStatus: detail?.paymentStatus ?? initial?.paymentStatus ?? "-",
    grandTotal: detail?.grandTotal ?? initial?.grandTotal ?? 0,
    // customer dari initial mungkin kosong, jadi fallback ke detail
    customerName: detail?.customer?.name ?? "-",
    customerPhone: detail?.customer?.phone ?? "-",
    customerAddress: detail?.customer?.address ?? "-",
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl">
        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-semibold">Detail Invoice</div>
          <Button onClick={onClose} variant="secondary">Tutup</Button>
        </div>

        {/* Status */}
        {loading && <div className="text-sm text-gray-500">Memuat detail…</div>}
        {error && <div className="text-sm text-red-600">Error: {error}</div>}

        {/* Header */}
        <div className="grid md:grid-cols-2 gap-2 text-sm mt-2">
          <div><span className="text-gray-500">Invoice:</span> <b>{header.invoiceNo}</b></div>
          <div><span className="text-gray-500">Tanggal:</span> {header.date ? new Date(header.date).toLocaleString("id-ID") : "-"}</div>
          <div><span className="text-gray-500">Pembeli:</span> {header.customerName}</div>
          <div><span className="text-gray-500">Telepon:</span> {header.customerPhone}</div>
          <div className="md:col-span-2"><span className="text-gray-500">Alamat:</span> {header.customerAddress}</div>
          <div><span className="text-gray-500">Status:</span> {header.paymentStatus}</div>
          <div><span className="text-gray-500">Grand Total:</span> Rp {fmtIDR(header.grandTotal)}</div>
        </div>

        {/* Items */}
        <div className="border-t pt-3 mt-3">
          <div className="font-semibold mb-2">Barang Dibeli</div>
          {!detail?.items?.length && !loading && !error && (
            <div className="text-sm text-gray-500">Belum ada detail item (cek endpoint /sales/:id/detail).</div>
          )}
          {!!detail?.items?.length && (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-1">Produk</th>
                    <th className="py-1">Unit</th>
                    <th className="py-1">Qty</th>
                    <th className="py-1">Harga</th>
                    <th className="py-1">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.items.map((it, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-1">{it.productName}</td>
                      <td className="py-1">{it.unit}</td>
                      <td className="py-1">{it.qty}</td>
                      <td className="py-1">Rp {fmtIDR(it.unitPrice)}</td>
                      <td className="py-1">Rp {fmtIDR(it.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
