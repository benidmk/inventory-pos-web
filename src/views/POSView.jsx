// src/views/POSView.jsx
import { useEffect, useMemo, useRef, useState } from "react";
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
  // ======= STATES =======
  const [items, setItems] = useState([]); // {productId,name,unit,unitPrice,qty}
  const [customerId, setCustomerId] = useState("");
  const [note, setNote] = useState("");
  const [paid, setPaid] = useState(0);
  const [method] = useState("Tunai"); // fix: hanya Tunai (permintaan user)
  const [q, setQ] = useState("");
  const { push } = useToast();
  const [saving, setSaving] = useState(false);
  const [justSavedInvoice, setJustSavedInvoice] = useState(""); // hint ke kasir sesudah cetak
  const inputSearchRef = useRef(null);

  // ======= DERIVED =======
  const filteredProducts = useMemo(
    () => products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase())),
    [products, q]
  );

  const subtotal = useMemo(
    () => items.reduce((a, i) => a + i.unitPrice * i.qty, 0),
    [items]
  );
  const grandTotal = subtotal;

  const change = Math.max(0, (paid || 0) - (grandTotal || 0));
  const needMore = Math.max(0, (grandTotal || 0) - (paid || 0));

  // ======= HELPERS =======
  useEffect(() => {
    // fokus ke search saat buka POS
    inputSearchRef.current?.focus();
  }, []);

  function addItem(p) {
    if ((p.stockQty ?? 0) <= 0) {
      push("Stok habis", "error");
      return;
    }
    setItems((prev) => {
      const exist = prev.find((i) => i.productId === p.id);
      if (exist) {
        if (exist.qty + 1 > (p.stockQty ?? 0)) {
          push("Qty melebihi stok", "error");
          return prev;
        }
        return prev.map((i) =>
          i.productId === p.id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [
        { productId: p.id, name: p.name, unitPrice: p.sellPrice, qty: 1, unit: p.unit },
        ...prev,
      ];
    });
  }

  function changeQty(id, qty) {
    const p = products.find((pp) => pp.id === id);
    if (!p) return;
    const safe = Number.isFinite(qty) ? Math.max(1, Math.min(qty, p.stockQty ?? 1)) : 1;
    if (qty !== safe) push("Qty disesuaikan dengan stok", "info");
    setItems((prev) =>
      prev.map((i) => (i.productId === id ? { ...i, qty: safe } : i))
    );
  }

  function incQty(id, delta = 1) {
    const item = items.find((i) => i.productId === id);
    const p = products.find((pp) => pp.id === id);
    if (!item || !p) return;
    const target = item.qty + delta;
    changeQty(id, target);
  }

  function removeItem(id) {
    setItems((prev) => prev.filter((i) => i.productId !== id));
  }

  function printReceipt(sale) {
    const width = settings?.receiptWidth || 80; // mm
    const name = settings?.storeName || "BUMDESMA KETAPANG SILINDA";
    const addr = settings?.storeAddress || "Dusun I Desa Sungai Buaya";
    const phone = settings?.storePhone || "";

    const rows = sale.items
      .map(
        (i) =>
          `<div class="row"><span>${i.name} x${i.qty}</span><span>${fmtIDR(
            i.unitPrice * i.qty
          )}</span></div>`
      )
      .join("");

    const html = `<!DOCTYPE html><html><head><title>${sale.invoiceNo || ""}</title><style>
      @page { size: ${width}mm auto; margin: 4mm; }
      body { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
      .title { font-weight: 700; font-size: 14px; text-align:center; }
      .small { font-size: 11px; text-align:center; white-space: pre-line; }
      .row { display:flex; justify-content:space-between; font-size:12px; }
      hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
    </style></head><body>
      <div class="title">${name}</div>
      <div class="small">${addr}${addr && phone ? "\n" : ""}${
      phone ? "Telp: " + phone : ""
    }</div>
      <hr />
      <div class="small">${new Date().toLocaleString("id-ID")} • ${
      sale.invoiceNo || ""
    }</div>
      <hr />
      ${rows}
      <hr />
      <div class="row"><strong>Total</strong><strong>${fmtIDR(
        sale.grandTotal
      )}</strong></div>
      <div class="row"><span>Bayar</span><span>${fmtIDR(
        sale.amountPaid
      )}</span></div>
      <div class="row"><span>Status</span><span>${sale.paymentStatus}</span></div>
      <hr />
      <div class="small">Terima kasih.</div>
    </body></html>`;

    printHtml(html);
  }

  // ======= FINALIZE (UX: guard, retry 409) =======
  async function finalize() {
    if (saving) return; // guard double click
    if (items.length === 0) return push("Belum ada item", "error");

    // jika piutang (paid=0) dan tanpa pelanggan -> konfirmasi
    if (paid === 0 && !customerId) {
      const ok = window.confirm(
        "Pembayaran 0 (piutang). Lanjut tanpa memilih pelanggan?"
      );
      if (!ok) return;
    }

    // clamp paid agar tidak negatif / NaN
    const paySafe = Number.isFinite(paid) ? Math.max(0, Math.floor(paid)) : 0;

    const payload = {
      customerId: customerId || null,
      note,
      items: items.map((i) => ({ productId: i.productId, qty: i.qty })),
      amountPaid: paySafe,
      method: "Tunai",
    };

    setSaving(true);
    setJustSavedInvoice("");

    // helper untuk eksekusi & handle hasil
    const doSubmit = async () => {
      const sale = await api.sales.create(payload);
      // cetak struk dengan data keranjang lokal (nama item dsb.)
      printReceipt({ ...sale, items, grandTotal, amountPaid: paySafe });
      // reset form
      setItems([]);
      setCustomerId("");
      setNote("");
      setPaid(0);
      setQ("");
      setJustSavedInvoice(sale.invoiceNo || "");
      push(`Transaksi tersimpan: ${sale.invoiceNo}`, "success");
      inputSearchRef.current?.focus();
      await reloadAll?.();
    };

    try {
      try {
        await doSubmit();
      } catch (e) {
        // kalau bentrok invoice (409), coba 1x retry kecil
        const msg = e?.message || "";
        const is409 =
          msg.includes("409") ||
          msg.includes("Nomor invoice bentrok") ||
          msg.toLowerCase().includes("conflict");
        if (is409) {
          push("Nomor invoice bentrok, mencoba ulang...", "info");
          await new Promise((r) => setTimeout(r, 180)); // jitter kecil
          await doSubmit();
        } else {
          throw e;
        }
      }
    } catch (e) {
      push(e.message, "error");
    } finally {
      setSaving(false);
    }
  }

  // Enter di search → tambahkan produk teratas
  function onSearchKeyDown(e) {
    if (e.key === "Enter" && filteredProducts.length > 0) {
      addItem(filteredProducts[0]);
      // jika produk yang dipilih stoknya 1, jangan spam enter
    }
  }

  function payFull() {
    setPaid(grandTotal);
  }

  return (
    <div className="grid md:grid-cols-3 gap-4">
      {/* ============ KATALOG & KERANJANG ============ */}
      <Card className="md:col-span-2">
        {/* Search */}
        <div className="flex items-center gap-2 mb-3">
          <Input
            ref={inputSearchRef}
            placeholder="Cari produk untuk ditambahkan..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onSearchKeyDown}
          />
          {q && (
            <Button
              variant="secondary"
              onClick={() => setQ("")}
              className="shrink-0"
            >
              Bersihkan
            </Button>
          )}
        </div>

        {/* Katalog cepat */}
        <div className="grid md:grid-cols-2 gap-3 max-h-64 overflow-auto">
          {filteredProducts.map((p) => (
            <div
              key={p.id}
              className="border rounded-xl p-2 flex items-center justify-between"
            >
              <div>
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-gray-500">
                  {fmtIDR(p.sellPrice)} / {p.unit} • Stok: {p.stockQty}
                </div>
              </div>
              <Button
                className="bg-blue-600 text-white"
                onClick={() => addItem(p)}
                disabled={saving || (p.stockQty ?? 0) <= 0}
              >
                Tambah
              </Button>
            </div>
          ))}
          {filteredProducts.length === 0 && (
            <div className="text-gray-400">Tidak ada produk</div>
          )}
        </div>

        {/* Keranjang */}
        <h3 className="text-lg font-semibold mt-4 mb-2">Keranjang</h3>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th>Item</th>
                <th>Harga</th>
                <th className="w-40">Qty</th>
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
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => incQty(i.productId, -1)}
                        disabled={saving || i.qty <= 1}
                      >
                        −
                      </Button>
                      <Input
                        type="number"
                        value={i.qty}
                        onChange={(e) =>
                          changeQty(i.productId, Number(e.target.value))
                        }
                        className="w-20 text-center"
                        disabled={saving}
                      />
                      <Button
                        variant="secondary"
                        onClick={() => incQty(i.productId, +1)}
                        disabled={saving}
                      >
                        +
                      </Button>
                    </div>
                  </td>
                  <td>{fmtIDR(i.unitPrice * i.qty)}</td>
                  <td className="text-right">
                    <Button
                      className="text-red-700"
                      onClick={() => removeItem(i.productId)}
                      disabled={saving}
                    >
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

        {/* hint setelah simpan */}
        {justSavedInvoice && (
          <div className="mt-3 text-sm text-green-700">
            Tersimpan & dicetak: <b>{justSavedInvoice}</b>
          </div>
        )}
      </Card>

      {/* ============ PEMBAYARAN ============ */}
      <Card>
        <h3 className="text-lg font-semibold mb-3">Pembayaran</h3>
        <div className="space-y-3">
          <div>
            <Label>Pelanggan (untuk piutang)</Label>
            <Select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              disabled={saving}
            >
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
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="contoh: bayar saat panen"
              disabled={saving}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Total</Label>
              <div className="font-semibold text-lg">{fmtIDR(grandTotal)}</div>
            </div>
            <div>
              <Label>Bayar Sekarang (Tunai)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={paid}
                  onChange={(e) => setPaid(Number(e.target.value))}
                  disabled={saving}
                />
                <Button
                  variant="secondary"
                  onClick={payFull}
                  disabled={saving || grandTotal <= 0}
                >
                  Bayar Penuh
                </Button>
              </div>
              {paid > 0 && change > 0 && (
                <div className="text-xs text-green-700 mt-1">
                  Kembalian: {fmtIDR(change)}
                </div>
              )}
              {paid >= 0 && needMore > 0 && (
                <div className="text-xs text-orange-600 mt-1">
                  Kurang: {fmtIDR(needMore)}
                </div>
              )}
              {paid === 0 && (
                <div className="text-xs text-gray-500 mt-1">
                  Biarkan 0 untuk piutang
                </div>
              )}
            </div>
          </div>

          {/* metode bayar diset fix ke Tunai (tidak ditampilkan, sesuai requirement) */}
          {/* <div>
            <Label>Metode</Label>
            <Select value={method} disabled>
              <option>Tunai</option>
            </Select>
          </div> */}

          <Button
            className="bg-green-600 text-white w-full py-3 text-base"
            onClick={finalize}
            disabled={saving}
          >
            {saving ? "Menyimpan..." : "Simpan & Cetak"}
          </Button>
          <div className="text-[11px] text-gray-500">
            Setelah klik, tombol akan terkunci sementara untuk mencegah duplikasi.
          </div>
        </div>
      </Card>
    </div>
  );
}
