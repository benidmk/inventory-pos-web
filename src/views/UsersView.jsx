// src/views/UsersView.jsx
import { useEffect, useState } from "react";
import api from "../api/apiClient";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import Label from "../components/ui/Label";
import { useToast } from "../components/toast/ToastProvider";
import { getRole } from "../utils/auth";

export default function UsersView() {
  const { push } = useToast();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  // form tambah user
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("VIEWER");

  const isAdmin = getRole() === "ADMIN";

  async function load() {
    try {
      setLoading(true);
      const r = await api.users.list();
      setList(r);
    } catch (e) {
      push(e.message, "error");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function addUser() {
    if (!username || !name || !password) return push("Lengkapi data", "error");
    try {
      const u = await api.users.create({ username, name, password, role });
      setUsername(""); setName(""); setPassword(""); setRole("VIEWER");
      push(`User dibuat: ${u.username}`, "success");
      load();
    } catch (e) {
      push(e.message, "error");
    }
  }

  async function deleteUser(id) {
    if (!confirm("Hapus user ini?")) return;
    try {
      await api.users.remove(id);
      push("User dihapus", "success");
      load();
    } catch (e) {
      push(e.message, "error");
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card>
        <div className="mb-3 font-semibold">Daftar User</div>
        {loading ? <div>Memuat…</div> : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left border-b">
                <th>Username</th><th>Nama</th><th>Role</th><th>Dibuat</th><th></th>
              </tr></thead>
              <tbody>
                {list.map(u => (
                  <tr key={u.id} className="border-b">
                    <td className="py-2">{u.username}</td>
                    <td>{u.name}</td>
                    <td>{u.role}</td>
                    <td>{new Date(u.createdAt).toLocaleString('id-ID')}</td>
                    <td className="text-right">
                      {isAdmin && (
                        <Button className="text-red-700" onClick={() => deleteUser(u.id)}>Hapus</Button>
                      )}
                    </td>
                  </tr>
                ))}
                {list.length === 0 && <tr><td colSpan={5} className="text-center py-6 text-gray-400">Tidak ada user</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <div className="mb-3 font-semibold">Tambah User</div>
        <div className="space-y-2">
          <div>
            <Label>Username</Label>
            <Input value={username} onChange={e=>setUsername(e.target.value)} placeholder="mis. budi" />
          </div>
          <div>
            <Label>Nama Lengkap</Label>
            <Input value={name} onChange={e=>setName(e.target.value)} placeholder="Budi Viewer" />
          </div>
          <div>
            <Label>Password</Label>
            <Input type="password" value={password} onChange={e=>setPassword(e.target.value)} />
          </div>
          <div>
            <Label>Role</Label>
            <Select value={role} onChange={e=>setRole(e.target.value)}>
              <option value="VIEWER">VIEWER (baca-saja)</option>
              <option value="ADMIN">ADMIN</option>
            </Select>
          </div>
          <Button className="bg-blue-600 text-white" onClick={addUser} disabled={!isAdmin}>
            Simpan
          </Button>
          {!isAdmin && <div className="text-xs text-yellow-700">Hanya admin yang bisa menambah user.</div>}
        </div>
      </Card>

      <Card className="md:col-span-2">
        <div className="mb-3 font-semibold">Login Audit (terbaru)</div>
        <div className="overflow-auto">
          <AuditTable />
        </div>
      </Card>
    </div>
  );
}

function AuditTable() {
  const { push } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setLoading(true);
      const r = await api.audits.loginList();
      setRows(r);
    } catch (e) {
      push(e.message, "error");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  if (loading) return <div>Memuat…</div>;
  return (
    <table className="w-full text-sm">
      <thead><tr className="text-left border-b">
        <th>Waktu</th><th>Username</th><th>Role</th><th>IP</th><th>User Agent</th>
      </tr></thead>
      <tbody>
        {rows.map(a => (
          <tr key={a.id} className="border-b">
            <td className="py-2">{new Date(a.at).toLocaleString('id-ID')}</td>
            <td>{a.username}</td>
            <td>{a.role || "-"}</td>
            <td>{a.ip || "-"}</td>
            <td className="truncate max-w-[360px]">{a.userAgent || "-"}</td>
          </tr>
        ))}
        {rows.length === 0 && <tr><td colSpan={5} className="text-center py-6 text-gray-400">Tidak ada data</td></tr>}
      </tbody>
    </table>
  );
}
