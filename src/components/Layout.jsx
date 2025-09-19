import Button from "./ui/Button";

const MENUS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "products",  label: "Produk" },
  { key: "pos",       label: "Kasir" },
  { key: "customers", label: "Pelanggan" },
  { key: "payments",  label: "Pembayaran" },
  { key: "reports",   label: "Laporan" },
  { key: "settings",  label: "Settings" },
];

export default function Layout({ page, setPage, onLogout, children }) {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r sticky top-0 h-screen hidden md:flex md:flex-col">
        <div className="p-4 text-lg font-bold border-b">BUMDESMA SILINDA</div>
        <nav className="p-2 space-y-1 overflow-auto">
          {MENUS.map((m) => (
            <button
              key={m.key}
              onClick={() => setPage(m.key)}
              className={`w-full text-left px-3 py-2 rounded-xl hover:bg-gray-100 ${
                page === m.key ? "bg-blue-600 text-white hover:bg-blue-600" : ""
              }`}
            >
              {m.label}
            </button>
          ))}
        </nav>
        <div className="mt-auto p-2">
          <Button className="w-full" onClick={onLogout}>Keluar</Button>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Mobile header */}
        <header className="md:hidden sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
          <div className="p-3 flex items-center justify-between">
            <div className="text-lg font-bold">BUMDESMA SILINDA</div>
            <div className="flex gap-2">
              <Button onClick={onLogout}>Keluar</Button>
            </div>
          </div>

          <div className="flex overflow-auto gap-2 p-2">
            {MENUS.map((t) => (
              <Button
                key={t.key}
                className={`${page === t.key ? "bg-blue-600 text-white" : ""}`}
                onClick={() => setPage(t.key)}
              >
                {t.label}
              </Button>
            ))}
          </div>
        </header>

        <main className="max-w-6xl mx-auto p-4 space-y-4">{children}</main>

        <footer className="max-w-6xl mx-auto p-4 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} – Beni.
        </footer>
      </div>
    </div>
  );
}
