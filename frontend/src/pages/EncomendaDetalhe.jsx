import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../services/api";
import Anexos from "../components/Anexos";
import { ESTADOS, rotuloEstado, corEstado, formatarData } from "../services/estados";

// Percurso normal da encomenda (ATRASADA é excepção, mostrada como alerta)
const PERCURSO = [
  "REGISTADA",
  "RECEBIDA_CHINA",
  "EMBARCADA",
  "EM_TRANSITO",
  "CHEGOU_MOCAMBIQUE",
  "DESALFANDEGADA",
  "DISPONIVEL_LEVANTAMENTO",
  "ENTREGUE",
];

const CORES_FACTURA = {
  PENDENTE: "bg-amber-100 text-amber-700",
  PAGA: "bg-green-100 text-green-700",
  CANCELADA: "bg-neutral-100 text-neutral-500",
};

function mzn(valor) {
  return Number(valor).toLocaleString("pt-PT", { minimumFractionDigits: 2 }) + " MZN";
}

// Rótulos compactos para cada etapa caber numa só linha
const ROTULOS_PERCURSO = {
  REGISTADA: "Registada",
  RECEBIDA_CHINA: "Na China",
  EMBARCADA: "Embarcada",
  EM_TRANSITO: "Em trânsito",
  CHEGOU_MOCAMBIQUE: "Em Moçambique",
  DESALFANDEGADA: "Desalfandegada",
  DISPONIVEL_LEVANTAMENTO: "Disponível",
  ENTREGUE: "Entregue",
};

