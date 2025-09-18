import { useState } from 'react';
import { loginWithPassword } from './apiClient';

export default function LoginView({ onSuccess }) {
  const [pwd, setPwd] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  async function submit() {
    setLoading(true); setErr('');
    try {
      await loginWithPassword(pwd);
      onSuccess();
    } catch (e) {
      setErr(e.message || 'Login gagal');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow p-6 w-full max-w-sm">
        {/* LOGO — di atas form, responsif */}
        <img
          src="/favicon.png"
          alt="BUMDESMA SILINDA"
          className="w-24 md:w-28 h-auto mx-auto mb-3 select-none"
          draggable="false"
        />

        <h1 className="text-2xl font-bold mb-1 text-center">Masuk</h1>
        <p className="text-gray-500 mb-4 text-center">BUMDESMA SILINDA</p>

        <label className="text-sm text-gray-600 mb-1 block">Password</label>
        <input
          type="password"
          value={pwd}
          onChange={e=>setPwd(e.target.value)}
          onKeyDown={e=> e.key==='Enter' && submit()}
          placeholder="Password admin"
          className="px-3 py-2 rounded-xl border w-full border-gray-300 focus:outline-none focus:ring focus:ring-blue-200"
        />

        <button
          onClick={submit}
          disabled={loading}
          className="mt-4 w-full px-4 py-2 rounded-xl shadow bg-blue-600 text-white hover:shadow-md active:scale-[.99] transition"
        >
          {loading ? 'Memeriksa…' : 'Masuk'}
        </button>

        {err && <div className="text-red-600 text-sm mt-2">{err}</div>}
      </div>
    </div>
  );
}
