import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import { ESTADOS, rotuloEstado, corEstado, formatarData } from "../services/estados";

const FORM_VAZIO = {
  cliente_id: "",
  descricao: "",
  peso_kg: "",
  comprimento_cm: "",
  largura_cm: "",
  altura_cm: "",
  tracking_externo: "",
  transportadora: "",
  previsao_chegada: "",
};

function mzn(valor) {
  return Number(valor).toLocaleString("pt-PT", { minimumFractionDigits: 2 }) + " MZN";
}

// Réplica em JS do cálculo do backend, para pré-visualização em tempo real.
function calcularFrete(form, param) {
  const peso = Number(form.peso_kg) || 0;
  const c = Number(form.comprimento_cm) || 0;
  const l = Number(form.largura_cm) || 0;
  const a = Number(form.altura_cm) || 0;
  const volumetrico = c && l && a ? (c * l * a) / param.divisor_volumetrico : 0;
  const cobravel = Math.max(peso, volumetrico);
  return {
    volumetrico,
    cobravel,
    valor: cobravel * param.tarifa_por_kg,
  };
}

export default function Encomendas() {
  const [encomendas, setEncomendas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [form, setForm] = useState(FORM_VAZIO);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [param, setParam] = useState({ tarifa_por_kg: 1800, divisor_volumetrico: 6000 });
  const [erro, setErro] = useState("");

  function carregar(estado = "") {
    const url = estado ? `/api/encomendas?estado=${estado}` : "/api/encomendas";
    api.get(url).then(setEncomendas).catch((e) => setErro(e.message));
  }

  useEffect(() => {
    carregar();
    api.get("/api/clientes").then(setClientes).catch(() => {});
    api.get("/api/encomendas/parametros-frete").then(setParam).catch(() => {});
  }, []);

  const frete = calcularFrete(form, param);

  async function guardar(e) {
    e.preventDefault();
    setErro("");
    try {
      await api.post("/api/encomendas", {
        cliente_id: Number(form.cliente_id),
        descricao: form.descricao,
        peso_kg: form.peso_kg ? Number(form.peso_kg) : null,
        comprimento_cm: form.comprimento_cm ? Number(form.comprimento_cm) : null,
        largura_cm: form.largura_cm ? Number(form.largura_cm) : null,
        altura_cm: form.altura_cm ? Number(form.altura_cm) : null,
        tracking_externo: form.tracking_externo || null,
        transportadora: form.transportadora || null,
        previsao_chegada: form.previsao_chegada || null,
      });
      setForm(FORM_VAZIO);
      setMostrarForm(false);
      carregar(filtroEstado);
    } catch (erro) {
      setErro(erro.message);
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold tracking-tight text-neutral-900">Encomendas</h2>
        <button
          onClick={() => setMostrarForm(!mostrarForm)}
          className="rounded-xl bg-neutral-900 text-white px-4 py-2 text-sm font-semibold hover:bg-neutral-700 transition active:scale-[0.98]"
        >
          {mostrarForm ? "Cancelar" : "+ Nova encomenda"}
        </button>
      </div>

      {mostrarForm && (
        <form onSubmit={guardar} className="bg-white rounded-2xl shadow-sm p-5 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-neutral-700 mb-1">Cliente *</label>
            <select
              required
              value={form.cliente_id}
              onChange={(e) => setForm({ ...form, cliente_id: e.target.value })}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
            >
              <option value="">Seleccionar cliente…</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.nome} — {c.telefone}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Previsão de chegada</label>
            <input
              type="date"
              value={form.previsao_chegada}
              onChange={(e) => setForm({ ...form, previsao_chegada: e.target.value })}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-neutral-700 mb-1">Descrição da mercadoria *</label>
            <input
              required
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
            />
          </div>
          {[
            ["peso_kg", "Peso real (kg)", "number"],
            ["comprimento_cm", "Comprimento (cm)", "number"],
            ["largura_cm", "Largura (cm)", "number"],
            ["altura_cm", "Altura (cm)", "number"],
            ["transportadora", "Transportadora", "text"],
            ["tracking_externo", "Nº tracking externo (AWB)", "text"],
          ].map(([campo, rotulo, tipo]) => (
            <div key={campo}>
              <label className="block text-sm font-medium text-neutral-700 mb-1">{rotulo}</label>
              <input
                type={tipo}
                step="0.01"
                min={tipo === "number" ? "0" : undefined}
                value={form[campo]}
                onChange={(e) => setForm({ ...form, [campo]: e.target.value })}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
              />
            </div>
          ))}

          {/* Pré-visualização do cálculo do frete (peso cobrável × tarifa) */}
          <div className="md:col-span-3 rounded-xl bg-neutral-50 border border-neutral-200 px-4 py-3 text-sm">
            <div className="flex flex-wrap gap-x-8 gap-y-1 text-neutral-600">
              <span>Peso volumétrico: <strong className="text-neutral-900">{frete.volumetrico ? `${frete.volumetrico.toFixed(2)} kg` : "—"}</strong></span>
              <span>Peso cobrável: <strong className="text-neutral-900">{frete.cobravel ? `${frete.cobravel.toFixed(2)} kg` : "—"}</strong></span>
              <span>Tarifa: <strong className="text-neutral-900">{mzn(param.tarifa_por_kg)}/kg</strong></span>
            </div>
            <div className="mt-1 text-base">
              Valor do frete: <strong className="text-green-700">{frete.valor ? mzn(frete.valor) : "—"}</strong>
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              Cobra-se o maior entre o peso real e o volumétrico (C×L×A ÷ {param.divisor_volumetrico}). Calculado automaticamente ao registar.
            </p>
          </div>

          <div className="flex items-end">
            <button type="submit" className="rounded-xl bg-green-600 text-white px-5 py-2 text-sm font-semibold hover:bg-green-500 transition active:scale-[0.98]">
              Registar encomenda
            </button>
          </div>
        </form>
      )}

      {erro && <p className="text-red-600 text-sm mb-4">{erro}</p>}

      <select
        value={filtroEstado}
        onChange={(e) => {
          setFiltroEstado(e.target.value);
          carregar(e.target.value);
        }}
        className="rounded-xl border border-neutral-200 px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-neutral-400"
      >
        <option value="">Todos os estados</option>
        {Object.keys(ESTADOS).map((e) => (
          <option key={e} value={e}>{rotuloEstado(e)}</option>
        ))}
      </select>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-neutral-400 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Código</th>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Descrição</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Registo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {encomendas.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-neutral-500">Sem encomendas.</td></tr>
            )}
            {encomendas.map((enc) => (
              <tr key={enc.id} className="hover:bg-neutral-50">
                <td className="px-4 py-3">
                  <Link to={`/encomendas/${enc.id}`} className="font-mono font-semibold text-blue-600 hover:underline">
                    {enc.codigo_rastreio}
                  </Link>
                </td>
                <td className="px-4 py-3">{enc.cliente.nome}</td>
                <td className="px-4 py-3 max-w-xs truncate">{enc.descricao}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-md ${corEstado(enc.estado)}`}>
                    {rotuloEstado(enc.estado)}
                  </span>
                </td>
                <td className="px-4 py-3 text-neutral-500">{formatarData(enc.data_registo)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
