import { useState } from "react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Label from "../components/ui/Label";

export default function SettingsView({ settings, setSettings }) {
  const [form, setForm] = useState(settings);
  return (
    <Card className="max-w-2xl">
      <h2 className="text-lg font-semibold mb-3">Pengaturan (local)</h2>
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <Label>Lebar Kertas Struk (mm)</Label>
          <Input type="number" value={form.receiptWidth} onChange={e=>setForm({ ...form, receiptWidth:Number(e.target.value) })} />
        </div>
        <div>
          <Label>Nama Toko</Label>
          <Input value={form.storeName} onChange={e=>setForm({ ...form, storeName:e.target.value })} />
        </div>
        <div>
          <Label>Alamat</Label>
          <Input value={form.storeAddress} onChange={e=>setForm({ ...form, storeAddress:e.target.value })} />
        </div>
        <div>
          <Label>Telepon</Label>
          <Input value={form.storePhone} onChange={e=>setForm({ ...form, storePhone:e.target.value })} />
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <Button className="bg-blue-600 text-white" onClick={()=>setSettings(form)}>Simpan</Button>
        <Button onClick={()=>setForm(settings)}>Reset</Button>
      </div>
      <p className="text-xs text-gray-400 mt-2">Catatan: Pengaturan ini hanya tersimpan di browser (localStorage).</p>
    </Card>
  );
}
