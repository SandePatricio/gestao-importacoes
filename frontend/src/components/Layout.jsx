import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";

const ICONES = {
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <circle cx="7" cy="7" r="2.6" /><circle cx="17" cy="7" r="2.6" />
      <circle cx="7" cy="17" r="2.6" /><circle cx="17" cy="17" r="2.6" />
    </svg>
  ),
  pedidos: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path d="M9 4h6l1 2h3a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h3l1-2Z" />
      <path d="M9 12.5l2 2 4-4" />
    </svg>
  ),
  encomendas: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path d="M21 8.5 12 4 3 8.5v7L12 20l9-4.5v-7Z" /><path d="M3 8.5 12 13l9-4.5" /><path d="M12 13v7" />
    </svg>
  ),
  clientes: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <circle cx="12" cy="8" r="3.2" /><path d="M5.5 19.5c.8-3.2 3.4-5 6.5-5s5.7 1.8 6.5 5" />
    </svg>
  ),
  facturas: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path d="M7 3h10a1 1 0 0 1 1 1v17l-3-1.8L12 21l-3-1.8L6 21V4a1 1 0 0 1 1-1Z" />
      <path d="M9.5 8.5h5M9.5 12h5" />
    </svg>
  ),
  utilizadores: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <circle cx="9" cy="8" r="2.8" /><path d="M3.5 19c.7-2.8 3-4.4 5.5-4.4s4.8 1.6 5.5 4.4" />
      <circle cx="17" cy="9" r="2.2" /><path d="M16 14.8c2 .3 3.7 1.7 4.3 4.2" />
    </svg>
  ),
  configuracao: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.5v2.5M12 19v2.5M21.5 12H19M5 12H2.5M18.7 5.3l-1.8 1.8M7.1 16.9l-1.8 1.8M18.7 18.7l-1.8-1.8M7.1 7.1 5.3 5.3" />
    </svg>
  ),
  fiscal: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path d="M7 3h10a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M9 7h6M9 11h6M9 15h3" />
    </svg>
  ),
};

const LIGACOES = [
  { para: "/dashboard", rotulo: "Dashboard", icone: "dashboard" },
  { para: "/pedidos", rotulo: "Pedidos", icone: "pedidos" },
  { para: "/encomendas", rotulo: "Encomendas", icone: "encomendas", badge: "activas" },
  { para: "/clientes", rotulo: "Clientes", icone: "clientes" },
  { para: "/facturas", rotulo: "Facturas", icone: "facturas", badge: "pendentes" },
];

export default function Layout() {
  const { utilizador, logout } = useAuth();
  const navigate = useNavigate();
  const [contadores, setContadores] = useState({ activas: 0, pendentes: 0 });

  useEffect(() => {
    api
      .get("/api/dashboard/resumo")
      .then((r) =>
        setContadores({ activas: r.encomendas_activas, pendentes: r.facturas_pendentes })
      )
      .catch(() => {});
  }, []);

  function sair() {
    logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen flex bg-[#ececec]">
      <aside className="w-64 shrink-0 flex flex-col px-4 py-6">
        <div className="flex items-center gap-3 px-2 mb-8">
          <div className="h-10 w-10 rounded-2xl bg-neutral-900 text-white flex items-center justify-center font-bold text-lg">
            C
          </div>
          <div>
            <p className="font-bold leading-tight text-neutral-900">Connex</p>
            <p className="text-xs text-neutral-500">Importações</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {(utilizador?.perfil === "ADMIN"
            ? [
                ...LIGACOES,
                { para: "/utilizadores", rotulo: "Utilizadores", icone: "utilizadores" },
                { para: "/fiscal", rotulo: "Declaração ISPC", icone: "fiscal" },
                { para: "/configuracao", rotulo: "Configuração", icone: "configuracao" },
              ]
            : LIGACOES
          ).map((l) => {
            const valor = l.badge ? contadores[l.badge] : 0;
            return (
              <NavLink
                key={l.para}
                to={l.para}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? "bg-white text-neutral-900 shadow-sm"
                      : "text-neutral-500 hover:text-neutral-900"
                  }`
                }
              >
                {ICONES[l.icone]}
                <span className="flex-1">{l.rotulo}</span>
                {l.badge && valor > 0 && (
                  <span
                    className={`text-xs font-semibold rounded-md px-1.5 py-0.5 ${
                      l.badge === "pendentes"
                        ? "bg-orange-200/80 text-orange-900"
                        : "bg-green-200/80 text-green-900"
                    }`}
                  >
                    {valor}
                  </span>
                )}
              </NavLink>
            );
          })}

          <p className="px-3 pt-6 pb-1 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
            Páginas do cliente
          </p>
          <a
            href="/rastrear"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-neutral-500 hover:text-neutral-900 transition"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
              <circle cx="11" cy="11" r="6.5" /><path d="m20 20-4-4" />
            </svg>
            <span className="flex-1">Rastreio público</span>
            <span className="text-neutral-400">↗</span>
          </a>
          <a
            href="/portal"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-neutral-500 hover:text-neutral-900 transition"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
              <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" /><path d="M3.5 9.5h17" />
            </svg>
            <span className="flex-1">Portal do cliente</span>
            <span className="text-neutral-400">↗</span>
          </a>
        </nav>

        <div className="bg-white rounded-2xl shadow-sm p-4 mt-6">
          <p className="text-sm font-semibold text-neutral-900 truncate">{utilizador?.nome}</p>
          <p className="text-xs text-neutral-400">{utilizador?.perfil}</p>
          <button
            onClick={sair}
            className="mt-3 w-full rounded-xl bg-neutral-100 hover:bg-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-700 transition active:scale-[0.98]"
          >
            Terminar sessão
          </button>
        </div>
      </aside>

      <main className="flex-1 px-10 py-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
