import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [aCarregar, setACarregar] = useState(false);

  async function submeter(e) {
    e.preventDefault();
    setErro("");
    setACarregar(true);
    try {
      await login(email, senha);
      navigate("/dashboard");
    } catch (erro) {
      setErro(erro.message);
    } finally {
      setACarregar(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#ececec] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8 text-neutral-900">
          <h1 className="text-2xl font-bold">Connex Importações</h1>
          <p className="text-neutral-400 text-sm mt-1">Sistema de Gestão de Encomendas Aéreas</p>
        </div>
        <form onSubmit={submeter} className="bg-white rounded-2xl shadow-xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Senha</label>
            <input
              type="password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
            />
          </div>
          {erro && <p className="text-sm text-red-600">{erro}</p>}
          <button
            type="submit"
            disabled={aCarregar}
            className="w-full rounded-xl bg-neutral-900 text-white py-2.5 text-sm font-semibold hover:bg-neutral-700 transition active:scale-[0.98] disabled:opacity-50"
          >
            {aCarregar ? "A entrar…" : "Entrar"}
          </button>
        </form>
        <p className="text-center mt-6 space-x-4">
          <Link to="/portal" className="text-neutral-400 text-sm hover:text-neutral-900 underline">
            Portal do cliente
          </Link>
          <Link to="/rastrear" className="text-neutral-400 text-sm hover:text-neutral-900 underline">
            Rastrear encomenda
          </Link>
        </p>
      </div>
    </div>
  );
}