function Percurso({ estadoActual }) {
  const indiceActual = PERCURSO.indexOf(estadoActual);
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 mb-6">
      <div className="flex items-center">
        {PERCURSO.map((estado, i) => {
          const feito = indiceActual >= 0 && i <= indiceActual;
          return (
            <div key={estado} className="flex-1 flex flex-col items-center relative">
              {i > 0 && (
                <div
                  className={`absolute top-3 right-1/2 w-full h-0.5 ${
                    feito ? "bg-green-500" : "bg-neutral-200"
                  }`}
                />
              )}
              <div
                className={`relative z-10 h-6 w-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${
                  feito
                    ? "bg-green-500 border-green-500 text-white"
                    : "bg-white border-neutral-300 text-neutral-400"
                }`}
              >
                {feito ? "✓" : i + 1}
              </div>
              <p className={`mt-2 text-[10px] text-center whitespace-nowrap ${feito ? "text-neutral-900 font-medium" : "text-neutral-400"}`}>
                {ROTULOS_PERCURSO[estado]}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function EncomendaDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [encomenda, setEncomenda] = useState(null);
  const [novoEstado, setNovoEstado] = useState("");
  const [localizacao, setLocalizacao] = useState("");
  const [valorFactura, setValorFactura] = useState("");
  const [outroValor, setOutroValor] = useState(false);
  const [erro, setErro] = useState("");

  function carregar() {
    api.get(`/api/encomendas/${id}`).then(setEncomenda).catch((e) => setErro(e.message));
  }

  useEffect(() => carregar(), [id]);

  async function mudarEstado(e) {
    e.preventDefault();
    setErro("");
    try {
      await api.post(`/api/encomendas/${id}/estado`, {
        estado: novoEstado,
        localizacao: localizacao || null,
      });
      setNovoEstado("");
      setLocalizacao("");
      carregar();
    } catch (erro) {
      setErro(erro.message);
    }
  }

  async function emitirFactura(e) {
    e.preventDefault();
    setErro("");
    try {
      const factura = await api.post("/api/facturas", {
        encomenda_id: Number(id),
        // Vazio → o backend usa o frete calculado da encomenda
        valor_total: valorFactura === "" ? null : Number(valorFactura),
      });
      // Abre logo o documento emitido (para imprimir / enviar ao cliente)
      navigate(`/facturas/${factura.id}`);
    } catch (erro) {
      setErro(erro.message);
    }
  }

  if (erro && !encomenda) return <p className="text-red-600">{erro}</p>;
  if (!encomenda) return <p className="text-neutral-500">A carregar…</p>;

  return (
    <div className="max-w-4xl mx-auto">
      <Link to="/encomendas" className="text-sm text-blue-600 hover:underline">← Voltar às encomendas</Link>

      <div className="flex items-center gap-4 mt-3 mb-6">
        <h2 className="text-3xl font-bold tracking-tight text-neutral-900 font-mono">{encomenda.codigo_rastreio}</h2>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-md ${corEstado(encomenda.estado)}`}>
          {rotuloEstado(encomenda.estado)}
        </span>
      </div>

      {encomenda.estado === "ATRASADA" && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-6">
          ⚠ Esta encomenda encontra-se <strong>atrasada</strong>. O cliente foi notificado automaticamente.
        </div>
      )}

      {encomenda.multa && (
        <div className="bg-orange-50 border border-orange-200 text-orange-800 rounded-xl px-4 py-3 text-sm mb-6">
          ⏰ Frete em atraso: <strong>{encomenda.multa.dias} dia(s)</strong> de multa desde {encomenda.multa.data_inicio} ·
          multa acumulada <strong>{mzn(encomenda.multa.valor_total)}</strong> ({mzn(encomenda.multa.valor_dia)}/dia).
        </div>
      )}

      <Percurso estadoActual={encomenda.estado} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h3 className="font-semibold text-neutral-900 mb-3">Dados da encomenda</h3>
            <dl className="text-sm space-y-2">
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-500">Cliente</dt>
                <dd className="text-right">
                  <Link to={`/clientes/${encomenda.cliente.id}`} className="font-medium text-blue-600 hover:underline">
                    {encomenda.cliente.nome}
                  </Link>
                  <span className="block text-xs text-neutral-400">{encomenda.cliente.telefone}</span>
                </dd>
              </div>
              {[
                ["Descrição", encomenda.descricao],
                ["Peso real", encomenda.peso_kg ? `${encomenda.peso_kg} kg` : "—"],
                ["Dimensões (C×L×A)",
                  encomenda.comprimento_cm && encomenda.largura_cm && encomenda.altura_cm
                    ? `${encomenda.comprimento_cm} × ${encomenda.largura_cm} × ${encomenda.altura_cm} cm`
                    : "—"],
                ["Peso volumétrico", encomenda.peso_volumetrico_kg ? `${encomenda.peso_volumetrico_kg} kg` : "—"],
                ["Peso cobrável", encomenda.peso_cobravel_kg ? `${encomenda.peso_cobravel_kg} kg` : "—"],
                ["Valor do frete", encomenda.valor_frete ? mzn(encomenda.valor_frete) : "—"],
                ["Rota", `${encomenda.origem} → ${encomenda.destino}`],
                ["Tracking externo", encomenda.tracking_externo ?? "—"],
                ["Previsão de chegada", encomenda.previsao_chegada ?? "—"],
                ["Registada em", formatarData(encomenda.data_registo)],
                ["Última actualização", formatarData(encomenda.actualizado_em)],
              ].map(([rotulo, valor]) => (
                <div key={rotulo} className="flex justify-between gap-4">
                  <dt className="text-neutral-500">{rotulo}</dt>
                  <dd className="text-neutral-900 font-medium text-right">{valor}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h3 className="font-semibold text-neutral-900 mb-3">Facturas desta encomenda</h3>
            {encomenda.facturas.length === 0 && (
              <p className="text-sm text-neutral-500 mb-3">Ainda sem factura emitida.</p>
            )}
            <div className="space-y-2 mb-4">
              {encomenda.facturas.map((f) => (
                <div key={f.id} className="flex items-center justify-between text-sm border border-neutral-100 rounded-lg px-3 py-2">
                  <Link to={`/facturas/${f.id}`} className="font-mono font-semibold text-blue-600 hover:underline">
                    {f.numero}
                  </Link>
                  <span>{mzn(f.valor_total)}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${CORES_FACTURA[f.estado]}`}>
                    {f.estado}
                  </span>
                </div>
              ))}
            </div>
            {encomenda.facturas.some((f) => f.estado !== "CANCELADA") ? (
              <p className="text-sm text-neutral-500">
                Esta encomenda já tem factura emitida. Para emitir outra, cancele a actual primeiro.
              </p>
            ) : encomenda.valor_frete ? (
              <>
                {/* Valor a pagar vem automaticamente do frete calculado */}
                <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 mb-3">
                  <p className="text-xs text-green-700">Valor a pagar (frete calculado)</p>
                  <p className="text-2xl font-bold text-green-700 leading-tight">{mzn(encomenda.valor_frete)}</p>
                  {encomenda.peso_cobravel_kg && (
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {encomenda.peso_cobravel_kg} kg cobráveis × tarifa
                    </p>
                  )}
                </div>
                <form onSubmit={emitirFactura}>
                  <button type="submit" className="w-full rounded-xl bg-neutral-900 text-white px-4 py-2 text-sm font-semibold hover:bg-neutral-700 transition active:scale-[0.98]">
                    Emitir factura de {mzn(encomenda.valor_frete)}
                  </button>
                </form>
                <button
                  type="button"
                  onClick={() => setOutroValor(!outroValor)}
                  className="text-xs text-blue-600 hover:underline mt-2"
                >
                  {outroValor ? "Cancelar" : "Emitir com outro valor"}
                </button>
                {outroValor && (
                  <form onSubmit={emitirFactura} className="flex gap-2 mt-2">
                    <input
                      required
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Outro valor (MZN)"
                      value={valorFactura}
                      onChange={(e) => setValorFactura(e.target.value)}
                      className="flex-1 rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
                    />
                    <button type="submit" className="rounded-xl bg-neutral-900 text-white px-4 py-2 text-sm font-semibold hover:bg-neutral-700 transition active:scale-[0.98]">
                      Emitir
                    </button>
                  </form>
                )}
              </>
            ) : (
              <>
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-3">
                  Esta encomenda ainda não tem frete calculado. Adicione o peso e as dimensões para o calcular automaticamente, ou indique um valor manual.
                </p>
                <form onSubmit={emitirFactura} className="flex gap-2">
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Valor (MZN)"
                    value={valorFactura}
                    onChange={(e) => setValorFactura(e.target.value)}
                    className="flex-1 rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
                  />
                  <button type="submit" className="rounded-xl bg-neutral-900 text-white px-4 py-2 text-sm font-semibold hover:bg-neutral-700 transition active:scale-[0.98]">
                    Emitir factura
                  </button>
                </form>
              </>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <form onSubmit={mudarEstado} className="bg-white rounded-2xl shadow-sm p-5">
            <h3 className="font-semibold text-neutral-900 mb-3">Actualizar estado</h3>
            <select
              required
              value={novoEstado}
              onChange={(e) => setNovoEstado(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-neutral-400"
            >
              <option value="">Seleccionar novo estado…</option>
              {Object.keys(ESTADOS)
                .filter((e) => e !== encomenda.estado)
                .map((e) => (
                  <option key={e} value={e}>{rotuloEstado(e)}</option>
                ))}
            </select>
            <input
              placeholder="Localização (opcional)"
              value={localizacao}
              onChange={(e) => setLocalizacao(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-neutral-400"
            />
            {erro && <p className="text-sm text-red-600 mb-3">{erro}</p>}
            <button type="submit" className="rounded-xl bg-neutral-900 text-white px-4 py-2 text-sm font-semibold hover:bg-neutral-700 transition active:scale-[0.98]">
              Confirmar mudança
            </button>
            <p className="text-xs text-neutral-400 mt-2">
              A mudança gera um evento no histórico e notifica o cliente automaticamente.
            </p>
          </form>

          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h3 className="font-semibold text-neutral-900 mb-4">Histórico de tracking</h3>
            <ol className="relative border-l border-neutral-200 ml-2 space-y-5">
              {[...encomenda.eventos].reverse().map((ev) => (
                <li key={ev.id} className="ml-4">
                  <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-neutral-400" />
                  <p className="text-sm font-medium text-neutral-900">{rotuloEstado(ev.estado)}</p>
                  {ev.descricao && <p className="text-sm text-neutral-600">{ev.descricao}</p>}
                  <p className="text-xs text-neutral-400">
                    {formatarData(ev.data_evento)}
                    {ev.localizacao && ` · ${ev.localizacao}`}
                    {ev.origem_evento === "API_TRACKING" && " · via API de tracking"}
                  </p>
                </li>
              ))}
            </ol>
          </div>

          <Anexos encomendaId={encomenda.id} categoriasSugeridas={["DOC_ALFANDEGA", "FOTO_ARMAZEM"]} />
        </div>
      </div>
    </div>
  );
}
