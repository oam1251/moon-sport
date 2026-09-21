import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { IoSettingsOutline } from 'react-icons/io5';
import { AuthProvider, useAuth } from './context/AuthContext';
import { isSupabaseConfigured } from './lib/supabaseClient';
import BottomNav from './components/BottomNav';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import ProductForm from './pages/ProductForm';
import Purchases from './pages/Purchases';
import NewPurchase from './pages/NewPurchase';
import Sales from './pages/Sales';
import NewSale from './pages/NewSale';
import Layaways from './pages/Layaways';
import LayawayDetail from './pages/LayawayDetail';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Customers from './pages/Customers';
import CustomerForm from './pages/CustomerForm';

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}

function Gate() {
  const { session, loading } = useAuth();

  // Sin Supabase configurado, la app entra directo con datos de ejemplo
  // (ver src/api/mockStore.ts) — no tiene caso pedir login.
  if (isSupabaseConfigured) {
    if (loading) {
      return (
        <div className="loading-screen">
          <div className="spinner" />
          <span>Preparando Moon Sport…</span>
        </div>
      );
    }

    if (!session) {
      return <Login />;
    }
  }

  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}

function AppShell() {
  const location = useLocation();
  const showSettingsButton = location.pathname === '/';

  return (
    <div className="app-shell">
      {showSettingsButton && (
        <Link
          to="/ajustes"
          aria-label="Ajustes"
          style={{
            position: 'fixed',
            top: 16,
            right: 'max(16px, calc((100vw - 720px) / 2 + 16px))',
            zIndex: 10,
            color: 'var(--text-secondary)',
            fontSize: 22,
            display: 'flex',
          }}
        >
          <IoSettingsOutline />
        </Link>
      )}
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/inventario" element={<Inventory />} />
        <Route path="/inventario/nuevo" element={<ProductForm />} />
        <Route path="/inventario/compras" element={<Purchases />} />
        <Route path="/inventario/compras/nueva" element={<NewPurchase />} />
        <Route path="/inventario/:id" element={<ProductForm />} />
        <Route path="/ventas" element={<Sales />} />
        <Route path="/ventas/nueva" element={<NewSale />} />
        <Route path="/ventas/apartados" element={<Layaways />} />
        <Route path="/ventas/apartados/:id" element={<LayawayDetail />} />
        <Route path="/reportes" element={<Reports />} />
        <Route path="/ajustes" element={<Settings />} />
        <Route path="/ajustes/clientes" element={<Customers />} />
        <Route path="/ajustes/clientes/nuevo" element={<CustomerForm />} />
        <Route path="/ajustes/clientes/:id" element={<CustomerForm />} />
      </Routes>
      <BottomNav />
    </div>
  );
}
