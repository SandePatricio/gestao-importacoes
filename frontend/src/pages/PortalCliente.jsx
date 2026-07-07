import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import CotacaoDocumento from "../components/CotacaoDocumento";
import FacturaDocumento from "../components/FacturaDocumento";
import { rotuloEstado, corEstado, formatarData, rotuloPedido, corPedido, mzn, TIPOS_PEDIDO, CATEGORIAS_ANEXO } from "../services/estados";

// Sessão do portal separada da sessão dos funcionários (sessionStorage),
// para que um operador possa testar o portal sem perder a sua sessão.
function tokenPortal() {
  return sessionStorage.getItem("token_portal");
}

async function pedirPortal(url, opcoes = {}) {
  const resposta = await fetch(url, {
    ...opcoes,
    headers: {
      "Content-Type": "application/json",
      ...(tokenPortal() ? { Authorization: `Bearer ${tokenPortal()}` } : {}),
    },
  });
  const dados = await resposta.json().catch(() => null);
  if (!resposta.ok) throw new Error(dados?.detail || "Ocorreu um erro inesperado");
  return dados;
}

// Upload (multipart): sem Content-Type, para o browser definir o boundary.
async function enviarPortalForm(url, formData) {
  const resposta = await fetch(url, {
    method: "POST",
    headers: tokenPortal() ? { Authorization: `Bearer ${tokenPortal()}` } : {},
    body: formData,
  });
  const dados = await resposta.json().catch(() => null);
  if (!resposta.ok) throw new Error(dados?.detail || "Ocorreu um erro inesperado");
  return dados;
}

async function descarregarPortal(anexo) {
  const r = await fetch(`/api/portal/anexos/${anexo.id}/download`, {
    headers: { Authorization: `Bearer ${tokenPortal()}` },
  });
  if (!r.ok) return;
  const blob = await r.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = anexo.nome_original;
  a.click();
  URL.revokeObjectURL(url);
}

const ITEM_VAZIO = { descricao: "", quantidade: 1, variacao: "", link_produto: "" };

const CORES_FACTURA = {
  PENDENTE: "bg-amber-100 text-amber-700",
  PAGA: "bg-green-100 text-green-700",
  CANCELADA: "bg-neutral-100 text-neutral-500",
};

