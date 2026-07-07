import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../services/api";

function mzn(valor) {
  return Number(valor).toLocaleString("pt-PT", { minimumFractionDigits: 2 }) + " MZN";
}

const METODO_LABEL = {
  PROGRESSIVA: "Progressiva (3/4/5%)",
  FIXA: "Percentagem fixa",
  QUOTA: "Quota fixa anual",
};

export default function DeclaracaoISPC() {
  const { ano, trimestre } = useParams();
  const [empresa, setEmpresa] = useState(null);
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    api.get("/api/configuracao/frete").then(setEmpresa).catch((e) => setErro(e.message));
    api.get(`/api/fiscal/ispc?ano=${ano}`).then(setDados).catch((e) => setErro(e.message));
  }, [ano]);

  if (erro) return <p className="text-red-600">{erro}</p>;
  if (!empresa || !dados) return <p className="text-neutral-500">A carregar…</p>;

  const t = dados.trimestres.find((x) => x.trimestre === Number(trimestre));
  if (!t) return <p className="text-red-600">Trimestre inválido.</p>;

  const dataHoje = new Date().toLocaleDateString("pt-PT", { day: "2-digit", month: "long", year: "numeric" });
  const Linha = ({ rotulo, valor }) => (
    <div className="flex justify-between gap-4 py-1.5 border-b border-neutral-100">
      <dt className="text-neutral-500">{rotulo}</dt>
      <dd className="text-neutral-900 font-medium text-right">{valor || "—"}</dd>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6 print:hidden">
        <Link to="/fiscal" className="text-sm text-blue-600 hover:underline">← Voltar à Declaração ISPC</Link>
        <button
          onClick={() => window.print()}
          className="rounded-xl bg-neutral-900 text-white px-4 py-2 text-sm font-semibold hover:bg-neutral-700 transition active:scale-[0.98]"
        >
          Imprimir / PDF
        </button>
      </div>

      {/* Documento A4 imprimível */}
      <div className="bg-white rounded-2xl shadow-sm print:border-0 print:rounded-none p-8">
        <div className="text-center border-b border-neutral-200 pb-5 mb-6">
          <p className="text-xs uppercase tracking-widest text-neutral-400">República de Moçambique — Autoridade Tributária</p>
          <h1 className="text-xl font-bold text-neutral-900 mt-1">
            Declaração / Guia de Pagamento do ISPC
          </h1>
          <p className="text-sm text-neutral-500">Imposto Simplificado para Pequenos Contribuintes — Modelo 30</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6 mb-6">
          <div>
            <p className="text-xs uppercase tracking-wider text-neutral-400 mb-2">Contribuinte</p>
            <dl className="text-sm">
              <Linha rotulo="Designação" valor={empresa.empresa_nome} />
              <Linha rotulo="NUIT" valor={empresa.empresa_nuit} />
              <Linha rotulo="Endereço" valor={empresa.empresa_endereco} />
              <Linha rotulo="Telefone" valor={empresa.empresa_telefone} />
              <Linha rotulo="Direcção da Área Fiscal" valor={empresa.daf} />
            </dl>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-neutral-400 mb-2">Período</p>
            <dl className="text-sm">
              <Linha rotulo="Ano" valor={dados.ano} />
              <Linha rotulo="Trimestre" valor={`${t.trimestre}.º (${t.periodo})`} />
              <Linha rotulo="Mês de pagamento" valor={t.mes_pagamento} />
              <Linha rotulo="Regime" valor="ISPC (isento de IVA)" />
            </dl>
          </div>
        </div>

        <p className="text-xs uppercase tracking-wider text-neutral-400 mb-2">Apuramento do imposto</p>
        <table className="w-full text-sm mb-8">
          <tbody>
            <tr className="border-b border-neutral-100">
              <td className="py-3 text-neutral-600">Volume de negócios do trimestre</td>
              <td className="py-3 text-right font-medium">{mzn(t.volume_negocios)}</td>
            </tr>
            <tr className="border-b border-neutral-100">
              <td className="py-3 text-neutral-600">
                Método / taxa ({METODO_LABEL[dados.metodo]})
                {dados.primeiro_ano && " · 1.º ano (taxa a metade)"}
              </td>
              <td className="py-3 text-right font-medium">
                {dados.metodo === "QUOTA" ? "Quota fixa" : `${t.taxa}%`}
              </td>
            </tr>
            <tr className="border-t-2 border-neutral-900">
              <td className="py-3 font-semibold text-neutral-900">ISPC a pagar</td>
              <td className="py-3 text-right text-lg font-bold text-neutral-900">{mzn(t.ispc_devido)}</td>
            </tr>
          </tbody>
        </table>

        <div className="flex items-end justify-between gap-8 mt-12">
          <div className="text-sm text-neutral-600">
            <p>{empresa.empresa_endereco || "____________________"}, {dataHoje}</p>
            <div className="mt-10 border-t border-neutral-400 w-64 pt-1 text-center text-xs text-neutral-500">
              {empresa.declarante_nome || "O Declarante"}
              {empresa.declarante_cargo && <span className="block">{empresa.declarante_cargo}</span>}
            </div>
          </div>
          <p className="text-[10px] text-neutral-400 max-w-[12rem] text-right">
            Documento de apoio gerado pelo sistema. Confirmar valores e formulário oficial
            junto da Direcção da Área Fiscal.
          </p>
        </div>
      </div>
    </div>
  );
}
