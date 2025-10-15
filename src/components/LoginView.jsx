// src/components/LoginView.jsx
import { useState } from "react";
import api from "../api/apiClient";
import Card from "./ui/Card";
import Input from "./ui/Input";
import Button from "./ui/Button";
import Label from "./ui/Label";
import { useToast } from "./toast/ToastProvider";
import { setSession } from "../utils/auth";

export default function LoginView({ onLogin }) {
  const { push } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!username || !password) return push("Isi username & password", "error");
    setLoading(true);
    try {
      const res = await api.auth.login(username, password); // { token, role, name, username }
      setSession(res);
      push(`Selamat datang, ${res.name}`, "success");
      onLogin?.(); // biar App.jsx setLogged(true) dan load data
    } catch (err) {
      push(err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gray-50">
      <Card className="w-full max-w-sm">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="text-lg font-semibold text-center">Masuk</div>
          <div>
            <Label>Username</Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              placeholder="username"
            />
          </div>
          <div>
            <Label>Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <Button
            className="bg-blue-600 text-white w-full"
            type="submit"
            disabled={loading || !username || !password}
          >
            {loading ? "Memeriksa..." : "Masuk"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
