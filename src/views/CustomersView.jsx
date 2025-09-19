import { useEffect, useMemo, useState } from "react";
import api from "../api/apiClient";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Label from "../components/ui/Label";
import { fmtIDR } from "../utils/format";

export default function CustomersView({ setTab, setPaymentFilterCustomer, sales = [], payments = [] }) {
  const blank = { id: "", name: "", phone: "", address: "", notes: "" };
  const [form, setForm] = useState(blank);
  const [q, setQ] = useState("");
  const [list, setList] = useState([]);

  async function load(){ setList(await api.customers.list()); }
  useEffect(()=>{ load(); }, []);

  async function save(){
    if (!form.name) return alert("Nama wajib diisi");
    if (!form.id) await api.customers.create(form);
    else await api.customers.update(form.id, form);
    setForm(blank); await load();
  }
  async function remove(c){ if(!confirm(`Hapus ${c.name}?`)) return; await api.customers.remove(c.id); await load(); }

  const filtered = useMemo(()=> list.filter(c => c.name.toLowerCase().includes(q.toLowerCase())), [list, q]);

  function balanceOf(customerId){
    const custSales = sales.filter(s=> s.customerId===customerId);
    const billed = custSales.reduce((a,s)=>a+s.grandTotal, 0);
    const paid = payments.filter(p=> custSales.some(s=> s.id===p.saleId)).reduce((a,p)=>a+p.amount, 0);
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
              {filtered.map(c=>(
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
