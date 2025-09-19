import { useState } from "react";
import api from "../api/apiClient";
import Card from "./ui/Card";
import Button from "./ui/Button";
import Input from "./ui/Input";
import Label from "./ui/Label";

function setToken(t) {
  try { localStorage.setItem("token", t || ""); } catch {}
}

export default function LoginView({ onLogin }) {
  const [pwd, setPwd] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    setLoading(true); setErr("");
    try {
      const { token } = await api.auth.login(pwd);
      setToken(token);
      onLogin?.();
    } catch (e) {
      setErr(e.message || "Login gagal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-sm">
        <img
          src="/favicon.png?v=1"
          alt="BUMDESMA SILINDA"
          className="w-24 md:w-28 h-auto mx-auto mb-3 select-none"
          draggable="false"
        />
        <h1 className="text-2xl font-bold mb-1 text-center">Masuk</h1>
        <p className="text-gray-500 mb-4 text-center">BUMDESMA SILINDA</p>

        <Label>Password</Label>
        <Input
          type="password"
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          placeholder="Password"
        />

        <Button className="mt-4 bg-blue-600 text-white w-full" onClick={submit} disabled={loading}>
          {loading ? "Memeriksa..." : "Masuk"}
        </Button>

        {err && <div className="text-red-600 text-sm mt-2">{err}</div>}
      </Card>
    </div>
  );
}
