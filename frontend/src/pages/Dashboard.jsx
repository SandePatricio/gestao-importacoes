import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import { rotuloEstado, corEstado, formatarData } from "../services/estados";

function Sparkline() {
  return (
    <svg viewBox="0 0 120 48" fill="none" className="h-12 w-32">
      <path
        d="M4 38 C 18 36, 24 34, 34 30 S 50 14, 60 10 S 76 6, 84 10 S 100 34, 116 40"
        stroke="#4ade80"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CartaoPequeno({ titulo, valor, destaque }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <p className="text-sm text-neutral-500">{titulo}</p>
      <p className={`text-3xl font-bold mt-1 tracking-tight ${destaque ?? "text-neutral-900"}`}>
        {valor}
      </p>
    </div>
  );
}

export default function Dashboard() {
  const [resumo, setResumo] = useState(null);
  const [recentes, setRecentes] = useState([]);
  const [erro, setErro] = useState("");

  useEffect(() => {
    api.get("/api/dashboard/resumo").then(setResumo).catch((e) => setErro(e.message));
    api.get("/api/encomendas").then((lista) => setRecentes(lista.slice(0, 6))).catch(() => {});
  }, []);

  if (erro) return <p className="text-red-600">{erro}</p>;
  if (!resumo) return <p className="text-neutral-500">A carregar…</p>;

  const taxaEntrega =
    resumo.total_encomendas > 0
      ? Math.round((resumo.encomendas_entregues / resumo.total_encomendas) * 100)
      : 0;

  return (
    <div className="max-w-5xl mx-auto">
      <h2 className="text-3xl font-bold tracking-tight text-neutral-900 mb-8">Visão geral</h2>

      {/* Cartão principal — estilo "overview" */}
      <div className="bg-white rounded-3xl shadow-sm p-8 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:divide-x md:divide-neutral-100">
          <div>
            <div className="h-14 w-14 rounded-full bg-neutral-100 flex items-center justify-center mb-6">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6 text-neutral-700">
                <path d="M21 8.5 12 4 3 8.5v7L12 20l9-4.5v-7Z" /><path d="M3 8.5 12 13l9-4.5" /><path d="M12 13v7" />
              </svg>
            </div>
            <p className="text-neutral-500 font-medium mb-1">Encomendas</p>
            <div className="flex items-end justify-between gap-4">
              <p className="text-6xl font-bold tracking-tight text-neutral-900">
                {resumo.total_encomendas}
              </p>
              <Sparkline />
            </div>
            <div className="flex items-center gap-2 mt-4">
              <span className="inline-flex items-center gap-1 rounded-lg border border-green-200 bg-green-50 px-2.5 py-1 text-sm font-semibold text-green-700">
                ↑ {taxaEntrega}%
              </span>
              <span className="text-sm text-neutral-400">taxa de entrega</span>
            </div>
          </div>

          <div className="md:pl-8 opacity-60">
            <div className="h-14 w-14 rounded-full bg-neutral-100 flex items-center justify-center mb-6">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6 text-neutral-500">
                <circle cx="12" cy="8" r="3.2" /><path d="M5.5 19.5c.8-3.2 3.4-5 6.5-5s5.7 1.8 6.5 5" />
              </svg>
            </div>
            <p className="text-neutral-500 font-medium mb-1">Clientes</p>
            <p className="text-6xl font-bold tracking-tight text-neutral-400">
              {resumo.total_clientes}
            </p>
            <div className="flex items-center gap-2 mt-4">
              <span className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-sm font-semibold text-neutral-500">
                {resumo.facturas_pendentes} facturas pendentes
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <CartaoPequeno titulo="Em curso" valor={resumo.encomendas_activas} destaque="text-neutral-900" />
        <CartaoPequeno titulo="Entregues" valor={resumo.encomendas_entregues} destaque="text-green-600" />
        <CartaoPequeno titulo="Atrasadas" valor={resumo.encomendas_atrasadas} destaque="text-red-500" />
        <CartaoPequeno titulo="Facturas pendentes" valor={resumo.facturas_pendentes} destaque="text-orange-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">Últimas encomendas</h3>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="text-neutral-400 text-left">
                <tr>
                  <th className="px-5 py-3.5 font-medium">Código</th>
                  <th className="px-5 py-3.5 font-medium">Cliente</th>
                  <th className="px-5 py-3.5 font-medium">Estado</th>
                  <th className="px-5 py-3.5 font-medium">Registo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {recentes.length === 0 && (
                  <tr><td colSpan={4} className="px-5 py-8 text-center text-neutral-400">Sem encomendas registadas.</td></tr>
                )}
                {recentes.map((enc) => (
                  <tr key={enc.id} className="hover:bg-neutral-50 transition">
                    <td className="px-5 py-3.5">
                      <Link to={`/encomendas/${enc.id}`} className="font-mono font-semibold text-neutral-900 hover:underline">
                        {enc.codigo_rastreio}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5">{enc.cliente.nome}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-md ${corEstado(enc.estado)}`}>
                        {rotuloEstado(enc.estado)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-neutral-400">{formatarData(enc.data_registo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">Por estado</h3>
          <div className="bg-white rounded-2xl shadow-sm divide-y divide-neutral-100">
            {Object.entries(resumo.por_estado).length === 0 && (
              <p className="p-5 text-sm text-neutral-400">Ainda não existem encomendas.</p>
            )}
            {Object.entries(resumo.por_estado).map(([estado, total]) => (
              <div key={estado} className="flex items-center justify-between px-5 py-3.5">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-md ${corEstado(estado)}`}>
                  {rotuloEstado(estado)}
                </span>
                <span className="font-bold text-neutral-900">{total}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
