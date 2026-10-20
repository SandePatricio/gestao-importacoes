import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { formatarData } from "../services/estados";

const CORES_FACTURA = {
  PENDENTE: "bg-amber-100 text-amber-700",
  PAGA: "bg-green-100 text-green-700",
  CANCELADA: "bg-neutral-100 text-neutral-500",
};

export default function Facturas() {
  const navigate = useNavigate();
  const [facturas, setFacturas] = useState([]);
  const [encomendas, setEncomendas] = useState([]);
  const [form, setForm] = useState({ encomenda_id: "", valor_total: "" });
  const [mostrarForm, setMostrarForm] = useState(false);
  const [erro, setErro] = useState("");

  function carregar() {
    api.get("/api/facturas").then(setFacturas).catch((e) => setErro(e.message));
  }

  useEffect(() => {
    carregar();
    api.get("/api/encomendas").then(setEncomendas).catch(() => {});
  }, []);

  // Só se pode facturar o transporte de encomendas sem factura activa (não cancelada)
  const jaFacturadas = new Set(
    facturas
      .filter((f) => f.tipo === "TRANSPORTE" && f.estado !== "CANCELADA")
      .map((f) => f.encomenda_id)
  );
  const facturaveis = encomendas.filter((enc) => !jaFacturadas.has(enc.id));

  // Encomenda seleccionada (para mostrar o frete calculado e pré-preencher o valor)
  const encSel = encomendas.find((x) => x.id === Number(form.encomenda_id));

  async function emitir(e) {
    e.preventDefault();
    setErro("");
    try {
      const factura = await api.post("/api/facturas", {
        encomenda_id: Number(form.encomenda_id),
        // Vazio → o backend usa o frete calculado da encomenda
        valor_total: form.valor_total === "" ? null : Number(form.valor_total),
      });
      // Abre logo o documento emitido (para imprimir / enviar ao cliente)
      navigate(`/facturas/${factura.id}`);
    } catch (erro) {
      setErro(erro.message);
    }
  }

  async function cancelar(id) {
    if (!confirm("Cancelar esta factura? Deixa de contar como valor a receber.")) return;
    setErro("");
    try {
      await api.post(`/api/facturas/${id}/cancelar`);
      carregar();
    } catch (erro) {
      setErro(erro.message);
    }
  }

  async function marcarPaga(id) {
    setErro("");
    try {
      await api.post(`/api/facturas/${id}/pagar`);
      carregar();
    } catch (erro) {
      setErro(erro.message);
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold tracking-tight text-neutral-900">Facturas</h2>
        <button
          onClick={() => setMostrarForm(!mostrarForm)}
          className="rounded-xl bg-neutral-900 text-white px-4 py-2 text-sm font-semibold hover:bg-neutral-700 transition active:scale-[0.98]"
        >
          {mostrarForm ? "Cancelar" : "+ Emitir factura"}
        </button>
      </div>

      {mostrarForm && (
        <form onSubmit={emitir} className="bg-white rounded-2xl shadow-sm p-5 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-neutral-700 mb-1">Encomenda *</label>
            <select
              required
              value={form.encomenda_id}
              onChange={(e) => {
                const enc = encomendas.find((x) => x.id === Number(e.target.value));
                setForm({
                  encomenda_id: e.target.value,
                  valor_total: enc?.valor_frete ? String(enc.valor_frete) : "",
                });
              }}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
            >
              <option value="">
                {facturaveis.length ? "Seleccionar encomenda…" : "Todas as encomendas já têm factura"}
              </option>
              {facturaveis.map((enc) => (
                <option key={enc.id} value={enc.id}>
                  {enc.codigo_rastreio} — {enc.cliente.nome} — {enc.descricao}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Valor / frete (MZN)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder={encSel?.valor_frete ? "Frete calculado" : "Indicar valor"}
              value={form.valor_total}
              onChange={(e) => setForm({ ...form, valor_total: e.target.value })}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
            />
          </div>
          <div>
            <button type="submit" className="rounded-xl bg-green-600 text-white px-5 py-2 text-sm font-semibold hover:bg-green-500 transition active:scale-[0.98]">
              Emitir
            </button>
          </div>
          {erro && <p className="md:col-span-3 text-red-600 text-sm">{erro}</p>}
          {form.encomenda_id && (
            <p className="md:col-span-3 text-xs text-neutral-500 -mt-1">
              {encSel?.valor_frete
                ? `Frete calculado da encomenda: ${Number(encSel.valor_frete).toLocaleString("pt-PT", { minimumFractionDigits: 2 })} MZN — pré-preenchido (pode ajustar).`
                : "Esta encomenda não tem frete calculado (sem peso/dimensões). Indique o valor manualmente."}
            </p>
          )}
        </form>
      )}

      {erro && !mostrarForm && <p className="text-red-600 text-sm mb-4">{erro}</p>}

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-neutral-400 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Número</th>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Referência</th>
              <th className="px-4 py-3 font-medium">Valor (MZN)</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Emitida em</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {facturas.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-neutral-500">Sem facturas emitidas.</td></tr>
            )}
            {facturas.map((f) => (
              <tr key={f.id} className="hover:bg-neutral-50">
                <td className="px-4 py-3">
                  <Link to={`/facturas/${f.id}`} className="font-mono font-semibold text-blue-600 hover:underline">
                    {f.numero}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <Link to={`/clientes/${f.cliente_id}`} className="text-blue-600 hover:underline">
                    {f.cliente_nome}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <Link
                    to={f.encomenda_id ? `/encomendas/${f.encomenda_id}` : `/pedidos/${f.pedido_id}`}
                    className="font-mono text-blue-600 hover:underline"
                  >
                    {f.codigo_rastreio}
                  </Link>
                </td>
                <td className="px-4 py-3">{Number(f.valor_total).toLocaleString("pt-PT", { minimumFractionDigits: 2 })}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-md ${CORES_FACTURA[f.estado]}`}>
                    {f.estado}
                  </span>
                </td>
                <td className="px-4 py-3 text-neutral-500">{formatarData(f.data_emissao)}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap space-x-3">
                  {f.estado === "PENDENTE" && (
                    <>
                      <button
                        onClick={() => marcarPaga(f.id)}
                        className="text-xs font-semibold text-green-700 hover:underline"
                      >
                        Marcar como paga
                      </button>
                      <button
                        onClick={() => cancelar(f.id)}
                        className="text-xs font-semibold text-neutral-500 hover:underline"
                      >
                        Cancelar
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
