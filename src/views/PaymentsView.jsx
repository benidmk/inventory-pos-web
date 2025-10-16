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

  // filters
  const [q, setQ] = useState("");
  const [customerId, setCustomerId] = useState(paymentFilterCustomer || "");

  // open invoices (Piutang/Sebagian)
  const [openSales, setOpenSales] = useState([]);
  const [loadingOpen, setLoadingOpen] = useState(false);
  const [errorOpen, setErrorOpen] = useState("");

  // payments history (optional for selected customer)
  const [payments, setPayments] = useState([]);
  const [loadingPayHist, setLoadingPayHist] = useState(false);
  const [errorPayHist, setErrorPayHist] = useState("");

  // pay form state
  const [paying, setPaying] = useState(null); // sale object
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState("Tunai");
  const [refNo, setRefNo] = useState("");
  const [saving, setSaving] = useState(false);

  // keep external filter in sync (if provided)
  useEffect(() => {
    if (paymentFilterCustomer !== undefined && paymentFilterCustomer !== null) {
      setCustomerId(paymentFilterCustomer);
    }
  }, [paymentFilterCustomer]);

  // customer name map
  const customerMap = useMemo(() => {
    const m = new Map();
    (customers || []).forEach((c) => m.set(c.id, c.name));
    return m;
  }, [customers]);

  // helpers
  const paidSum = (sale) => Number(sale?.amountPaid || 0);
  const dueOf = (sale) =>
    Math.max(0, Number(sale?.grandTotal || 0) - paidSum(sale));

  // load open invoices
  async function loadOpen() {
    try {
      setLoadingOpen(true);
      setErrorOpen("");
      const data = await api.sales.list("open");
      const rows = Array.isArray(data) ? data : [];
      // enrich with customerName
      const enriched = rows.map((s) => ({
        ...s,
        customerName: customerMap.get(s.customerId) || "-",
      }));
      // apply customer filter (front-end side)
      const filtered =
        customerId && customerId.length
          ? enriched.filter((s) => s.customerId === customerId)
          : enriched;
      setOpenSales(filtered);
    } catch (e) {
      setOpenSales([]);
      setErrorOpen(e?.message || "Gagal memuat invoice terbuka");
    } finally {
      setLoadingOpen(false);
    }
  }

  // load payment history (by selected customer, or all if none)
  async function loadHistory() {
    try {
      setLoadingPayHist(true);
      setErrorPayHist("");
      const rows = await api.payments.list(
        customerId ? { customerId } : undefined
      );
      setPayments(Array.isArray(rows) ? rows : []);
    } catch (e) {
      setPayments([]);
      setErrorPayHist(e?.message || "Gagal memuat riwayat pembayaran");
    } finally {
      setLoadingPayHist(false);
    }
  }

  // initial + when customer changes
  useEffect(() => {
    loadOpen();
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, customerMap]);

  // front-end search + sort
  const openFiltered = useMemo(() => {
    const base = Array.isArray(openSales) ? openSales : [];
    return base
      .filter((s) =>
        [s.invoiceNo, s.customerName]
          .join(" ")
          .toLowerCase()
          .includes((q || "").toLowerCase())
      )
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [openSales, q]);

  // submit payment (pay a single invoice)
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
      await Promise.all([loadOpen(), loadHistory()]);
      push("Pembayaran tersimpan", "success");
    } catch (e) {
      push(e?.message || "Gagal menyimpan pembayaran", "error");
    } finally {
      setSaving(false);
    }
  }

  // quick helpers: pay full
  function payFull(sale) {
    const due = dueOf(sale);
    setPaying(sale);
    setAmount(due);
    setMethod("Tunai");
    setRefNo("");
  }

  return (
    <div className="grid gap-4">
      {/* Filter/search + choose customer */}
      <Card>
        <div className="grid md:grid-cols-3 gap-3 items-end">
          <div>
            <Label>Pilih Pelanggan (opsional)</Label>
            <Select
              value={customerId}
              onChange={(e) => {
                setCustomerId(e.target.value);
                // sinkron ke parent jika prop disediakan
                setPaymentFilterCustomer?.(e.target.value);
              }}
            >
              <option value="">— Semua Pelanggan —</option>
              {(customers || []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="md:col-span-2">
            <Label>Cari invoice / pelanggan</Label>
            <Input
              placeholder="Ketik nomor invoice atau nama pelanggan"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        {(loadingOpen || loadingPayHist) && (
          <div className="mt-2 text-sm text-gray-500">Memuat data…</div>
        )}
        {(errorOpen || errorPayHist) && (
          <div className="mt-2 text-sm text-red-600">
            {errorOpen || errorPayHist}
          </div>
        )}
      </Card>

      {/* Open invoices table */}
      <Card>
        <div className="mb-2 font-semibold">Invoice Terbuka (Piutang)</div>
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
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {(openFiltered || []).map((s) => {
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
                      <div className="flex gap-2 justify-end">
                        <Button
                          className="bg-green-600 text-white"
                          onClick={() => {
                            setPaying(s);
                            setAmount(Math.max(0, due));
                          }}
                        >
                          Bayar
                        </Button>
                        <Button
                          className="bg-blue-600 text-white"
                          onClick={() => payFull(s)}
                        >
                          Bayar Lunas
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {(openFiltered || []).length === 0 &&
                !loadingOpen &&
                !errorOpen && (
                  <tr>
                    <td colSpan={7} className="text-center py-6 text-gray-400">
                      Tidak ada invoice terbuka
                    </td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pay form */}
      {paying && (
        <Card>
          <div className="font-semibold mb-2">
            Pembayaran untuk {paying.invoiceNo} —{" "}
            <span className="text-gray-600">{paying.customerName}</span>
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
              <Select value={method} onChange={(e) => setMethod(e.target.value)}>
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

      {/* Payment history */}
      <Card>
        <div className="mb-2 font-semibold">
          Riwayat Pembayaran{customerId ? ` — ${customerMap.get(customerId) || "-"}` : ""}
        </div>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2">Tanggal</th>
                <th>Invoice</th>
                <th>Pelanggan</th>
                <th>Nominal</th>
                <th>Metode</th>
                <th>Ref</th>
              </tr>
            </thead>
            <tbody>
              {(payments || []).map((p) => (
                <tr key={p.id} className="border-b">
                  <td className="py-2">
                    {p.date ? new Date(p.date).toLocaleString("id-ID") : "-"}
                  </td>
                  <td>{p.invoiceNo || "-"}</td>
                  <td>{p.customerName || "-"}</td>
                  <td>{fmtIDR(p.amount || 0)}</td>
                  <td>{p.method || "-"}</td>
                  <td>{p.refNo || "-"}</td>
                </tr>
              ))}
              {(payments || []).length === 0 && !loadingPayHist && !errorPayHist && (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-gray-400">
                    Belum ada pembayaran
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
