import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";

const FORM_VAZIO = { nome: "", telefone: "", email: "", nuit: "", endereco: "", senha: "" };

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [pesquisa, setPesquisa] = useState("");
  const [form, setForm] = useState(FORM_VAZIO);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [erro, setErro] = useState("");

  function carregar(termo = "") {
    const url = termo ? `/api/clientes?pesquisa=${encodeURIComponent(termo)}` : "/api/clientes";
    api.get(url).then(setClientes).catch((e) => setErro(e.message));
  }

  useEffect(() => carregar(), []);

  async function guardar(e) {
    e.preventDefault();
    setErro("");
    try {
      await api.post("/api/clientes", {
        ...form,
        email: form.email || null,
        nuit: form.nuit || null,
        endereco: form.endereco || null,
        senha: form.senha || null,
      });
      setForm(FORM_VAZIO);
      setMostrarForm(false);
      carregar(pesquisa);
    } catch (erro) {
      setErro(erro.message);
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold tracking-tight text-neutral-900">Clientes</h2>
        <button
          onClick={() => setMostrarForm(!mostrarForm)}
          className="rounded-xl bg-neutral-900 text-white px-4 py-2 text-sm font-semibold hover:bg-neutral-700 transition active:scale-[0.98]"
        >
          {mostrarForm ? "Cancelar" : "+ Novo cliente"}
        </button>
      </div>

      {mostrarForm && (
        <form onSubmit={guardar} className="bg-white rounded-2xl shadow-sm p-5 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { campo: "nome", rotulo: "Nome *", required: true, minLength: 2, title: "Pelo menos 2 caracteres, com letras." },
            { campo: "telefone", rotulo: "Telefone *", required: true, inputMode: "tel", pattern: "\\+?[0-9 -]{7,}", title: "7 a 15 dígitos (ex.: +258841234567)." },
            { campo: "email", rotulo: "Email", type: "email" },
            { campo: "nuit", rotulo: "NUIT (9 dígitos)", inputMode: "numeric", pattern: "[0-9]{9}", maxLength: 9, title: "O NUIT tem 9 dígitos." },
            { campo: "endereco", rotulo: "Endereço" },
            { campo: "senha", rotulo: "Senha do portal (opcional, mín. 6)", type: "password", minLength: 6 },
          ].map(({ campo, rotulo, required, type, inputMode, pattern, maxLength, minLength, title }) => (
            <div key={campo}>
              <label className="block text-sm font-medium text-neutral-700 mb-1">{rotulo}</label>
              <input
                required={required}
                type={type ?? "text"}
                inputMode={inputMode}
                pattern={pattern}
                maxLength={maxLength}
                minLength={minLength}
                title={title}
                value={form[campo]}
                onChange={(e) => setForm({ ...form, [campo]: e.target.value })}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
              />
            </div>
          ))}
          <div className="flex items-end">
            <button type="submit" className="rounded-xl bg-green-600 text-white px-5 py-2 text-sm font-semibold hover:bg-green-500 transition active:scale-[0.98]">
              Guardar
            </button>
          </div>
        </form>
      )}

      {erro && <p className="text-red-600 text-sm mb-4">{erro}</p>}

      <input
        placeholder="Pesquisar por nome ou telefone…"
        value={pesquisa}
        onChange={(e) => {
          setPesquisa(e.target.value);
          carregar(e.target.value);
        }}
        className="w-full max-w-sm rounded-xl border border-neutral-200 px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-neutral-400"
      />

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-neutral-400 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Telefone</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">NUIT</th>
              <th className="px-4 py-3 font-medium">Portal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {clientes.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-neutral-500">Sem clientes registados.</td></tr>
            )}
            {clientes.map((c) => (
              <tr key={c.id} className="hover:bg-neutral-50">
                <td className="px-4 py-3">
                  <Link to={`/clientes/${c.id}`} className="font-medium text-blue-600 hover:underline">
                    {c.nome}
                  </Link>
                </td>
                <td className="px-4 py-3">{c.telefone}</td>
                <td className="px-4 py-3">{c.email ?? "—"}</td>
                <td className="px-4 py-3">{c.nuit ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-md ${c.portal_activo ? "bg-green-100 text-green-700" : "bg-neutral-100 text-neutral-500"}`}>
                    {c.portal_activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
