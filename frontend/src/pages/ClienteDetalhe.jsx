import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../services/api";
import { rotuloEstado, corEstado, formatarData } from "../services/estados";

const CORES_FACTURA = {
  PENDENTE: "bg-amber-100 text-amber-700",
  PAGA: "bg-green-100 text-green-700",
  CANCELADA: "bg-neutral-100 text-neutral-500",
};

function mzn(valor) {
  return Number(valor).toLocaleString("pt-PT", { minimumFractionDigits: 2 }) + " MZN";
}

function Cartao({ titulo, valor, destaque }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <p className="text-xs text-neutral-500">{titulo}</p>
      <p className={`text-xl font-bold mt-1 ${destaque ?? "text-neutral-900"}`}>{valor}</p>
    </div>
  );
}

export default function ClienteDetalhe() {
  const { id } = useParams();
  const [detalhe, setDetalhe] = useState(null);
  const [editar, setEditar] = useState(false);
  const [form, setForm] = useState(null);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  function carregar() {
    api.get(`/api/clientes/${id}/detalhe`).then(setDetalhe).catch((e) => setErro(e.message));
  }

  useEffect(() => carregar(), [id]);

  function abrirEdicao() {
    const c = detalhe.cliente;
    setForm({
      nome: c.nome,
      telefone: c.telefone,
      email: c.email ?? "",
      nuit: c.nuit ?? "",
      endereco: c.endereco ?? "",
      senha: "",
    });
    setEditar(true);
    setMensagem("");
  }

  async function guardar(e) {
    e.preventDefault();
    setErro("");
    try {
      await api.put(`/api/clientes/${id}`, {
        nome: form.nome,
        telefone: form.telefone,
        email: form.email || null,
        nuit: form.nuit || null,
        endereco: form.endereco || null,
        senha: form.senha || null,
      });
      setEditar(false);
      setMensagem(form.senha ? "Dados guardados; senha do portal actualizada." : "Dados guardados.");
      carregar();
    } catch (erro) {
      setErro(erro.message);
    }
  }

  if (erro && !detalhe) return <p className="text-red-600">{erro}</p>;
  if (!detalhe) return <p className="text-neutral-500">A carregar…</p>;

  const { cliente, estatisticas, encomendas, facturas } = detalhe;

  return (
    <div className="max-w-5xl mx-auto">
      <Link to="/clientes" className="text-sm text-blue-600 hover:underline">← Voltar aos clientes</Link>

      <div className="flex items-start justify-between mt-3 mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-neutral-900">{cliente.nome}</h2>
          <p className="text-sm text-neutral-500 mt-1">
            Cliente desde {formatarData(cliente.criado_em)} ·{" "}
            <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${cliente.portal_activo ? "bg-green-100 text-green-700" : "bg-neutral-100 text-neutral-500"}`}>
              Portal {cliente.portal_activo ? "activo" : "inactivo"}
            </span>
          </p>
        </div>
        <button
          onClick={editar ? () => setEditar(false) : abrirEdicao}
          className="rounded-xl bg-neutral-900 text-white px-4 py-2 text-sm font-semibold hover:bg-neutral-700 transition active:scale-[0.98]"
        >
          {editar ? "Cancelar" : "Editar cliente"}
        </button>
      </div>

      {mensagem && <p className="text-green-700 text-sm mb-4 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{mensagem}</p>}
      {erro && <p className="text-red-600 text-sm mb-4">{erro}</p>}

      {editar && (
        <form onSubmit={guardar} className="bg-white rounded-2xl shadow-sm p-5 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            ["nome", "Nome *", true],
            ["telefone", "Telefone *", true],
            ["email", "Email", false],
            ["nuit", "NUIT", false],
            ["endereco", "Endereço", false],
            ["senha", "Nova senha do portal (deixar vazio para manter)", false],
          ].map(([campo, rotulo, obrigatorio]) => (
            <div key={campo}>
              <label className="block text-sm font-medium text-neutral-700 mb-1">{rotulo}</label>
              <input
                required={obrigatorio}
                value={form[campo]}
                onChange={(e) => setForm({ ...form, [campo]: e.target.value })}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
              />
            </div>
          ))}
          <div className="flex items-end">
            <button type="submit" className="rounded-xl bg-green-600 text-white px-5 py-2 text-sm font-semibold hover:bg-green-500 transition active:scale-[0.98]">
              Guardar alterações
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Cartao titulo="Importações" valor={estatisticas.total_encomendas} />
        <Cartao titulo="Em curso" valor={estatisticas.activas} destaque="text-blue-600" />
        <Cartao titulo="Entregues" valor={estatisticas.entregues} destaque="text-green-600" />
        <Cartao titulo="Peso total importado" valor={`${estatisticas.peso_total_kg} kg`} />
        <Cartao titulo="Total facturado" valor={mzn(estatisticas.total_facturado)} />
        <Cartao titulo="Total pago" valor={mzn(estatisticas.total_pago)} destaque="text-green-600" />
        <Cartao titulo="Por pagar" valor={mzn(estatisticas.total_pendente)} destaque="text-amber-600" />
        <Cartao titulo="Atrasadas" valor={estatisticas.atrasadas} destaque="text-red-600" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-5 mb-6">
        <h3 className="font-semibold text-neutral-900 mb-3">Contactos</h3>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
          {[
            ["Telefone", cliente.telefone],
            ["Email", cliente.email ?? "—"],
            ["NUIT", cliente.nuit ?? "—"],
            ["Endereço", cliente.endereco ?? "—"],
          ].map(([rotulo, valor]) => (
            <div key={rotulo} className="flex justify-between gap-4">
              <dt className="text-neutral-500">{rotulo}</dt>
              <dd className="text-neutral-900 font-medium text-right">{valor}</dd>
            </div>
          ))}
        </dl>
      </div>

      <h3 className="text-lg font-semibold text-neutral-900 mb-3">Importações deste cliente</h3>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead className="text-neutral-400 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Código</th>
              <th className="px-4 py-3 font-medium">Descrição</th>
              <th className="px-4 py-3 font-medium">Peso</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Registo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {encomendas.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-neutral-500">Este cliente ainda não tem importações.</td></tr>
            )}
            {encomendas.map((enc) => (
              <tr key={enc.id} className="hover:bg-neutral-50">
                <td className="px-4 py-3">
                  <Link to={`/encomendas/${enc.id}`} className="font-mono font-semibold text-blue-600 hover:underline">
                    {enc.codigo_rastreio}
                  </Link>
                </td>
                <td className="px-4 py-3 max-w-xs truncate">{enc.descricao}</td>
                <td className="px-4 py-3">{enc.peso_kg ? `${enc.peso_kg} kg` : "—"}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-md ${corEstado(enc.estado)}`}>
                    {rotuloEstado(enc.estado)}
                  </span>
                </td>
                <td className="px-4 py-3 text-neutral-500">{formatarData(enc.data_registo)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="text-lg font-semibold text-neutral-900 mb-3">Facturas deste cliente</h3>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-neutral-400 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Número</th>
              <th className="px-4 py-3 font-medium">Referência</th>
              <th className="px-4 py-3 font-medium">Valor</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Emitida em</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {facturas.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-neutral-500">Sem facturas.</td></tr>
            )}
            {facturas.map((f) => (
              <tr key={f.id} className="hover:bg-neutral-50">
                <td className="px-4 py-3">
                  <Link to={`/facturas/${f.id}`} className="font-mono font-semibold text-blue-600 hover:underline">
                    {f.numero}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <Link
                    to={f.encomenda_id ? `/encomendas/${f.encomenda_id}` : `/pedidos/${f.pedido_id}`}
                    className="font-mono text-blue-600 hover:underline"
                  >
                    {f.codigo_rastreio}
                  </Link>
                  <span className="ml-2 text-xs text-neutral-400">{f.tipo === "PRODUTO" ? "Produto" : "Transporte"}</span>
                </td>
                <td className="px-4 py-3">{mzn(f.valor_total)}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-md ${CORES_FACTURA[f.estado]}`}>
                    {f.estado}
                  </span>
                </td>
                <td className="px-4 py-3 text-neutral-500">{formatarData(f.data_emissao)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
