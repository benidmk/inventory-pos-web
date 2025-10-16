// src/views/PaymentsView.jsx
import { useEffect, useMemo, useState } from "react";
import api from "../api/apiClient";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import Label from "../components/ui/Label";
import { fmtIDR } from "../utils/format";
import { useToast } from "../components/toast/ToastProvider";

export default function PaymentsView({
  customers = [],
  paymentFilterCustomer,
  setPaymentFilterCustomer,
}) {
  const { push } = useToast();

  // UI state
  const [q, setQ] = useState("");
  const [openSales, setOpenSales] = useState([]); // selalu array
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // payment form state
  const [paying, setPaying] = useState(null); // sale object
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState("Tunai");
  const [refNo, setRefNo] = useState("");
  const [saving, setSaving] = useState(false);

  // cache customer name by id
  const customerMap = useMemo(() => {
    const m = new Map();
    (customers || []).forEach((c) => m.set(c.id, c.name));
    return m;
  }, [customers]);

  async function load() {
    try {
      setLoading(true);
      setError("");
      const data = await api.sales.list("open");
      const rows = Array.isArray(data) ? data : [];
      // enrich with customerName (fallback "-")
      const enriched = rows.map((s) => ({
        ...s,
        customerName: customerMap.get(s.customerId) || "-",
      }));
      setOpenSales(enriched);
    } catch (e) {
      setOpenSales([]);
      setError(e?.message || "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerMap]); // reload saat customers berubah

  // helper amount paid & due
  const paidSum = (sale) =>
    Math.max(
      0,
      // Back-end kita maintain kolom amountPaid; gunakan itu
      Number(sale?.amountPaid || 0)
    );

  const dueOf = (sale) =>
    Math.max(0, Number(sale?.grandTotal || 0) - paidSum(sale));

  // filtering & sorting
  const filtered = useMemo(() => {
    const base = Array.isArray(openSales) ? openSales : [];
    return base
      .filter((s) =>
        paymentFilterCustomer ? s.customerId === paymentFilterCustomer : true
      )
      .filter((s) =>
        [s.invoiceNo, s.customerName]
          .join(" ")
          .toLowerCase()
          .includes((q || "").toLowerCase())
      )
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [openSales, q, paymentFilterCustomer]);

  // submit payment
  async function submitPayment() {
    if (!paying) return;
    const due = dueOf(paying);
    if (amount <= 0) return push("Nominal harus > 0", "error");
    if (amount > due) return push("Nominal melebihi sisa tagihan", "error");

    try {
      setSaving(true);
      await api.payments.create({
        saleId: paying.id,
        amount,
        method,
        refNo,
      });
      setPaying(null);
      setAmount(0);
      setMethod("Tunai");
      setRefNo("");
      await load();
      push("Pembayaran tersimpan", "success");
    } catch (e) {
      push(e?.message || "Gagal menyimpan pembayaran", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4">
      {/* Filter/Search bar */}
      <Card>
        <div className="flex flex-wrap items-end gap-2">
          <div className="grow min-w-[240px]">
            <Label>Cari invoice / pelanggan</Label>
            <Input
              placeholder="Ketik nomor invoice atau nama pelanggan"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          {paymentFilterCustomer && (
            <Button onClick={() => setPaymentFilterCustomer("")}>
              Hapus filter pelanggan
            </Button>
          )}
        </div>

        {loading && (
          <div className="mt-2 text-sm text-gray-500">Memuat data…</div>
        )}
        {error && (
          <div className="mt-2 text-sm text-red-600">Error: {error}</div>
        )}
      </Card>

      {/* Tabel invoice terbuka */}
      <Card>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2">Invoice</th>
                <th>Tanggal</th>
                <th>Pelanggan</th>
                <th>Total</th>
                <th>Terbayar</th>
                <th>Sisa</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(filtered || []).map((s) => {
                const paid = paidSum(s);
                const due = dueOf(s);
                return (
                  <tr key={s.id} className="border-b">
                    <td className="py-2 font-medium">{s.invoiceNo}</td>
                    <td>{new Date(s.date).toLocaleString("id-ID")}</td>
                    <td>{s.customerName}</td>
                    <td>{fmtIDR(s.grandTotal)}</td>
                    <td>{fmtIDR(paid)}</td>
                    <td className={due > 0 ? "text-red-600" : ""}>
                      {fmtIDR(due)}
                    </td>
                    <td className="text-right">
                      <Button
                        className="bg-green-600 text-white"
                        onClick={() => {
                          setPaying(s);
                          setAmount(due);
                        }}
                      >
                        Bayar
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {(filtered || []).length === 0 && !loading && !error && (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center py-6 text-gray-400"
                  >
                    Tidak ada invoice terbuka
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Form pembayaran */}
      {paying && (
        <Card>
          <div className="font-semibold mb-2">
            Pembayaran untuk {paying.invoiceNo}
          </div>
          <div className="grid md:grid-cols-4 gap-3">
            <div>
              <Label>Nominal</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
              />
              <div className="text-xs text-gray-500 mt-1">
                Sisa tagihan: {fmtIDR(dueOf(paying))}
              </div>
            </div>
            <div>
              <Label>Metode</Label>
              <Select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
              >
                <option>Tunai</option>
                <option>Transfer</option>
                <option>QRIS</option>
              </Select>
            </div>
            <div>
              <Label>Ref/No. Bukti</Label>
              <Input
                value={refNo}
                onChange={(e) => setRefNo(e.target.value)}
                placeholder="opsional"
              />
            </div>
            <div className="flex items-end gap-2">
              <Button
                className="bg-green-600 text-white"
                onClick={submitPayment}
                disabled={saving}
              >
                {saving ? "Menyimpan..." : "Simpan"}
              </Button>
              <Button onClick={() => setPaying(null)}>Batal</Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
