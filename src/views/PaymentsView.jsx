import { useEffect, useMemo, useState } from "react";
import api from "../api/apiClient";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import Label from "../components/ui/Label";
import { fmtIDR } from "../utils/format";
import { useToast } from "../components/toast/ToastProvider";

export default function PaymentsView({ customers, paymentFilterCustomer, setPaymentFilterCustomer }) {
  const [q, setQ] = useState("");
  const [openSales, setOpenSales] = useState([]);
  const [paying, setPaying] = useState(null);
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState("Tunai");
  const [refNo, setRefNo] = useState("");
  const { push } = useToast();
  const [saving, setSaving] = useState(false);

  async function load() {
    const data = await api.sales.list("open");
    setOpenSales(data.map(s=> ({ ...s, customerName: customers.find(c=>c.id===s.customerId)?.name || '-' })));
  }
  useEffect(()=>{ load(); }, [customers]);

  function paidSum(sale){ return (sale.payments||[]).reduce((a,p)=>a+p.amount,0) || sale.amountPaid || 0; }
  function dueOf(sale){ return sale.grandTotal - paidSum(sale); }

  async function submitPayment(){
    if(!paying) return;
    const due = dueOf(paying);
    if (amount <= 0) return push('Nominal harus > 0','error');
    if (amount > due) return push('Nominal melebihi sisa tagihan','error');
    setSaving(true);
    try {
        await api.payments.create({ saleId: paying.id, amount, method, refNo });
        setPaying(null); setAmount(0); setMethod('Tunai'); setRefNo('');
        await load();
        push('Pembayaran tersimpan','success');
    } catch(e) {
        push(e.message,'error');
    } finally {
        setSaving(false);
    }
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
              <Button className="bg-green-600 text-white" onClick={submitPayment} disabled={saving}>
                {saving ? "Menyimpan..." : "Simpan"}
                </Button>
              <Button onClick={()=>setPaying(null)}>Batal</Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
