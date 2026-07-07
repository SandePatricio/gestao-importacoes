// Cliente HTTP central: anexa o token JWT e normaliza erros da API.

function token() {
  return localStorage.getItem("token");
}

async function request(method, url, body, isForm = false) {
  const headers = {};
  if (token()) headers["Authorization"] = `Bearer ${token()}`;
  if (body && !isForm) headers["Content-Type"] = "application/json";

  const resposta = await fetch(url, {
    method,
    headers,
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  });

  if (resposta.status === 401 && !url.includes("/auth/login")) {
    localStorage.clear();
    window.location.href = "/login";
    return;
  }

  const dados = await resposta.json().catch(() => null);
  if (!resposta.ok) {
    throw new Error(dados?.detail || "Ocorreu um erro inesperado");
  }
  return dados;
}

export const api = {
  get: (url) => request("GET", url),
  post: (url, body) => request("POST", url, body),
  put: (url, body) => request("PUT", url, body),
  del: (url) => request("DELETE", url),
  postForm: (url, formData) => request("POST", url, formData, true),

  login: (email, senha) => {
    const form = new URLSearchParams({ username: email, password: senha });
    return request("POST", "/api/auth/login", form, true);
  },
};
