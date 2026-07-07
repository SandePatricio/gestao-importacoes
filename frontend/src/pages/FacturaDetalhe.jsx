import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../services/api";
import Anexos from "../components/Anexos";
import FacturaDocumento from "../components/FacturaDocumento";

export default function FacturaDetalhe() {
  const { id } = useParams();
  const [factura, setFactura] = useState(null);
  const [empresa, setEmpresa] = useState(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    api.get(`/api/facturas/${id}`).then(setFactura).catch((e) => setErro(e.message));
    api.get("/api/configuracao/frete").then(setEmpresa).catch(() => {});
  }, [id]);

  async function marcarPaga() {
    setErro("");
    try {
      await api.post(`/api/facturas/${id}/pagar`);
      const actualizada = await api.get(`/api/facturas/${id}`);
      setFactura(actualizada);
    } catch (erro) {
      setErro(erro.message);
    }
  }

  if (erro && !factura) return <p className="text-red-600">{erro}</p>;
  if (!factura) return <p className="text-neutral-500">A carregar…</p>;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6 print:hidden">
        <Link to="/facturas" className="text-sm text-blue-600 hover:underline">← Voltar às facturas</Link>
        <div className="space-x-3">
          {factura.estado === "PENDENTE" && (
            <button
              onClick={marcarPaga}
              className="rounded-xl bg-green-600 text-white px-4 py-2 text-sm font-semibold hover:bg-green-500 transition active:scale-[0.98]"
            >
              Marcar como paga
            </button>
          )}
          <button
            onClick={() => window.print()}
            className="rounded-xl bg-neutral-900 text-white px-4 py-2 text-sm font-semibold hover:bg-neutral-700 transition active:scale-[0.98]"
          >
            Imprimir / PDF
          </button>
        </div>
      </div>
      {erro && <p className="text-red-600 text-sm mb-4 print:hidden">{erro}</p>}

      <FacturaDocumento factura={factura} empresa={empresa} />

      <div className="mt-6 print:hidden">
        <Anexos facturaId={factura.id} categoriasSugeridas={["COMPROVATIVO_PAGAMENTO"]} />
        {factura.estado === "PENDENTE" && (
          <p className="text-xs text-neutral-400 mt-2">
            Confirme o comprovativo enviado pelo cliente e depois clique em “Marcar como paga”.
          </p>
        )}
      </div>
    </div>
  );
}
