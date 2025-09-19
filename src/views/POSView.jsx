import { useMemo, useState } from "react";
import api from "../api/apiClient";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import Label from "../components/ui/Label";
import { fmtIDR } from "../utils/format";
import { useToast } from "../components/toast/ToastProvider";
import { printHtml } from "../utils/print";


export default function POSView({ products, customers, reloadAll, settings }) {
  const [items, setItems] = useState([]); // {productId,name,unit,unitPrice,qty}
  const [customerId, setCustomerId] = useState("");
  const [note, setNote] = useState("");
  const [paid, setPaid] = useState(0);
  const [method, setMethod] = useState("Tunai");
  const [q, setQ] = useState("");
  const { push } = useToast();
  const [saving, setSaving] = useState(false);

  const filteredProducts = useMemo(
    () => products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase())),
    [products, q]
  );
  const subtotal = useMemo(
    () => items.reduce((a, i) => a + i.unitPrice * i.qty, 0),
    [items]
  );
  const grandTotal = subtotal;

  function addItem(p) {
    if ((p.stockQty ?? 0) <= 0) return push("Stok habis","error");
    const exist = items.find(i => i.productId === p.id);
    if (exist) {
        if (exist.qty + 1 > (p.stockQty ?? 0)) return push("Qty melebihi stok","error");
        setItems(items.map(i => i.productId===p.id ? { ...i, qty: i.qty + 1 } : i));
    } else {
        setItems([{ productId:p.id, name:p.name, unitPrice:p.sellPrice, qty:1, unit:p.unit }, ...items]);
    }
    }
  function changeQty(id, qty) {
    const p = products.find(pp=>pp.id===id);
    if (!p) return;
    const safe = Math.max(1, Math.min(qty, p.stockQty ?? 1));
    if (qty !== safe) push("Qty disesuaikan dengan stok","info");
    setItems(items.map(i => i.productId===id ? { ...i, qty: safe } : i));
    }
  function removeItem(id) {
    setItems(items.filter((i) => i.productId !== id));
  }

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

  printHtml(html);
}

  async function finalize() {
    if (items.length === 0) return push("Belum ada item","error");
    // jika piutang, sangat disarankan isi pelanggan:
    if (paid === 0 && !customerId) {
        if (!confirm("Pembayaran 0 (piutang). Lanjut tanpa pelanggan?")) return;
    }
    const payload = { customerId: customerId || null, note, items: items.map(i=>({ productId: i.productId, qty: i.qty })), amountPaid: paid, method };

    setSaving(true);
    try {
        const sale = await api.sales.create(payload);
        printReceipt({ ...sale, items, grandTotal, amountPaid: paid });
        setItems([]); setCustomerId(""); setNote(""); setPaid(0);
        push(`Transaksi tersimpan: ${sale.invoiceNo}`,"success");
        await reloadAll?.();
    } catch (e) {
        push(e.message,"error");
    } finally {
        setSaving(false);
    }
    }

  return (
    <div className="grid md:grid-cols-3 gap-4">
      <Card className="md:col-span-2">
        <div className="flex items-center gap-2 mb-3">
          <Input placeholder="Cari produk untuk ditambahkan..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        <div className="grid md:grid-cols-2 gap-3 max-h-64 overflow-auto">
          {filteredProducts.map((p) => (
            <div key={p.id} className="border rounded-xl p-2 flex items-center justify-between">
              <div>
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-gray-500">
                  {fmtIDR(p.sellPrice)} / {p.unit} • Stok: {p.stockQty}
                </div>
              </div>
              <Button className="bg-blue-600 text-white" onClick={() => addItem(p)}>
                Tambah
              </Button>
            </div>
          ))}
          {filteredProducts.length === 0 && <div className="text-gray-400">Tidak ada produk</div>}
        </div>

        <h3 className="text-lg font-semibold mt-4 mb-2">Keranjang</h3>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th>Item</th>
                <th>Harga</th>
                <th>Qty</th>
                <th>Subtotal</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.productId} className="border-b">
                  <td className="py-2">{i.name}</td>
                  <td>{fmtIDR(i.unitPrice)}</td>
                  <td>
                    <Input
                      type="number"
                      value={i.qty}
                      onChange={(e) => changeQty(i.productId, Number(e.target.value))}
                      className="w-20"
                    />
                  </td>
                  <td>{fmtIDR(i.unitPrice * i.qty)}</td>
                  <td className="text-right">
                    <Button className="text-red-700" onClick={() => removeItem(i.productId)}>
                      Hapus
                    </Button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-gray-400">
                    Belum ada item
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold mb-3">Pembayaran</h3>
        <div className="space-y-2">
          <div>
            <Label>Pelanggan (untuk piutang)</Label>
            <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">— Tanpa Pelanggan —</option>
              {customers.map((c) => (
                <option value={c.id} key={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Catatan</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="contoh: bayar saat panen" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Subtotal</Label>
              <div className="font-semibold">{fmtIDR(grandTotal)}</div>
            </div>
            <div>
              <Label>Bayar Sekarang</Label>
              <Input type="number" value={paid} onChange={(e) => setPaid(Number(e.target.value))} />
              <div className="text-xs text-gray-500 mt-1">Biarkan 0 untuk pinjam (piutang)</div>
            </div>
          </div>
          <div>
            <Label>Metode</Label>
            <Select value={method} onChange={(e) => setMethod(e.target.value)}>
              <option>Tunai</option>
              <option>Transfer</option>
              <option>QRIS</option>
            </Select>
          </div>
          <Button className="bg-green-600 text-white w-full" onClick={finalize} disabled={saving}>
            {saving ? "Menyimpan..." : "Simpan & Cetak"}
            </Button>
        </div>
      </Card>
    </div>
  );
}
