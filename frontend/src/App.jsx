import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Clientes from "./pages/Clientes";
import ClienteDetalhe from "./pages/ClienteDetalhe";
import FacturaDetalhe from "./pages/FacturaDetalhe";
import Pedidos from "./pages/Pedidos";
import PedidoDetalhe from "./pages/PedidoDetalhe";
import CotacaoPedido from "./pages/CotacaoPedido";
import Encomendas from "./pages/Encomendas";
import EncomendaDetalhe from "./pages/EncomendaDetalhe";
import Facturas from "./pages/Facturas";
import TrackingPublico from "./pages/TrackingPublico";
import PortalCliente from "./pages/PortalCliente";
import Utilizadores from "./pages/Utilizadores";
import Configuracao from "./pages/Configuracao";
import Fiscal from "./pages/Fiscal";
import DeclaracaoISPC from "./pages/DeclaracaoISPC";

function RotaProtegida({ children }) {
  const { utilizador } = useAuth();
  return utilizador ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/rastrear" element={<TrackingPublico />} />
          <Route path="/portal" element={<PortalCliente />} />
          <Route
            element={
              <RotaProtegida>
                <Layout />
              </RotaProtegida>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/pedidos" element={<Pedidos />} />
            <Route path="/pedidos/:id" element={<PedidoDetalhe />} />
            <Route path="/pedidos/:id/cotacao" element={<CotacaoPedido />} />
            <Route path="/encomendas" element={<Encomendas />} />
            <Route path="/encomendas/:id" element={<EncomendaDetalhe />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/clientes/:id" element={<ClienteDetalhe />} />
            <Route path="/facturas" element={<Facturas />} />
            <Route path="/facturas/:id" element={<FacturaDetalhe />} />
            <Route path="/utilizadores" element={<Utilizadores />} />
            <Route path="/configuracao" element={<Configuracao />} />
            <Route path="/fiscal" element={<Fiscal />} />
            <Route path="/fiscal/declaracao/:ano/:trimestre" element={<DeclaracaoISPC />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
