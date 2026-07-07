import { useEffect, useRef, useState } from "react";
import { api } from "../services/api";
import { CATEGORIAS_ANEXO, formatarData } from "../services/estados";

// Painel de anexos (gestão): lista, carrega, descarrega e remove documentos
// de um pedido / encomenda / factura. Indicar exactamente um dos *Id.
export default function Anexos({ pedidoId, encomendaId, facturaId, categoriasSugeridas }) {
  const [anexos, setAnexos] = useState([]);
  const [categoria, setCategoria] = useState(categoriasSugeridas?.[0] ?? "OUTRO");
  const [visivel, setVisivel] = useState(true);
  const [erro, setErro] = useState("");
  const [aEnviar, setAEnviar] = useState(false);
  const inputRef = useRef(null);

  const alvo = pedidoId
    ? `pedido_id=${pedidoId}`
    : encomendaId
    ? `encomenda_id=${encomendaId}`
    : `factura_id=${facturaId}`;

  function carregar() {
    api.get(`/api/anexos?${alvo}`).then(setAnexos).catch((e) => setErro(e.message));
  }

  useEffect(() => carregar(), [pedidoId, encomendaId, facturaId]);

  async function enviar(ficheiro) {
    if (!ficheiro) return;
    setErro("");
    setAEnviar(true);
    try {
      const fd = new FormData();
      fd.append("ficheiro", ficheiro);
      fd.append("categoria", categoria);
      fd.append("visivel_cliente", visivel);
      if (pedidoId) fd.append("pedido_id", pedidoId);
      if (encomendaId) fd.append("encomenda_id", encomendaId);
      if (facturaId) fd.append("factura_id", facturaId);
      await api.postForm("/api/anexos", fd);
      if (inputRef.current) inputRef.current.value = "";
      carregar();
    } catch (e) {
      setErro(e.message);
    } finally {
      setAEnviar(false);
    }
  }

  async function descarregar(anexo) {
    const r = await fetch(`/api/anexos/${anexo.id}/download`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = anexo.nome_original;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function remover(anexo) {
    if (!confirm(`Remover "${anexo.nome_original}"?`)) return;
    try {
      await api.del(`/api/anexos/${anexo.id}`);
      carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <h3 className="font-semibold text-neutral-900 mb-3">Documentos & fotos</h3>

      <div className="space-y-2 mb-4">
        {anexos.length === 0 && <p className="text-sm text-neutral-500">Sem documentos.</p>}
        {anexos.map((a) => (
          <div key={a.id} className="flex items-center justify-between gap-3 text-sm border border-neutral-100 rounded-lg px-3 py-2">
            <div className="min-w-0">
              <button onClick={() => descarregar(a)} className="font-medium text-blue-600 hover:underline truncate block max-w-[16rem] text-left">
                {a.nome_original}
              </button>
              <p className="text-xs text-neutral-400">
                {CATEGORIAS_ANEXO[a.categoria] ?? a.categoria} · {formatarData(a.criado_em)}
                {!a.visivel_cliente && " · oculto ao cliente"}
              </p>
            </div>
            <button onClick={() => remover(a)} className="text-xs text-red-500 hover:text-red-700 shrink-0">
              Remover
            </button>
          </div>
        ))}
      </div>

      <div className="border-t border-neutral-100 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          className="rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
        >
          {Object.entries(CATEGORIAS_ANEXO).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input type="checkbox" checked={visivel} onChange={(e) => setVisivel(e.target.checked)} />
          Visível ao cliente
        </label>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/png,image/jpeg,image/webp"
          disabled={aEnviar}
          onChange={(e) => enviar(e.target.files?.[0])}
          className="sm:col-span-2 text-sm text-neutral-600 file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-900 file:text-white file:px-3 file:py-1.5 file:text-sm file:font-semibold file:cursor-pointer disabled:opacity-50"
        />
      </div>
      {aEnviar && <p className="text-xs text-neutral-400 mt-2">A carregar…</p>}
      {erro && <p className="text-sm text-red-600 mt-2">{erro}</p>}
      <p className="text-xs text-neutral-400 mt-2">PDF, JPG, PNG ou WEBP até 10 MB.</p>
    </div>
  );
}
