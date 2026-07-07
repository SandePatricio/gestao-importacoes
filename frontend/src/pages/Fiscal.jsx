import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";

function mzn(valor) {
  return Number(valor).toLocaleString("pt-PT", { minimumFractionDigits: 2 }) + " MZN";
}

const METODO_LABEL = {
  PROGRESSIVA: "Progressiva (3/4/5%)",
  FIXA: "Percentagem fixa",
  QUOTA: "Quota fixa anual",
};

export default function Fiscal() {
  const anoActual = new Date().getFullYear();
  const [ano, setAno] = useState(anoActual);
  const [anos, setAnos] = useState([]);
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    api.get("/api/fiscal/ispc/anos")
      .then((lista) => setAnos(lista.length ? lista : [anoActual]))
      .catch(() => setAnos([anoActual]));
  }, []);

  useEffect(() => {
    api.get(`/api/fiscal/ispc?ano=${ano}`).then(setDados).catch((e) => setErro(e.message));
  }, [ano]);

  if (erro) return <p className="text-red-600">{erro}</p>;
  if (!dados) return <p className="text-neutral-500">A carregar…</p>;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-2 print:hidden">
        <h2 className="text-3xl font-bold tracking-tight text-neutral-900">Declaração ISPC</h2>
        <div className="flex items-center gap-3">
          <select
            value={ano}
            onChange={(e) => setAno(Number(e.target.value))}
            className="rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
          >
            {[...new Set([anoActual, ...anos])].sort((a, b) => b - a).map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <button
            onClick={() => window.print()}
            className="rounded-xl bg-neutral-900 text-white px-4 py-2 text-sm font-semibold hover:bg-neutral-700 transition active:scale-[0.98]"
          >
            Imprimir / PDF
          </button>
        </div>
      </div>

      <p className="text-sm text-neutral-500 mb-6">
        Apoio ao preenchimento do <strong>Modelo 30</strong> da Autoridade Tributária.
        Volume de negócios = total das facturas <strong>pagas</strong> no trimestre. O ISPC é pago
        em Abril, Julho, Outubro e Janeiro do ano seguinte.
      </p>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex flex-wrap gap-x-8 gap-y-1 text-sm text-neutral-600 mb-5 pb-4 border-b border-neutral-100">
          <span>Ano: <strong className="text-neutral-900">{dados.ano}</strong></span>
          <span>Método: <strong className="text-neutral-900">{METODO_LABEL[dados.metodo]}</strong></span>
          {dados.metodo === "QUOTA"
            ? <span>Quota anual: <strong className="text-neutral-900">{mzn(dados.quota_anual)}</strong></span>
            : <span>Taxa aplicada: <strong className="text-neutral-900">{dados.taxa}%</strong></span>}
          {dados.primeiro_ano && <span className="text-amber-700 font-medium">1.º ano (taxa a metade)</span>}
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-neutral-900 text-left text-neutral-600">
              <th className="py-2 font-medium">Trimestre</th>
              <th className="py-2 font-medium text-right">Volume de negócios</th>
              <th className="py-2 font-medium text-right">Taxa</th>
              <th className="py-2 font-medium text-right">ISPC devido</th>
              <th className="py-2 font-medium text-right">Pagamento</th>
              <th className="py-2 font-medium text-right print:hidden" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {dados.trimestres.map((t) => (
              <tr key={t.trimestre}>
                <td className="py-2.5">{t.trimestre}.º <span className="text-neutral-400">({t.periodo})</span></td>
                <td className="py-2.5 text-right">{mzn(t.volume_negocios)}</td>
                <td className="py-2.5 text-right">{t.taxa != null ? `${t.taxa}%` : "quota"}</td>
                <td className="py-2.5 text-right font-medium">{mzn(t.ispc_devido)}</td>
                <td className="py-2.5 text-right text-neutral-500">{t.mes_pagamento}</td>
                <td className="py-2.5 text-right print:hidden">
                  <Link to={`/fiscal/declaracao/${dados.ano}/${t.trimestre}`} className="text-xs font-semibold text-blue-600 hover:underline">
                    Gerar declaração
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-neutral-900 font-semibold text-neutral-900">
              <td className="py-3">Total {dados.ano}</td>
              <td className="py-3 text-right">{mzn(dados.volume_anual)}</td>
              <td />
              <td className="py-3 text-right text-lg">{mzn(dados.total_ispc)}</td>
              <td />
              <td className="print:hidden" />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
