import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import { ESTADOS_PEDIDO, TIPOS_PEDIDO, rotuloPedido, corPedido, mzn, formatarData } from "../services/estados";

const ITEM_VAZIO = { descricao: "", quantidade: 1, variacao: "", link_produto: "", observacoes: "" };
const FORM_VAZIO = {
  cliente_id: "",
  tipo: "COM_COMPRA",
  tracking_externo: "",
  transportadora: "",
  previsao_chegada_china: "",
  itens: [{ ...ITEM_VAZIO }],
};

export default function Pedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [form, setForm] = useState(FORM_VAZIO);
  const [fotos, setFotos] = useState([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [aBuscar, setABuscar] = useState(null);   // índice do item em scraping
  const [previews, setPreviews] = useState({});   // índice → info do link
  const [erro, setErro] = useState("");

  function carregar(estado = "") {
    const url = estado ? `/api/pedidos?estado=${estado}` : "/api/pedidos";
    api.get(url).then(setPedidos).catch((e) => setErro(e.message));
  }

  useEffect(() => {
    carregar();
    api.get("/api/clientes").then(setClientes).catch(() => {});
  }, []);

  function actualizarItem(i, campo, valor) {
    const itens = form.itens.map((it, idx) => (idx === i ? { ...it, [campo]: valor } : it));
    setForm({ ...form, itens });
  }

  async function buscarInfo(i) {
    const link = form.itens[i].link_produto?.trim();
    if (!link) return;
    setErro("");
    setABuscar(i);
    try {
      const info = await api.get(`/api/ferramentas/scraping?url=${encodeURIComponent(link)}`);
      setPreviews((p) => ({ ...p, [i]: info }));
      // Preenche a descrição se ainda estiver vazia
      if (info.titulo && !form.itens[i].descricao.trim()) actualizarItem(i, "descricao", info.titulo);
      if (!info.titulo && !info.imagem && !info.preco) {
        setErro("Não foi possível extrair informação deste link.");
      }
    } catch (e) {
      setErro(e.message);
    } finally {
      setABuscar(null);
    }
  }

  async function guardar(e) {
    e.preventDefault();
    setErro("");
    try {
      const pedido = await api.post("/api/pedidos", {
        cliente_id: Number(form.cliente_id),
        tipo: form.tipo,
        tracking_externo: form.tracking_externo || null,
        transportadora: form.transportadora || null,
        previsao_chegada_china: form.previsao_chegada_china || null,
        itens: form.itens
          .filter((it) => it.descricao.trim())
          .map((it) => ({
            descricao: it.descricao,
            quantidade: Number(it.quantidade) || 1,
            variacao: it.variacao || null,
            link_produto: it.link_produto || null,
            observacoes: it.observacoes || null,
          })),
      });
      // Anexa as fotos ao pedido recém-criado
      for (const f of fotos) {
        const fd = new FormData();
        fd.append("ficheiro", f);
        fd.append("categoria", "FOTO_PRODUTO");
        fd.append("pedido_id", pedido.id);
        fd.append("visivel_cliente", true);
        await api.postForm("/api/anexos", fd);
      }
      setForm(FORM_VAZIO);
      setFotos([]);
      setMostrarForm(false);
      carregar(filtroEstado);
    } catch (erro) {
      setErro(erro.message);
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold tracking-tight text-neutral-900">Pedidos de importação</h2>
        <button
          onClick={() => setMostrarForm(!mostrarForm)}
          className="rounded-xl bg-neutral-900 text-white px-4 py-2 text-sm font-semibold hover:bg-neutral-700 transition active:scale-[0.98]"
        >
          {mostrarForm ? "Cancelar" : "+ Novo pedido"}
        </button>
      </div>

      {mostrarForm && (
        <form onSubmit={guardar} className="bg-white rounded-2xl shadow-sm p-5 mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <label className="block text-sm font-medium text-neutral-700 mb-1">Tipo de pedido *</label>
              <select
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
              >
                {Object.entries(TIPOS_PEDIDO).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          {form.tipo === "ENVIO_DIRECTO" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                ["transportadora", "Transportadora", "text"],
                ["tracking_externo", "Nº de rastreio (envio do cliente)", "text"],
                ["previsao_chegada_china", "Previsão de chegada à China", "date"],
              ].map(([campo, rotulo, tipo]) => (
                <div key={campo}>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">{rotulo}</label>
                  <input
                    type={tipo}
                    value={form[campo]}
                    onChange={(e) => setForm({ ...form, [campo]: e.target.value })}
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
                  />
                </div>
              ))}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">Itens do pedido</label>
            <div className="space-y-3">
              {form.itens.map((it, i) => (
                <div key={i} className="border border-neutral-100 rounded-xl p-3 space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start">
                    <input
                      placeholder="Descrição do produto *"
                      value={it.descricao}
                      onChange={(e) => actualizarItem(i, "descricao", e.target.value)}
                      className="md:col-span-5 rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
                    />
                    <input
                      type="number"
                      min="1"
                      placeholder="Qtd."
                      value={it.quantidade}
                      onChange={(e) => actualizarItem(i, "quantidade", e.target.value)}
                      className="md:col-span-1 rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
                    />
                    <input
                      placeholder="Modelo/tamanho/cor"
                      value={it.variacao}
                      onChange={(e) => actualizarItem(i, "variacao", e.target.value)}
                      className="md:col-span-3 rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
                    />
                    <input
                      type="url"
                      placeholder="Link (opcional)"
                      value={it.link_produto}
                      onChange={(e) => actualizarItem(i, "link_produto", e.target.value)}
                      className="md:col-span-2 rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
                    />
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, itens: form.itens.filter((_, idx) => idx !== i) })}
                      disabled={form.itens.length === 1}
                      className="md:col-span-1 text-sm text-red-500 hover:text-red-700 disabled:opacity-30 py-2"
                    >
                      ✕
                    </button>
                  </div>

                  {it.link_produto?.trim() && (
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => buscarInfo(i)}
                        disabled={aBuscar === i}
                        className="text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 px-3 py-1.5 hover:bg-blue-100 transition disabled:opacity-50"
                      >
                        {aBuscar === i ? "A buscar…" : "Buscar info do link"}
                      </button>
                      {previews[i]?.imagem && (
                        <img src={previews[i].imagem} alt="" className="h-12 w-12 object-cover rounded-lg border border-neutral-200" />
                      )}
                      {previews[i]?.preco && (
                        <span className="text-xs text-neutral-500">
                          Preço detectado: {previews[i].preco} {previews[i].moeda || ""}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setForm({ ...form, itens: [...form.itens, { ...ITEM_VAZIO }] })}
              className="text-sm text-blue-600 hover:underline mt-2"
            >
              + Adicionar item
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Fotos do produto (opcional)</label>
            <input
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp,application/pdf"
              onChange={(e) => setFotos(Array.from(e.target.files || []))}
              className="text-sm text-neutral-600 file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-900 file:text-white file:px-3 file:py-1.5 file:text-sm file:font-semibold file:cursor-pointer"
            />
            {fotos.length > 0 && <p className="text-xs text-neutral-400 mt-1">{fotos.length} ficheiro(s) seleccionado(s).</p>}
          </div>

          {erro && <p className="text-sm text-red-600">{erro}</p>}
          <button type="submit" className="rounded-xl bg-green-600 text-white px-5 py-2 text-sm font-semibold hover:bg-green-500 transition active:scale-[0.98]">
            Criar pedido
          </button>
        </form>
      )}

      {erro && !mostrarForm && <p className="text-red-600 text-sm mb-4">{erro}</p>}

      <select
        value={filtroEstado}
        onChange={(e) => { setFiltroEstado(e.target.value); carregar(e.target.value); }}
        className="rounded-xl border border-neutral-200 px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-neutral-400"
      >
        <option value="">Todos os estados</option>
        {Object.keys(ESTADOS_PEDIDO).map((e) => (
          <option key={e} value={e}>{rotuloPedido(e)}</option>
        ))}
      </select>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-neutral-400 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Código</th>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Total estimado</th>
              <th className="px-4 py-3 font-medium">Criado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {pedidos.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-neutral-500">Sem pedidos.</td></tr>
            )}
            {pedidos.map((p) => (
              <tr key={p.id} className="hover:bg-neutral-50">
                <td className="px-4 py-3">
                  <Link to={`/pedidos/${p.id}`} className="font-mono font-semibold text-blue-600 hover:underline">
                    {p.codigo}
                  </Link>
                </td>
                <td className="px-4 py-3">{p.cliente.nome}</td>
                <td className="px-4 py-3 text-neutral-600">{TIPOS_PEDIDO[p.tipo] ?? p.tipo}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-md ${corPedido(p.estado)}`}>
                    {rotuloPedido(p.estado)}
                  </span>
                </td>
                <td className="px-4 py-3 text-neutral-600">{mzn(p.total_estimado_mzn)}</td>
                <td className="px-4 py-3 text-neutral-500">{formatarData(p.criado_em)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
