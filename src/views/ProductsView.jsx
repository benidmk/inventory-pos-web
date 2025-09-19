import { useEffect, useState } from "react";
import api from "../api/apiClient";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import Label from "../components/ui/Label";
import { downloadCSV, fmtIDR } from "../utils/format";
import { useToast } from "../components/toast/ToastProvider";


export default function ProductsView() {
  const blank = { id:"", name:"", category:"Pupuk", unit:"sak", costPrice:0, sellPrice:0, stockQty:0, expiryDate:"", imageUrl:"" };
  const [form, setForm] = useState(blank);
  const [q, setQ] = useState("");
  const [list, setList] = useState([]);
  const { push } = useToast();
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState("");


  async function load() {
    const data = await api.products.list(q);
    setList(data);
  }
  useEffect(()=>{ load(); }, [q]);

  async function save() {
    if (!form.name.trim()) return push("Nama wajib diisi","error");
    if (form.sellPrice < 0 || form.costPrice < 0) return push("Harga tidak boleh negatif","error");
    if (form.stockQty < 0) return push("Stok tidak boleh negatif","error");

    setSaving(true);
    try {
      if (!form.id) {
        await api.products.create({ ...form, expiryDate: form.expiryDate || null, imageUrl: form.imageUrl || null });
        push("Produk ditambahkan","success");
      } else {
        const id = form.id; const { id:_, ...payload } = form;
        await api.products.update(id, { ...payload, expiryDate: form.expiryDate || null, imageUrl: form.imageUrl || null });
        push("Produk diperbarui","success");
      }
      setForm(blank);
      await load();
    } catch(e) {
      push(e.message,"error");
    } finally {
      setSaving(false);
    }
  }

  function edit(p){ setForm({ ...p, expiryDate: p.expiryDate ? p.expiryDate.slice(0,10) : "" }); }
  async function remove(p) {
    if (!confirm(`Hapus ${p.name}?`)) return;
    setRemovingId(p.id);
    try {
      await api.products.remove(p.id);
      push("Produk dihapus","success");
      await load();
    } catch(e) {
      push(e.message,"error");
    } finally {
      setRemovingId("");
    }
  }


  return (
    <div className="grid md:grid-cols-3 gap-4">
      <Card className="md:col-span-1">
        <h2 className="text-lg font-semibold mb-3">Tambah/Ubah Produk</h2>
        <div className="space-y-2">
          <div>
            <Label>Nama</Label>
            <Input value={form.name} onChange={e=>setForm({ ...form, name:e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Kategori</Label>
              <Select value={form.category} onChange={e=>setForm({ ...form, category:e.target.value })}>
                <option>Pupuk</option>
                <option>Obat</option>
              </Select>
            </div>
            <div>
              <Label>Satuan</Label>
              <Select value={form.unit} onChange={e=>setForm({ ...form, unit:e.target.value })}>
                <option>sak</option><option>ml</option><option>liter</option><option>kg</option>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Harga Beli</Label>
              <Input type="number" value={form.costPrice} onChange={e=>setForm({ ...form, costPrice:Number(e.target.value) })} />
            </div>
            <div>
              <Label>Harga Jual</Label>
              <Input type="number" value={form.sellPrice} onChange={e=>setForm({ ...form, sellPrice:Number(e.target.value) })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Stok</Label>
              <Input type="number" value={form.stockQty} onChange={e=>setForm({ ...form, stockQty:Number(e.target.value) })} />
            </div>
            <div>
              <Label>Kadaluarsa</Label>
              <Input type="date" value={form.expiryDate} onChange={e=>setForm({ ...form, expiryDate:e.target.value })} />
            </div>
          </div>

          <div>
            <Label>Gambar (URL)</Label>
            <Input value={form.imageUrl} onChange={e=>setForm({ ...form, imageUrl:e.target.value })} placeholder="https://..." />
          </div>

          <div className="flex gap-2 pt-2">
            <Button className="bg-green-600 text-white" onClick={save} disabled={saving}>
              {saving ? "Menyimpan..." : (form.id ? "Simpan Perubahan" : "Tambah")}
            </Button>
            <Button onClick={()=>setForm(blank)}>Reset</Button>
          </div>
        </div>
      </Card>

      <Card className="md:col-span-2">
        <div className="flex items-center justify-between mb-3 gap-2">
          <Input placeholder="Cari produk..." value={q} onChange={e=>setQ(e.target.value)} />
          <Button onClick={()=>{
            const rows = [["Nama","Kategori","Satuan","Stok","Harga Beli","Harga Jual","Kadaluarsa"]];
            list.forEach(p=>rows.push([p.name,p.category,p.unit,p.stockQty,p.costPrice,p.sellPrice,p.expiryDate]));
            downloadCSV("produk.csv", rows);
          }}>Ekspor CSV</Button>
        </div>

        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2">Produk</th>
                <th>Kategori</th>
                <th>Stok</th>
                <th>Harga Jual</th>
                <th>Kadaluarsa</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.map(p=>(
                <tr key={p.id} className="border-b hover:bg-gray-50">
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      {p.imageUrl && <img src={p.imageUrl} alt="thumb" className="w-10 h-10 object-cover rounded" />}
                      <div>
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-gray-500">{fmtIDR(p.sellPrice)} / {p.unit}</div>
                      </div>
                    </div>
                  </td>
                  <td>{p.category}</td>
                  <td>{p.stockQty}</td>
                  <td>{fmtIDR(p.sellPrice)}</td>
                  <td>{p.expiryDate?.slice(0,10) || "-"}</td>
                  <td className="text-right">
                    <Button className="text-blue-700" onClick={()=>edit(p)}>Edit</Button>
                    <Button className="ml-2 text-red-700" onClick={()=>remove(p)} disabled={removingId===p.id}>
                      {removingId===p.id ? "Menghapus..." : "Hapus"}
                    </Button>
                    <Button className="ml-2 bg-green-600 text-white" onClick={async ()=>{
                      const q = prompt(`Tambah stok untuk "${p.name}" (qty > 0)?`, "1");
                      if (q===null) return; // cancel
                      const qty = parseInt(q, 10);
                      if (!Number.isFinite(qty) || qty <= 0) return push('Qty tidak valid',"error");

                      const ucStr = prompt(`Harga beli per ${p.unit}? (opsional, kosongkan jika tidak dicatat)`, "");
                      const unitCost = ucStr?.trim() ? parseInt(ucStr, 10) : undefined;
                      if (ucStr?.trim() && (!Number.isFinite(unitCost) || unitCost < 0)) return push('Harga beli tidak valid',"error");

                      try {
                        await api.products.addStock(p.id, { qty, unitCost });
                        await load();
                        push('Stok ditambahkan',"success");
                      } catch(e) {
                        push(e.message,"error");
                      }
                    }}>Tambah Stok</Button>
                  </td>
                </tr>
              ))}
              {list.length===0 && (
                <tr><td colSpan={6} className="text-center py-6 text-gray-400">Belum ada produk</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