export default function PortalCliente() {
  const [cliente, setCliente] = useState(() => {
    const guardado = sessionStorage.getItem("cliente_portal");
    return guardado ? JSON.parse(guardado) : null;
  });
  const [telefone, setTelefone] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [modoRegisto, setModoRegisto] = useState(false);
  const [encomendas, setEncomendas] = useState([]);
  const [facturas, setFacturas] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [pedidoAberto, setPedidoAberto] = useState(null);
  const [detalhePedido, setDetalhePedido] = useState(null);
  const [novoPedido, setNovoPedido] = useState({ tipo: "COM_COMPRA", itens: [{ ...ITEM_VAZIO }] });
  const [novoPedidoFotos, setNovoPedidoFotos] = useState([]);
  const [aBuscarItem, setABuscarItem] = useState(null);
  const [previewsItem, setPreviewsItem] = useState({});
  const [mostrarNovo, setMostrarNovo] = useState(false);
  const [empresa, setEmpresa] = useState(null);
  const [cotacaoDoc, setCotacaoDoc] = useState(null);
  const [facturaDoc, setFacturaDoc] = useState(null);
  const [expandida, setExpandida] = useState(null);
  const [erro, setErro] = useState("");
  const [aCarregar, setACarregar] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [senhaActual, setSenhaActual] = useState("");
  const [senhaNova, setSenhaNova] = useState("");
  const [msgSenha, setMsgSenha] = useState(null); // {tipo: 'ok'|'erro', texto}

  async function carregarDados() {
    const [encs, fts, peds] = await Promise.all([
      pedirPortal("/api/portal/encomendas"),
      pedirPortal("/api/portal/facturas"),
      pedirPortal("/api/portal/pedidos"),
    ]);
    setEncomendas(encs);
    setFacturas(fts);
    setPedidos(peds);
    pedirPortal("/api/portal/empresa").then(setEmpresa).catch(() => {});
  }

  async function abrirDetalhePedido(pid) {
    if (pedidoAberto === pid) {
      setPedidoAberto(null);
      setDetalhePedido(null);
      return;
    }
    setPedidoAberto(pid);
    setDetalhePedido(null);
    try {
      setDetalhePedido(await pedirPortal(`/api/portal/pedidos/${pid}`));
    } catch (e) {
      setErro(e.message);
    }
  }

  async function criarPedido(e) {
    e.preventDefault();
    setErro("");
    try {
      const pedido = await pedirPortal("/api/portal/pedidos", {
        method: "POST",
        body: JSON.stringify({
          tipo: novoPedido.tipo,
          itens: novoPedido.itens
            .filter((it) => it.descricao.trim())
            .map((it) => ({
              descricao: it.descricao,
              quantidade: Number(it.quantidade) || 1,
              variacao: it.variacao || null,
              link_produto: it.link_produto || null,
            })),
        }),
      });
      // Anexa as fotos ao pedido recém-criado
      for (const f of novoPedidoFotos) {
        const fd = new FormData();
        fd.append("ficheiro", f);
        fd.append("categoria", "FOTO_PRODUTO");
        fd.append("pedido_id", pedido.id);
        await enviarPortalForm("/api/portal/anexos", fd);
      }
      setNovoPedido({ tipo: "COM_COMPRA", itens: [{ ...ITEM_VAZIO }] });
      setNovoPedidoFotos([]);
      setMostrarNovo(false);
      await carregarDados();
    } catch (erro) {
      setErro(erro.message);
    }
  }

  async function buscarInfoItem(i) {
    const link = novoPedido.itens[i].link_produto?.trim();
    if (!link) return;
    setErro("");
    setABuscarItem(i);
    try {
      const info = await pedirPortal(`/api/portal/scraping?url=${encodeURIComponent(link)}`);
      setPreviewsItem((p) => ({ ...p, [i]: info }));
      if (info.titulo && !novoPedido.itens[i].descricao.trim()) {
        const itens = novoPedido.itens.map((x, idx) => (idx === i ? { ...x, descricao: info.titulo } : x));
        setNovoPedido({ ...novoPedido, itens });
      }
      if (!info.titulo && !info.imagem && !info.preco) {
        setErro("Não foi possível extrair informação deste link.");
      }
    } catch (e) {
      setErro(e.message);
    } finally {
      setABuscarItem(null);
    }
  }

  async function aprovarPedido(pid) {
    setErro("");
    try {
      await pedirPortal(`/api/portal/pedidos/${pid}/aprovar`, { method: "POST" });
      setDetalhePedido(await pedirPortal(`/api/portal/pedidos/${pid}`));
      await carregarDados();
    } catch (erro) {
      setErro(erro.message);
    }
  }

  async function enviarComprovativo(pid, ficheiro) {
    if (!ficheiro) return;
    setErro("");
    try {
      const fd = new FormData();
      fd.append("ficheiro", ficheiro);
      fd.append("pedido_id", pid);
      await enviarPortalForm("/api/portal/anexos", fd);
      setDetalhePedido(await pedirPortal(`/api/portal/pedidos/${pid}`));
    } catch (erro) {
      setErro(erro.message);
    }
  }

  async function abrirFacturaDoc(facturaId) {
    setErro("");
    try {
      setFacturaDoc(await pedirPortal(`/api/portal/facturas/${facturaId}`));
    } catch (erro) {
      setErro(erro.message);
    }
  }

  const [msgComprovativo, setMsgComprovativo] = useState("");
  async function enviarComprovativoFactura(facturaId, ficheiro) {
    if (!ficheiro) return;
    setErro("");
    setMsgComprovativo("");
    try {
      const fd = new FormData();
      fd.append("ficheiro", ficheiro);
      fd.append("factura_id", facturaId);
      await enviarPortalForm("/api/portal/anexos", fd);
      setMsgComprovativo("Comprovativo enviado. A Connex vai validar e confirmar o pagamento.");
    } catch (erro) {
      setErro(erro.message);
    }
  }

  useEffect(() => {
    if (cliente) carregarDados().catch((e) => setErro(e.message));
  }, []);

  async function entrar(e) {
    e.preventDefault();
    setErro("");
    setACarregar(true);
    try {
      const dados = await pedirPortal("/api/portal/login", {
        method: "POST",
        body: JSON.stringify({ telefone, senha }),
      });
      sessionStorage.setItem("token_portal", dados.access_token);
      sessionStorage.setItem("cliente_portal", JSON.stringify(dados.cliente));
      setCliente(dados.cliente);
      await carregarDados();
    } catch (erro) {
      setErro(erro.message);
    } finally {
      setACarregar(false);
    }
  }

  async function registar(e) {
    e.preventDefault();
    setErro("");
    setACarregar(true);
    try {
      const dados = await pedirPortal("/api/portal/registar", {
        method: "POST",
        body: JSON.stringify({ nome, telefone, senha, email: email || null }),
      });
      sessionStorage.setItem("token_portal", dados.access_token);
      sessionStorage.setItem("cliente_portal", JSON.stringify(dados.cliente));
      setCliente(dados.cliente);
      await carregarDados();
    } catch (erro) {
      setErro(erro.message);
    } finally {
      setACarregar(false);
    }
  }

  async function alterarSenha(e) {
    e.preventDefault();
    setMsgSenha(null);
    try {
      await pedirPortal("/api/portal/alterar-senha", {
        method: "POST",
        body: JSON.stringify({ senha_actual: senhaActual, senha_nova: senhaNova }),
      });
      setSenhaActual("");
      setSenhaNova("");
      setMostrarSenha(false);
      setMsgSenha({ tipo: "ok", texto: "Senha alterada com sucesso." });
    } catch (erro) {
      setMsgSenha({ tipo: "erro", texto: erro.message });
    }
  }

  function sair() {
    sessionStorage.removeItem("token_portal");
    sessionStorage.removeItem("cliente_portal");
    setCliente(null);
    setEncomendas([]);
    setFacturas([]);
    setPedidos([]);
    setPedidoAberto(null);
    setDetalhePedido(null);
    setCotacaoDoc(null);
    setFacturaDoc(null);
  }

  if (!cliente) {
    return (
      <div className="min-h-screen bg-[#ececec] flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8 text-neutral-900">
            <h1 className="text-2xl font-bold">Connex Importações</h1>
            <p className="text-neutral-400 text-sm mt-1">Portal do Cliente</p>
          </div>
          <form onSubmit={modoRegisto ? registar : entrar} className="bg-white rounded-2xl shadow-xl p-6 space-y-4">
            <div className="flex rounded-xl bg-neutral-100 p-1 text-sm font-semibold">
              <button
                type="button"
                onClick={() => { setModoRegisto(false); setErro(""); }}
                className={`flex-1 rounded-lg py-1.5 transition ${!modoRegisto ? "bg-white shadow-sm text-neutral-900" : "text-neutral-500"}`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => { setModoRegisto(true); setErro(""); }}
                className={`flex-1 rounded-lg py-1.5 transition ${modoRegisto ? "bg-white shadow-sm text-neutral-900" : "text-neutral-500"}`}
              >
                Criar conta
              </button>
            </div>

            {modoRegisto && (
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Nome completo</label>
                <input
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Telefone</label>
              <input
                required
                inputMode="tel"
                pattern={modoRegisto ? "\\+?[0-9 -]{7,}" : undefined}
                title="7 a 15 dígitos (ex.: +258841234567)."
                placeholder="+2588XXXXXXXX"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
              />
            </div>
            {modoRegisto && (
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">E-mail (opcional)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Senha de acesso</label>
              <input
                type="password"
                required
                minLength={modoRegisto ? 6 : undefined}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
              />
              <p className="text-xs text-neutral-400 mt-1">
                {modoRegisto
                  ? "Escolha uma senha (mín. 6 caracteres) para o seu acesso."
                  : "A senha é a que definiu no registo (ou fornecida pela Connex)."}
              </p>
            </div>
            {erro && <p className="text-sm text-red-600">{erro}</p>}
            <button
              type="submit"
              disabled={aCarregar}
              className="w-full rounded-xl bg-neutral-900 text-white py-2.5 text-sm font-semibold hover:bg-neutral-700 transition active:scale-[0.98] disabled:opacity-50"
            >
              {aCarregar ? "A processar…" : modoRegisto ? "Criar conta e entrar" : "Entrar no portal"}
            </button>
          </form>
          <p className="text-center mt-6 space-x-4">
            <Link to="/rastrear" className="text-neutral-400 text-sm hover:text-neutral-900 underline">
              Rastrear sem conta
            </Link>
            <Link to="/login" className="text-neutral-400 text-sm hover:text-neutral-900 underline">
              Acesso de funcionários
            </Link>
          </p>
        </div>
      </div>
    );
  }

  if (cotacaoDoc) {
    return (
      <div className="min-h-screen bg-[#ececec]">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6 print:hidden">
            <button onClick={() => setCotacaoDoc(null)} className="text-sm text-blue-600 hover:underline">← Voltar</button>
            <button
              onClick={() => window.print()}
              className="rounded-xl bg-neutral-900 text-white px-4 py-2 text-sm font-semibold hover:bg-neutral-700 transition active:scale-[0.98]"
            >
              Imprimir / PDF
            </button>
          </div>
          <CotacaoDocumento pedido={cotacaoDoc} empresa={empresa} />
        </div>
      </div>
    );
  }

  if (facturaDoc) {
    return (
      <div className="min-h-screen bg-[#ececec]">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6 print:hidden">
            <button onClick={() => setFacturaDoc(null)} className="text-sm text-blue-600 hover:underline">← Voltar</button>
            <button
              onClick={() => window.print()}
              className="rounded-xl bg-neutral-900 text-white px-4 py-2 text-sm font-semibold hover:bg-neutral-700 transition active:scale-[0.98]"
            >
              Imprimir / PDF
            </button>
          </div>
          <FacturaDocumento factura={facturaDoc} empresa={empresa} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#ececec]">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-bold">Connex Importações — Portal do Cliente</h1>
            <p className="text-xs text-neutral-400">{cliente.nome} · {cliente.telefone}</p>
          </div>
          <div className="space-x-2">
            <button
              onClick={() => { setMostrarSenha(!mostrarSenha); setMsgSenha(null); }}
              className="rounded-xl bg-neutral-100 hover:bg-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-700 transition active:scale-[0.98]"
            >
              Alterar senha
            </button>
            <button onClick={sair} className="rounded-xl bg-neutral-100 hover:bg-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-700 transition active:scale-[0.98]">
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {erro && <p className="text-red-600 text-sm mb-4">{erro}</p>}
        {msgSenha && (
          <p className={`text-sm mb-4 rounded-xl px-3 py-2 border ${msgSenha.tipo === "ok" ? "text-green-700 bg-green-50 border-green-200" : "text-red-700 bg-red-50 border-red-200"}`}>
            {msgSenha.texto}
          </p>
        )}

        {mostrarSenha && (
          <form onSubmit={alterarSenha} className="bg-white rounded-2xl shadow-sm p-5 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Senha actual</label>
              <input
                required
                type="password"
                value={senhaActual}
                onChange={(e) => setSenhaActual(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Nova senha (mín. 6 caracteres)</label>
              <input
                required
                type="password"
                minLength={6}
                value={senhaNova}
                onChange={(e) => setSenhaNova(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
              />
            </div>
            <div className="flex items-end">
              <button type="submit" className="rounded-xl bg-neutral-900 text-white px-5 py-2 text-sm font-semibold hover:bg-neutral-700 transition active:scale-[0.98]">
                Guardar nova senha
              </button>
            </div>
          </form>
        )}

        {/* Pedidos de importação */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-neutral-900">Os meus pedidos de importação</h2>
          <button
            onClick={() => setMostrarNovo(!mostrarNovo)}
            className="rounded-xl bg-neutral-900 text-white px-4 py-2 text-sm font-semibold hover:bg-neutral-700 transition active:scale-[0.98]"
          >
            {mostrarNovo ? "Cancelar" : "+ Novo pedido"}
          </button>
        </div>

        {mostrarNovo && (
          <form onSubmit={criarPedido} className="bg-white rounded-2xl shadow-sm p-5 mb-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Tipo de pedido</label>
              <select
                value={novoPedido.tipo}
                onChange={(e) => setNovoPedido({ ...novoPedido, tipo: e.target.value })}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
              >
                {Object.entries(TIPOS_PEDIDO).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <p className="text-xs text-neutral-400 mt-1">
                {novoPedido.tipo === "COM_COMPRA"
                  ? "A Connex compra o produto por si e envia uma cotação."
                  : "Já comprou e vai enviar para o armazém da Connex na China."}
              </p>
            </div>

            {novoPedido.itens.map((it, i) => (
              <div key={i} className="border border-neutral-100 rounded-xl p-3 space-y-2">
                <div className="grid grid-cols-12 gap-2">
                  <input
                    placeholder="Descrição do produto *"
                    value={it.descricao}
                    onChange={(e) => {
                      const itens = novoPedido.itens.map((x, idx) => (idx === i ? { ...x, descricao: e.target.value } : x));
                      setNovoPedido({ ...novoPedido, itens });
                    }}
                    className="col-span-6 rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
                  />
                  <input
                    type="number"
                    min="1"
                    value={it.quantidade}
                    onChange={(e) => {
                      const itens = novoPedido.itens.map((x, idx) => (idx === i ? { ...x, quantidade: e.target.value } : x));
                      setNovoPedido({ ...novoPedido, itens });
                    }}
                    className="col-span-2 rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
                  />
                  <input
                    placeholder="Modelo/cor"
                    value={it.variacao}
                    onChange={(e) => {
                      const itens = novoPedido.itens.map((x, idx) => (idx === i ? { ...x, variacao: e.target.value } : x));
                      setNovoPedido({ ...novoPedido, itens });
                    }}
                    className="col-span-3 rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
                  />
                  <button
                    type="button"
                    onClick={() => setNovoPedido({ ...novoPedido, itens: novoPedido.itens.filter((_, idx) => idx !== i) })}
                    disabled={novoPedido.itens.length === 1}
                    className="col-span-1 text-red-500 hover:text-red-700 disabled:opacity-30"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    placeholder="Link do produto (opcional)"
                    value={it.link_produto}
                    onChange={(e) => {
                      const itens = novoPedido.itens.map((x, idx) => (idx === i ? { ...x, link_produto: e.target.value } : x));
                      setNovoPedido({ ...novoPedido, itens });
                    }}
                    className="flex-1 rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
                  />
                  {it.link_produto?.trim() && (
                    <button
                      type="button"
                      onClick={() => buscarInfoItem(i)}
                      disabled={aBuscarItem === i}
                      className="text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 px-3 py-2 hover:bg-blue-100 transition disabled:opacity-50 whitespace-nowrap"
                    >
                      {aBuscarItem === i ? "A buscar…" : "Buscar info"}
                    </button>
                  )}
                </div>
                {previewsItem[i] && (previewsItem[i].imagem || previewsItem[i].preco) && (
                  <div className="flex items-center gap-3">
                    {previewsItem[i].imagem && (
                      <img src={previewsItem[i].imagem} alt="" className="h-12 w-12 object-cover rounded-lg border border-neutral-200" />
                    )}
                    {previewsItem[i].preco && (
                      <span className="text-xs text-neutral-500">Preço detectado: {previewsItem[i].preco} {previewsItem[i].moeda || ""}</span>
                    )}
                  </div>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => setNovoPedido({ ...novoPedido, itens: [...novoPedido.itens, { ...ITEM_VAZIO }] })}
              className="text-sm text-blue-600 hover:underline"
            >
              + Adicionar item
            </button>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Fotos do produto (opcional)</label>
              <input
                type="file"
                multiple
                accept="image/png,image/jpeg,image/webp,application/pdf"
                onChange={(e) => setNovoPedidoFotos(Array.from(e.target.files || []))}
                className="text-sm text-neutral-600 file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-900 file:text-white file:px-3 file:py-1.5 file:text-sm file:font-semibold file:cursor-pointer"
              />
              {novoPedidoFotos.length > 0 && (
                <p className="text-xs text-neutral-400 mt-1">{novoPedidoFotos.length} foto(s) seleccionada(s).</p>
              )}
            </div>

            <div className="flex items-center justify-end">
              <button type="submit" className="rounded-xl bg-green-600 text-white px-5 py-2 text-sm font-semibold hover:bg-green-500 transition active:scale-[0.98]">
                Enviar pedido
              </button>
            </div>
            <p className="text-xs text-neutral-400">As fotos ajudam a Connex a identificar o produto. O comprovativo de pagamento anexa-se depois.</p>
          </form>
        )}

        {pedidos.length === 0 && (
          <p className="text-sm text-neutral-500 bg-white rounded-2xl shadow-sm p-5 mb-10">
            Ainda não tem pedidos. Use “+ Novo pedido” para solicitar uma importação.
          </p>
        )}
        <div className="space-y-3 mb-10">
          {pedidos.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <button
                onClick={() => abrirDetalhePedido(p.id)}
                className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-neutral-50"
              >
                <div>
                  <p className="font-mono font-bold text-neutral-900">{p.codigo}</p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {TIPOS_PEDIDO[p.tipo]} · {formatarData(p.criado_em)}
                    {p.total_estimado_mzn ? ` · estimado ${mzn(p.total_estimado_mzn)}` : ""}
                  </p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-md whitespace-nowrap ${corPedido(p.estado)}`}>
                  {rotuloPedido(p.estado)}
                </span>
              </button>

              {pedidoAberto === p.id && (
                <div className="border-t border-neutral-100 p-4 space-y-4">
                  {!detalhePedido && <p className="text-sm text-neutral-500">A carregar…</p>}
                  {detalhePedido && detalhePedido.id === p.id && (
                    <>
                      <div>
                        <p className="text-sm font-semibold text-neutral-800 mb-1">Itens</p>
                        <ul className="text-sm text-neutral-700 space-y-1">
                          {detalhePedido.itens.map((it) => (
                            <li key={it.id}>{it.quantidade}× {it.descricao}{it.variacao ? ` · ${it.variacao}` : ""}</li>
                          ))}
                        </ul>
                      </div>

                      {detalhePedido.preco_produto_mzn != null && (
                        <div className="rounded-xl bg-neutral-50 border border-neutral-200 px-4 py-3 text-sm">
                          <p className="font-semibold text-neutral-800 mb-1">Cotação</p>
                          <div className="flex justify-between"><span className="text-neutral-600">Produto</span><span>{mzn(detalhePedido.preco_produto_mzn)}</span></div>
                          <div className="flex justify-between"><span className="text-neutral-600">Serviço de compra</span><span>{mzn(detalhePedido.servico_compra_mzn)}</span></div>
                          <div className="flex justify-between"><span className="text-neutral-600">Transporte (estimativa)</span><span>{mzn(detalhePedido.estimativa_transporte_mzn)}</span></div>
                          <div className="flex justify-between font-semibold border-t border-neutral-200 mt-1 pt-1"><span>A pagar agora</span><span>{mzn(detalhePedido.total_pagar_agora_mzn)}</span></div>
                          {detalhePedido.cotacao_observacoes && <p className="text-xs text-neutral-500 mt-1">{detalhePedido.cotacao_observacoes}</p>}
                          <p className="text-xs text-neutral-400 mt-1">O transporte é confirmado após a pesagem no armazém.</p>
                        </div>
                      )}

                      {detalhePedido.preco_produto_mzn != null && (
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => setCotacaoDoc(detalhePedido)}
                            className="rounded-xl bg-neutral-100 text-neutral-800 px-4 py-2 text-sm font-semibold hover:bg-neutral-200 transition active:scale-[0.98]"
                          >
                            Descarregar cotação (PDF)
                          </button>
                          {detalhePedido.estado === "COTACAO_ENVIADA" && (
                            <button onClick={() => aprovarPedido(p.id)} className="flex-1 rounded-xl bg-indigo-600 text-white px-4 py-2 text-sm font-semibold hover:bg-indigo-500 transition active:scale-[0.98]">
                              Aprovar cotação
                            </button>
                          )}
                        </div>
                      )}

                      {/* Anexos visíveis */}
                      {detalhePedido.anexos.length > 0 && (
                        <div>
                          <p className="text-sm font-semibold text-neutral-800 mb-1">Documentos</p>
                          <div className="space-y-1">
                            {detalhePedido.anexos.map((a) => (
                              <button key={a.id} onClick={() => descarregarPortal(a)} className="block text-sm text-blue-600 hover:underline">
                                {a.nome_original} <span className="text-xs text-neutral-400">({CATEGORIAS_ANEXO[a.categoria] ?? a.categoria})</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Carregar comprovativo */}
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">Enviar comprovativo de pagamento</label>
                        <input
                          type="file"
                          accept="application/pdf,image/png,image/jpeg,image/webp"
                          onChange={(ev) => enviarComprovativo(p.id, ev.target.files?.[0])}
                          className="text-sm text-neutral-600 file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-900 file:text-white file:px-3 file:py-1.5 file:text-sm file:font-semibold file:cursor-pointer"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <h2 className="text-xl font-bold text-neutral-900 mb-4">As minhas encomendas</h2>
        {encomendas.length === 0 && (
          <p className="text-sm text-neutral-500 bg-white rounded-2xl shadow-sm p-5">
            Ainda não tem encomendas registadas.
          </p>
        )}
        <div className="space-y-3">
          {encomendas.map((enc) => (
            <div key={enc.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <button
                onClick={() => setExpandida(expandida === enc.id ? null : enc.id)}
                className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-neutral-50"
              >
                <div>
                  <p className="font-mono font-bold text-neutral-900">{enc.codigo_rastreio}</p>
                  <p className="text-sm text-neutral-500">{enc.descricao}</p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Registada em {formatarData(enc.data_registo)}
                    {enc.previsao_chegada && ` · Previsão de chegada: ${enc.previsao_chegada}`}
                  </p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-md whitespace-nowrap ${corEstado(enc.estado)}`}>
                  {rotuloEstado(enc.estado)}
                </span>
              </button>
              {expandida === enc.id && (
                <div className="border-t border-neutral-100 p-4">
                  <ol className="relative border-l border-neutral-200 ml-2 space-y-4">
                    {[...enc.eventos].reverse().map((ev) => (
                      <li key={ev.id} className="ml-4">
                        <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-green-500" />
                        <p className="text-sm font-medium text-neutral-900">{rotuloEstado(ev.estado)}</p>
                        {ev.descricao && <p className="text-sm text-neutral-600">{ev.descricao}</p>}
                        <p className="text-xs text-neutral-400">
                          {formatarData(ev.data_evento)}
                          {ev.localizacao && ` · ${ev.localizacao}`}
                        </p>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          ))}
        </div>

        <h2 className="text-xl font-bold text-neutral-900 mt-10 mb-4">As minhas facturas</h2>
        {msgComprovativo && (
          <p className="text-sm mb-3 rounded-xl px-3 py-2 border text-green-700 bg-green-50 border-green-200">{msgComprovativo}</p>
        )}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-neutral-400 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Número</th>
                <th className="px-4 py-3 font-medium">Valor (MZN)</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Emitida em</th>
                <th className="px-4 py-3 font-medium">Pagamento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {facturas.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-neutral-500">Sem facturas.</td></tr>
              )}
              {facturas.map((f) => (
                <tr key={f.id}>
                  <td className="px-4 py-3 font-mono font-semibold text-neutral-900">{f.numero}</td>
                  <td className="px-4 py-3">{Number(f.valor_total).toLocaleString("pt-PT", { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-md ${CORES_FACTURA[f.estado]}`}>
                      {f.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-500">{formatarData(f.data_emissao)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <button onClick={() => abrirFacturaDoc(f.id)} className="text-xs text-blue-600 hover:underline">
                        Imprimir
                      </button>
                      {f.estado === "PENDENTE" && (
                        <label className="text-xs text-blue-600 hover:underline cursor-pointer">
                          Enviar comprovativo
                          <input
                            type="file"
                            accept="application/pdf,image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={(ev) => enviarComprovativoFactura(f.id, ev.target.files?.[0])}
                          />
                        </label>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-neutral-400 mt-2">
          O pagamento é confirmado pela Connex após validação do comprovativo.
        </p>
      </main>
    </div>
  );
}
