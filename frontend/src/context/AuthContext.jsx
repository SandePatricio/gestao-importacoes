import { createContext, useContext, useState } from "react";
import { api } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [utilizador, setUtilizador] = useState(() => {
    const guardado = localStorage.getItem("utilizador");
    return guardado ? JSON.parse(guardado) : null;
  });

  async function login(email, senha) {
    const dados = await api.login(email, senha);
    localStorage.setItem("token", dados.access_token);
    localStorage.setItem("utilizador", JSON.stringify(dados.utilizador));
    setUtilizador(dados.utilizador);
  }

  function logout() {
    localStorage.clear();
    setUtilizador(null);
  }

  return (
    <AuthContext.Provider value={{ utilizador, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
