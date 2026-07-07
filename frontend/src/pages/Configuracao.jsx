import { useEffect, useState } from "react";
import { api } from "../services/api";
import { formatarData } from "../services/estados";

function mzn(valor) {
  return Number(valor).toLocaleString("pt-PT", { minimumFractionDigits: 2 }) + " MZN";
}

const METODOS_ISPC = {
  PROGRESSIVA: "Progressiva (3% até 1M · 4% até 2,5M · 5% acima)",
  FIXA: "Percentagem fixa",
  QUOTA: "Quota fixa anual",
};

export default function Configuracao() {
  const [form, setForm] = useState({
    tarifa_por_kg: "",
    divisor_volumetrico: "",
    ispc_metodo: "PROGRESSIVA",
    ispc_percentagem: "",
    ispc_quota_anual: "",
    ispc_primeiro_ano: false,
    empresa_nome: "",
    empresa_nuit: "",
    empresa_endereco: "",
    empresa_telefone: "",
    daf: "",
    declarante_nome: "",
    declarante_cargo: "",
  });
  const [logs, setLogs] = useState([]);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  function carregar() {
    api.get("/api/configuracao/frete").then((c) =>
      setForm({
        tarifa_por_kg: String(c.tarifa_por_kg),
        divisor_volumetrico: String(c.divisor_volumetrico),
        ispc_metodo: c.ispc_metodo,
        ispc_percentagem: String(c.ispc_percentagem),
        ispc_quota_anual: String(c.ispc_quota_anual),
        ispc_primeiro_ano: c.ispc_primeiro_ano,
        empresa_nome: c.empresa_nome,
        empresa_nuit: c.empresa_nuit,
        empresa_endereco: c.empresa_endereco,
        empresa_telefone: c.empresa_telefone,
        daf: c.daf,
        declarante_nome: c.declarante_nome,
        declarante_cargo: c.declarante_cargo,
      })
    ).catch((e) => setErro(e.message));
    api.get("/api/configuracao/frete/logs").then(setLogs).catch(() => {});
  }

  useEffect(carregar, []);

  async function guardar(e) {
    e.preventDefault();
    setErro("");
    setSucesso("");
    try {
      await api.put("/api/configuracao/frete", {
        tarifa_por_kg: Number(form.tarifa_por_kg),
        divisor_volumetrico: Number(form.divisor_volumetrico),
        ispc_metodo: form.ispc_metodo,
        ispc_percentagem: Number(form.ispc_percentagem),
        ispc_quota_anual: Number(form.ispc_quota_anual),
        ispc_primeiro_ano: form.ispc_primeiro_ano,
        empresa_nome: form.empresa_nome,
        empresa_nuit: form.empresa_nuit,
        empresa_endereco: form.empresa_endereco,
        empresa_telefone: form.empresa_telefone,
        daf: form.daf,
        declarante_nome: form.declarante_nome,
        declarante_cargo: form.declarante_cargo,
      });
      setSucesso("Parâmetros actualizados com sucesso.");
      carregar();
    } catch (erro) {
      setErro(erro.message);
    }
  }

  // Pré-visualização do frete com o exemplo da caixa 100×50×40 cm
  const divisor = Number(form.divisor_volumetrico) || 6000;
  const tarifa = Number(form.tarifa_por_kg) || 0;
  const volExemplo = (100 * 50 * 40) / divisor;

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-3xl font-bold tracking-tight text-neutral-900 mb-6">Configuração</h2>

      <form onSubmit={guardar} className="bg-white rounded-2xl shadow-sm p-5 mb-6">
        <h3 className="font-semibold text-neutral-900 mb-4">Cálculo do frete</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Tarifa por kg (MZN)</label>
            <input
              required
              type="number"
              step="0.01"
              min="0.01"
              value={form.tarifa_por_kg}
              onChange={(e) => setForm({ ...form, tarifa_por_kg: e.target.value })}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Divisor volumétrico</label>
            <input
              required
              type="number"
              step="1"
              min="1"
              value={form.divisor_volumetrico}
              onChange={(e) => setForm({ ...form, divisor_volumetrico: e.target.value })}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
            />
          </div>
        </div>

        <div className="mt-4 rounded-xl bg-neutral-50 border border-neutral-200 px-4 py-3 text-sm text-neutral-600">
          Exemplo: caixa 100×50×40 cm → peso volumétrico {volExemplo.toFixed(2)} kg → frete{" "}
          <strong className="text-neutral-900">{tarifa ? mzn(volExemplo * tarifa) : "—"}</strong>
        </div>

        <h3 className="font-semibold text-neutral-900 mt-6 mb-1">ISPC (Imposto Simplificado)</h3>
        <p className="text-xs text-neutral-500 mb-4">
          A empresa está em ISPC: as facturas não cobram IVA. O ISPC é declarado
          trimestralmente (Modelo 30) sobre o volume de negócios — ver a página Declaração ISPC.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-neutral-700 mb-1">Método de cálculo</label>
            <select
              value={form.ispc_metodo}
              onChange={(e) => setForm({ ...form, ispc_metodo: e.target.value })}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
            >
              {Object.entries(METODOS_ISPC).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          {form.ispc_metodo === "FIXA" && (
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Percentagem fixa (%)</label>
              <input
                required
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={form.ispc_percentagem}
                onChange={(e) => setForm({ ...form, ispc_percentagem: e.target.value })}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
              />
            </div>
          )}
          {form.ispc_metodo === "QUOTA" && (
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Quota anual (MZN)</label>
              <input
                required
                type="number"
                step="0.01"
                min="0"
                value={form.ispc_quota_anual}
                onChange={(e) => setForm({ ...form, ispc_quota_anual: e.target.value })}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
              />
            </div>
          )}
          <label className="flex items-center gap-2 text-sm text-neutral-700 md:col-span-2">
            <input
              type="checkbox"
              checked={form.ispc_primeiro_ano}
              onChange={(e) => setForm({ ...form, ispc_primeiro_ano: e.target.checked })}
              className="h-4 w-4 rounded border-neutral-300"
            />
            1.º ano de actividade (taxa reduzida a metade)
          </label>
        </div>

        <h3 className="font-semibold text-neutral-900 mt-6 mb-1">Dados do contribuinte</h3>
        <p className="text-xs text-neutral-500 mb-4">
          Usados no cabeçalho das facturas e na declaração do ISPC (Modelo 30).
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { campo: "empresa_nome", rotulo: "Designação / Razão social", span: "md:col-span-2" },
            { campo: "empresa_nuit", rotulo: "NUIT (9 dígitos)", inputMode: "numeric", pattern: "[0-9]{9}", maxLength: 9, title: "O NUIT tem 9 dígitos." },
            { campo: "empresa_telefone", rotulo: "Telefone", inputMode: "tel" },
            { campo: "empresa_endereco", rotulo: "Endereço", span: "md:col-span-2" },
            { campo: "daf", rotulo: "Direcção da Área Fiscal (DAF)", span: "md:col-span-2" },
            { campo: "declarante_nome", rotulo: "Declarante (nome)" },
            { campo: "declarante_cargo", rotulo: "Cargo do declarante" },
          ].map(({ campo, rotulo, span, inputMode, pattern, maxLength, title }) => (
            <div key={campo} className={span}>
              <label className="block text-sm font-medium text-neutral-700 mb-1">{rotulo}</label>
              <input
                inputMode={inputMode}
                pattern={pattern}
                maxLength={maxLength}
                title={title}
                value={form[campo]}
                onChange={(e) => setForm({ ...form, [campo]: e.target.value })}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
              />
            </div>
          ))}
        </div>

        {erro && <p className="text-sm text-red-600 mt-3">{erro}</p>}
        {sucesso && <p className="text-sm text-green-600 mt-3">{sucesso}</p>}

        <button
          type="submit"
          className="mt-4 rounded-xl bg-neutral-900 text-white px-5 py-2 text-sm font-semibold hover:bg-neutral-700 transition active:scale-[0.98]"
        >
          Guardar alterações
        </button>
      </form>

      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h3 className="font-semibold text-neutral-900 mb-3">Histórico de alterações</h3>
        {logs.length === 0 && <p className="text-sm text-neutral-500">Ainda sem alterações registadas.</p>}
        {logs.length > 0 && (
          <table className="w-full text-sm">
            <thead className="text-neutral-400 text-left">
              <tr>
                <th className="py-2 font-medium whitespace-nowrap pr-4">Data</th>
                <th className="py-2 font-medium whitespace-nowrap pr-4">Quem</th>
                <th className="py-2 font-medium">Alterações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {logs.map((l) => (
                <tr key={l.id}>
                  <td className="py-2 text-neutral-500 whitespace-nowrap pr-4">{formatarData(l.criado_em)}</td>
                  <td className="py-2 font-medium text-neutral-900 whitespace-nowrap pr-4">{l.utilizador_nome}</td>
                  <td className="py-2 text-neutral-700">{l.alteracoes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
