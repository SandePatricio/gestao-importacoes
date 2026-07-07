import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../services/api";
import CotacaoDocumento from "../components/CotacaoDocumento";

export default function CotacaoPedido() {
  const { id } = useParams();
  const [pedido, setPedido] = useState(null);
  const [empresa, setEmpresa] = useState(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    api.get(`/api/pedidos/${id}`).then(setPedido).catch((e) => setErro(e.message));
    api.get("/api/configuracao/frete").then(setEmpresa).catch(() => {});
  }, [id]);

  if (erro && !pedido) return <p className="text-red-600">{erro}</p>;
  if (!pedido) return <p className="text-neutral-500">A carregar…</p>;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6 print:hidden">
        <Link to={`/pedidos/${id}`} className="text-sm text-blue-600 hover:underline">← Voltar ao pedido</Link>
        <button
          onClick={() => window.print()}
          className="rounded-xl bg-neutral-900 text-white px-4 py-2 text-sm font-semibold hover:bg-neutral-700 transition active:scale-[0.98]"
        >
          Imprimir / PDF
        </button>
      </div>
      <CotacaoDocumento pedido={pedido} empresa={empresa} />
    </div>
  );
}
