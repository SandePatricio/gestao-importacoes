import { useEffect, useState } from "react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

const FORM_VAZIO = { nome: "", email: "", senha: "", perfil: "OPERADOR", activo: true };

export default function Utilizadores() {
  const { utilizador: sessao } = useAuth();
  const [utilizadores, setUtilizadores] = useState([]);
  const [form, setForm] = useState(FORM_VAZIO);
  const [emEdicao, setEmEdicao] = useState(null); // id do utilizador em edição
  const [mostrarForm, setMostrarForm] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  function carregar() {
    api.get("/api/auth/utilizadores").then(setUtilizadores).catch((e) => setErro(e.message));
  }

  useEffect(() => carregar(), []);

  function novo() {
    setForm(FORM_VAZIO);
    setEmEdicao(null);
    setMostrarForm(true);
    setMensagem("");
    setErro("");
  }

  function editar(u) {
    setForm({ nome: u.nome, email: u.email, senha: "", perfil: u.perfil, activo: u.activo });
    setEmEdicao(u.id);
    setMostrarForm(true);
    setMensagem("");
    setErro("");
  }

  async function guardar(e) {
    e.preventDefault();
    setErro("");
    try {
      if (emEdicao) {
        await api.put(`/api/auth/utilizadores/${emEdicao}`, {
          ...form,
          senha: form.senha || null,
        });
        setMensagem(form.senha ? "Utilizador actualizado; senha reposta." : "Utilizador actualizado.");
      } else {
        await api.post("/api/auth/utilizadores", form);
        setMensagem("Utilizador criado.");
      }
      setMostrarForm(false);
      carregar();
    } catch (erro) {
      setErro(erro.message);
    }
  }

  async function alternarActivo(u) {
    setErro("");
    setMensagem("");
    try {
      await api.put(`/api/auth/utilizadores/${u.id}`, {
        nome: u.nome,
        email: u.email,
        perfil: u.perfil,
        activo: !u.activo,
        senha: null,
      });
      carregar();
    } catch (erro) {
      setErro(erro.message);
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold tracking-tight text-neutral-900">Utilizadores</h2>
        <button
          onClick={mostrarForm ? () => setMostrarForm(false) : novo}
          className="rounded-xl bg-neutral-900 text-white px-4 py-2 text-sm font-semibold hover:bg-neutral-700 transition active:scale-[0.98]"
        >
          {mostrarForm ? "Cancelar" : "+ Novo utilizador"}
        </button>
      </div>

      {mensagem && (
        <p className="text-green-700 text-sm mb-4 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{mensagem}</p>
      )}
      {erro && <p className="text-red-600 text-sm mb-4">{erro}</p>}

      {mostrarForm && (
        <form onSubmit={guardar} className="bg-white rounded-2xl shadow-sm p-5 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Nome *</label>
            <input
              required
              minLength={2}
              title="Pelo menos 2 caracteres, com letras."
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Email *</label>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              {emEdicao ? "Nova senha (vazio para manter)" : "Senha *"}
            </label>
            <input
              required={!emEdicao}
              type="password"
              minLength={6}
              title="Mínimo 6 caracteres."
              value={form.senha}
              onChange={(e) => setForm({ ...form, senha: e.target.value })}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Perfil *</label>
            <select
              value={form.perfil}
              onChange={(e) => setForm({ ...form, perfil: e.target.value })}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
            >
              <option value="OPERADOR">Operador</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </div>
          <div className="flex items-end">
            <button type="submit" className="rounded-xl bg-green-600 text-white px-5 py-2 text-sm font-semibold hover:bg-green-500 transition active:scale-[0.98]">
              {emEdicao ? "Guardar alterações" : "Criar utilizador"}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-neutral-400 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Perfil</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {utilizadores.map((u) => (
              <tr key={u.id} className="hover:bg-neutral-50">
                <td className="px-4 py-3 font-medium text-neutral-900">
                  {u.nome}
                  {u.id === sessao?.id && <span className="text-xs text-neutral-400"> (você)</span>}
                </td>
                <td className="px-4 py-3">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-md ${u.perfil === "ADMIN" ? "bg-violet-100 text-violet-700" : "bg-blue-100 text-blue-700"}`}>
                    {u.perfil}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-md ${u.activo ? "bg-green-100 text-green-700" : "bg-neutral-100 text-neutral-500"}`}>
                    {u.activo ? "Activo" : "Desactivado"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right space-x-3 whitespace-nowrap">
                  <button onClick={() => editar(u)} className="text-xs font-semibold text-blue-600 hover:underline">
                    Editar
                  </button>
                  {u.id !== sessao?.id && (
                    <button
                      onClick={() => alternarActivo(u)}
                      className={`text-xs font-semibold hover:underline ${u.activo ? "text-red-600" : "text-green-700"}`}
                    >
                      {u.activo ? "Desactivar" : "Activar"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
