import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import Anexos from "../components/Anexos";
import { rotuloPedido, corPedido, rotuloEstado, corEstado, mzn, formatarData, TIPOS_PEDIDO } from "../services/estados";

const CORES_FACTURA = {
  PENDENTE: "bg-amber-100 text-amber-700",
  PAGA: "bg-green-100 text-green-700",
  CANCELADA: "bg-neutral-100 text-neutral-500",
};

const COTACAO_VAZIA = {
  preco_produto_mzn: "",
  servico_compra_mzn: "",
  peso_estimado_kg: "",
  estimativa_transporte_mzn: "",
  cotacao_observacoes: "",
};

const MEDICAO_VAZIA = {
  peso_kg: "",
  comprimento_cm: "",
  largura_cm: "",
  altura_cm: "",
  awb: "",
  tracking_externo: "",
  transportadora: "",
  previsao_chegada: "",
};

function numOuNulo(v) {
  return v === "" || v === null || v === undefined ? null : Number(v);
}

export default function PedidoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pedido, setPedido] = useState(null);
  const [cotacao, setCotacao] = useState(COTACAO_VAZIA);
  const [medicao, setMedicao] = useState(MEDICAO_VAZIA);
  const [tarifa, setTarifa] = useState(1800);
  const [erro, setErro] = useState("");

  function carregar() {
    api.get(`/api/pedidos/${id}`).then((p) => {
      setPedido(p);
      setCotacao({
        preco_produto_mzn: p.preco_produto_mzn ?? "",
        servico_compra_mzn: p.servico_compra_mzn ?? "",
        peso_estimado_kg: p.peso_estimado_kg ?? "",
        estimativa_transporte_mzn: p.estimativa_transporte_mzn ?? "",
        cotacao_observacoes: p.cotacao_observacoes ?? "",
      });
    }).catch((e) => setErro(e.message));
  }

  useEffect(() => {
    carregar();
    api.get("/api/encomendas/parametros-frete").then((p) => setTarifa(p.tarifa_por_kg)).catch(() => {});
  }, [id]);

  async function accao(fn) {
    setErro("");
    try {
      await fn();
      carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  async function guardarCotacao(e) {
    e.preventDefault();
    await accao(() =>
      api.put(`/api/pedidos/${id}/cotacao`, {
        preco_produto_mzn: numOuNulo(cotacao.preco_produto_mzn),
        servico_compra_mzn: numOuNulo(cotacao.servico_compra_mzn),
        peso_estimado_kg: numOuNulo(cotacao.peso_estimado_kg),
        estimativa_transporte_mzn: numOuNulo(cotacao.estimativa_transporte_mzn),
        cotacao_observacoes: cotacao.cotacao_observacoes || null,
      })
    );
  }

  async function emitirFacturaProduto() {
    setErro("");
    try {
      const factura = await api.post(`/api/pedidos/${id}/factura-produto`, { valor_total: null });
      // Abre logo o documento emitido (para imprimir / enviar ao cliente)
      navigate(`/facturas/${factura.id}`);
    } catch (e) {
      setErro(e.message);
    }
  }

  async function pagarFactura(facturaId) {
    await accao(() => api.post(`/api/facturas/${facturaId}/pagar`));
  }

  async function mudarEstado(estado) {
    await accao(() => api.post(`/api/pedidos/${id}/estado`, { estado }));
  }

  async function apagarPedido() {
    if (!confirm("Apagar (inactivar) este pedido? Deixa de aparecer na lista, mas o histórico é preservado e pode ser reposto.")) return;
    setErro("");
    try {
      await api.del(`/api/pedidos/${id}`);
      navigate("/pedidos");
    } catch (e) {
      setErro(e.message);
    }
  }

  async function reactivarPedido() {
    await accao(() => api.post(`/api/pedidos/${id}/reactivar`));
  }

  async function receberMedir(e) {
    e.preventDefault();
    setErro("");
    try {
      const enc = await api.post(`/api/pedidos/${id}/receber-medir`, {
        peso_kg: numOuNulo(medicao.peso_kg),
        comprimento_cm: numOuNulo(medicao.comprimento_cm),
        largura_cm: numOuNulo(medicao.largura_cm),
        altura_cm: numOuNulo(medicao.altura_cm),
        awb: medicao.awb || null,
        tracking_externo: medicao.tracking_externo || null,
        transportadora: medicao.transportadora || null,
        previsao_chegada: medicao.previsao_chegada || null,
      });
      navigate(`/encomendas/${enc.id}`);
    } catch (e2) {
      setErro(e2.message);
    }
  }

  if (erro && !pedido) return <p className="text-red-600">{erro}</p>;
  if (!pedido) return <p className="text-neutral-500">A carregar…</p>;

  const e = pedido.estado;
  const comCompra = pedido.tipo === "COM_COMPRA";
  const podeCancelar = !["EM_EXECUCAO", "CONCLUIDO", "CANCELADO"].includes(e);
  const facturaProduto = pedido.facturas?.find((f) => f.tipo === "PRODUTO" && f.estado !== "CANCELADA");
  const sugestaoTransporte = (Number(cotacao.peso_estimado_kg) || 0) * tarifa;

  // Campo de input genérico
  const campo = (estado, set, c, rotulo, tipo = "number") => (
    <div key={c}>
      <label className="block text-sm font-medium text-neutral-700 mb-1">{rotulo}</label>
      <input
        type={tipo}
        step="0.01"
        min={tipo === "number" ? "0" : undefined}
        value={estado[c]}
        onChange={(ev) => set({ ...estado, [c]: ev.target.value })}
        className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
      />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      <Link to="/pedidos" className="text-sm text-blue-600 hover:underline">← Voltar aos pedidos</Link>

      <div className="flex flex-wrap items-center gap-3 mt-3 mb-6">
        <h2 className="text-3xl font-bold tracking-tight text-neutral-900 font-mono">{pedido.codigo}</h2>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-md ${corPedido(e)}`}>{rotuloPedido(e)}</span>
        <span className="text-xs text-neutral-500 bg-neutral-100 px-2.5 py-1 rounded-md">{TIPOS_PEDIDO[pedido.tipo]}</span>
        {pedido.origem === "PORTAL" && (
          <span className="text-xs text-neutral-500 bg-neutral-100 px-2.5 py-1 rounded-md">Aberto pelo cliente</span>
        )}
      </div>

      {erro && <p className="text-sm text-red-600 mb-4">{erro}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          {/* Cliente + itens */}
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h3 className="font-semibold text-neutral-900 mb-3">Cliente & itens</h3>
            <div className="text-sm mb-4">
              <Link to={`/clientes/${pedido.cliente.id}`} className="font-medium text-blue-600 hover:underline">
                {pedido.cliente.nome}
              </Link>
              <span className="block text-xs text-neutral-400">{pedido.cliente.telefone}</span>
            </div>
            <ul className="space-y-2">
              {pedido.itens.map((it) => (
                <li key={it.id} className="text-sm border border-neutral-100 rounded-lg px-3 py-2">
                  <span className="font-medium text-neutral-900">{it.quantidade}× {it.descricao}</span>
                  {it.variacao && <span className="text-neutral-500"> · {it.variacao}</span>}
                  {it.link_produto && (
                    <a href={it.link_produto} target="_blank" rel="noreferrer" className="block text-xs text-blue-600 hover:underline truncate">
                      {it.link_produto}
                    </a>
                  )}
                </li>
              ))}
              {pedido.itens.length === 0 && <li className="text-sm text-neutral-500">Sem itens.</li>}
            </ul>
          </div>

          {/* Cotação */}
          {comCompra && (
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-neutral-900">Cotação</h3>
                {pedido.preco_produto_mzn != null && (
                  <Link to={`/pedidos/${pedido.id}/cotacao`} className="text-xs font-semibold text-blue-600 hover:underline">
                    Documento (PDF)
                  </Link>
                )}
              </div>
              <p className="text-xs text-neutral-400 mb-3">Valores em MZN, após o procurement. O transporte é só uma estimativa até à pesagem.</p>

              {["SOLICITACAO_RECEBIDA", "COTACAO_ENVIADA"].includes(e) ? (
                <form onSubmit={guardarCotacao} className="grid grid-cols-2 gap-3">
                  {campo(cotacao, setCotacao, "preco_produto_mzn", "Preço do produto")}
                  {campo(cotacao, setCotacao, "servico_compra_mzn", "Serviço de compra")}
                  {campo(cotacao, setCotacao, "peso_estimado_kg", "Peso estimado (kg)")}
                  {campo(cotacao, setCotacao, "estimativa_transporte_mzn", "Estimativa de transporte")}
                  {sugestaoTransporte > 0 && (
                    <button
                      type="button"
                      onClick={() => setCotacao({ ...cotacao, estimativa_transporte_mzn: sugestaoTransporte.toFixed(2) })}
                      className="col-span-2 text-left text-xs text-blue-600 hover:underline"
                    >
                      Sugestão de transporte: {mzn(sugestaoTransporte)} ({cotacao.peso_estimado_kg} kg × {mzn(tarifa)}/kg) — aplicar
                    </button>
                  )}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Observações</label>
                    <textarea
                      rows={2}
                      value={cotacao.cotacao_observacoes}
                      onChange={(ev) => setCotacao({ ...cotacao, cotacao_observacoes: ev.target.value })}
                      className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
                    />
                  </div>
                  <button type="submit" className="col-span-2 rounded-xl bg-neutral-900 text-white px-4 py-2 text-sm font-semibold hover:bg-neutral-700 transition active:scale-[0.98]">
                    {e === "SOLICITACAO_RECEBIDA" ? "Enviar cotação" : "Actualizar cotação"}
                  </button>
                </form>
              ) : (
                <dl className="text-sm space-y-2">
                  {[
                    ["Preço do produto", mzn(pedido.preco_produto_mzn)],
                    ["Serviço de compra", mzn(pedido.servico_compra_mzn)],
                    ["Estimativa de transporte", mzn(pedido.estimativa_transporte_mzn)],
                  ].map(([r, v]) => (
                    <div key={r} className="flex justify-between gap-4">
                      <dt className="text-neutral-500">{r}</dt><dd className="font-medium text-neutral-900">{v}</dd>
                    </div>
                  ))}
                </dl>
              )}

              <div className="mt-3 rounded-xl bg-neutral-50 border border-neutral-200 px-4 py-2 text-sm">
                <div className="flex justify-between"><span className="text-neutral-600">A pagar agora (produto + serviço)</span><strong>{mzn(pedido.total_pagar_agora_mzn)}</strong></div>
                <div className="flex justify-between"><span className="text-neutral-600">Total estimado (c/ transporte)</span><strong>{mzn(pedido.total_estimado_mzn)}</strong></div>
              </div>
            </div>
          )}

          {/* Facturas */}
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h3 className="font-semibold text-neutral-900 mb-3">Facturas</h3>
            {(pedido.facturas?.length ?? 0) === 0 && <p className="text-sm text-neutral-500">Sem facturas.</p>}
            <div className="space-y-2">
              {pedido.facturas?.map((f) => (
                <div key={f.id} className="flex items-center justify-between gap-2 text-sm border border-neutral-100 rounded-lg px-3 py-2">
                  <div>
                    <span className="font-mono font-semibold text-neutral-900">{f.numero}</span>
                    <span className="block text-xs text-neutral-400">{f.tipo === "PRODUTO" ? "Produto" : "Transporte"}</span>
                  </div>
                  <span>{mzn(f.valor_total)}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${CORES_FACTURA[f.estado]}`}>{f.estado}</span>
                    {f.estado === "PENDENTE" && (
                      <button onClick={() => pagarFactura(f.id)} className="text-xs font-semibold text-green-700 hover:underline">
                        Marcar paga
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Acções contextuais */}
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h3 className="font-semibold text-neutral-900 mb-3">Próximo passo</h3>

            {e === "COTACAO_ENVIADA" && (
              <button onClick={() => accao(() => api.post(`/api/pedidos/${id}/aprovar`))} className="w-full rounded-xl bg-indigo-600 text-white px-4 py-2 text-sm font-semibold hover:bg-indigo-500 transition active:scale-[0.98] mb-2">
                Aprovar cotação (em nome do cliente)
              </button>
            )}

            {e === "APROVADA" && !facturaProduto && (
              <button onClick={emitirFacturaProduto} className="w-full rounded-xl bg-neutral-900 text-white px-4 py-2 text-sm font-semibold hover:bg-neutral-700 transition active:scale-[0.98] mb-2">
                Emitir factura de produto ({mzn(pedido.total_pagar_agora_mzn)})
              </button>
            )}
            {e === "APROVADA" && facturaProduto && (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-2">
                Aguarda o pagamento da factura de produto ({facturaProduto.numero}). Marca-a como paga acima.
              </p>
            )}

            {e === "PRODUTO_PAGO" && (
              <button onClick={() => mudarEstado("PRODUTO_COMPRADO")} className="w-full rounded-xl bg-neutral-900 text-white px-4 py-2 text-sm font-semibold hover:bg-neutral-700 transition active:scale-[0.98] mb-2">
                Marcar produto como comprado
              </button>
            )}

            {["PRODUTO_COMPRADO", "AGUARDA_ARMAZEM_CHINA"].includes(e) && (
              <form onSubmit={receberMedir} className="space-y-3">
                <p className="text-sm text-neutral-600">Recepção no armazém da China — pesar e medir para gerar a encomenda:</p>
                <div className="grid grid-cols-2 gap-3">
                  {campo(medicao, setMedicao, "peso_kg", "Peso real (kg)")}
                  {campo(medicao, setMedicao, "comprimento_cm", "Comprimento (cm)")}
                  {campo(medicao, setMedicao, "largura_cm", "Largura (cm)")}
                  {campo(medicao, setMedicao, "altura_cm", "Altura (cm)")}
                  {campo(medicao, setMedicao, "transportadora", "Transportadora", "text")}
                  {campo(medicao, setMedicao, "awb", "AWB", "text")}
                </div>
                <button type="submit" className="w-full rounded-xl bg-green-600 text-white px-4 py-2 text-sm font-semibold hover:bg-green-500 transition active:scale-[0.98]">
                  Receber, medir e criar encomenda
                </button>
              </form>
            )}

            {pedido.encomenda && (
              <Link to={`/encomendas/${pedido.encomenda.id}`} className="block text-center rounded-xl bg-sky-600 text-white px-4 py-2 text-sm font-semibold hover:bg-sky-500 transition active:scale-[0.98]">
                Ver encomenda {pedido.encomenda.codigo_rastreio} ({rotuloEstado(pedido.encomenda.estado)})
              </Link>
            )}

            {e === "SOLICITACAO_RECEBIDA" && comCompra && (
              <p className="text-sm text-neutral-500">Preenche e envia a cotação ao lado.</p>
            )}
            {e === "CONCLUIDO" && <p className="text-sm text-green-700">Processo concluído. 🎉</p>}
            {e === "CANCELADO" && <p className="text-sm text-red-600">Pedido cancelado.</p>}

            {podeCancelar && (
              <button
                onClick={() => confirm("Cancelar este pedido?") && mudarEstado("CANCELADO")}
                className="w-full rounded-xl bg-neutral-100 text-neutral-700 px-4 py-2 text-xs font-semibold hover:bg-neutral-200 transition mt-3"
              >
                Cancelar pedido
              </button>
            )}

            {pedido.activo === false ? (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                  Pedido apagado (inactivo) — não aparece na lista de pedidos.
                </p>
                <button
                  onClick={reactivarPedido}
                  className="w-full rounded-xl bg-neutral-100 text-neutral-700 px-4 py-2 text-xs font-semibold hover:bg-neutral-200 transition"
                >
                  Repor pedido
                </button>
              </div>
            ) : (
              <button
                onClick={apagarPedido}
                className="w-full rounded-xl bg-red-50 text-red-700 px-4 py-2 text-xs font-semibold hover:bg-red-100 transition mt-2"
              >
                Apagar pedido (inactivar)
              </button>
            )}
          </div>

          <Anexos pedidoId={pedido.id} categoriasSugeridas={["FACTURA_FORNECEDOR", "FOTO_ARMAZEM"]} />
        </div>
      </div>
    </div>
  );
}
