import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { rotuloEstado, corEstado, formatarData } from "../services/estados";

export default function TrackingPublico() {
  const [searchParams] = useSearchParams();
  const [codigo, setCodigo] = useState(searchParams.get("codigo") ?? "");
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState("");
  const [aCarregar, setACarregar] = useState(false);

  async function consultar(valor) {
    setErro("");
    setResultado(null);
    setACarregar(true);
    try {
      const resposta = await fetch(`/api/tracking/${encodeURIComponent(valor.trim())}`);
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados?.detail || "Erro na consulta");
      setResultado(dados);
    } catch (erro) {
      setErro(erro.message);
    } finally {
      setACarregar(false);
    }
  }

  // Pesquisa automática quando o código vem no URL (ex.: leitura do QR da factura)
  useEffect(() => {
    const inicial = searchParams.get("codigo");
    if (inicial) consultar(inicial);
  }, []);

  function pesquisar(e) {
    e.preventDefault();
    consultar(codigo);
  }

  return (
    <div className="min-h-screen bg-[#ececec] px-4 py-12">
      <div className="max-w-xl mx-auto">
        <div className="text-center text-neutral-900 mb-8">
          <h1 className="text-2xl font-bold">Connex Importações</h1>
          <p className="text-neutral-400 text-sm mt-1">Rastreie a sua encomenda</p>
        </div>

        <form onSubmit={pesquisar} className="flex gap-2 mb-6">
          <input
            required
            placeholder="Código de rastreio (ex.: CNX-A1B2C3)"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            className="flex-1 rounded-lg border-0 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-neutral-400 font-mono"
          />
          <button
            type="submit"
            disabled={aCarregar}
            className="rounded-xl bg-neutral-900 text-white px-6 py-3 text-sm font-semibold hover:bg-neutral-700 transition active:scale-[0.98] disabled:opacity-50"
          >
            {aCarregar ? "…" : "Rastrear"}
          </button>
        </form>

        {erro && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">{erro}</div>
        )}

        {resultado && (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="p-5 border-b border-neutral-100">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono font-bold text-neutral-900">{resultado.codigo_rastreio}</p>
                  <p className="text-sm text-neutral-500 mt-0.5">{resultado.descricao}</p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-md whitespace-nowrap ${corEstado(resultado.estado)}`}>
                  {rotuloEstado(resultado.estado)}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-3">
                {resultado.origem} → {resultado.destino}
                {resultado.previsao_chegada && ` · Previsão de chegada: ${resultado.previsao_chegada}`}
              </p>
            </div>
            <div className="p-5">
              <ol className="relative border-l border-neutral-200 ml-2 space-y-5">
                {[...resultado.eventos].reverse().map((ev) => (
                  <li key={ev.id} className="ml-4">
                    <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-green-500" />
                    <p className="text-sm font-medium text-neutral-900">{rotuloEstado(ev.estado)}</p>
                    {ev.descricao && <p className="text-sm text-neutral-600">{ev.descricao}</p>}
                    <p className="text-xs text-neutral-400">
                      {formatarData(ev.data_evento)}
                      {ev.localizacao && ` · ${ev.localizacao}`}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}

        <p className="text-center mt-8 space-x-4">
          <Link to="/portal" className="text-neutral-500 text-xs hover:text-neutral-900 underline">
            Portal do cliente (todas as encomendas)
          </Link>
          <Link to="/login" className="text-neutral-500 text-xs hover:text-neutral-900 underline">
            Acesso de funcionários
          </Link>
        </p>
      </div>
    </div>
  );
}
