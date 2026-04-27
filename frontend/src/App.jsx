import { Routes, Route, Link, NavLink, Navigate, useLocation } from 'react-router-dom';
import Catalog from './pages/Catalog.jsx';
import ProductDetail from './pages/ProductDetail.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Cart from './pages/Cart.jsx';
import Checkout from './pages/Checkout.jsx';
import Orders from './pages/Orders.jsx';
import { useAuth } from './context/AuthContext.jsx';
import { useCart } from './context/CartContext.jsx';

// Route protégée : redirige vers /login si non connecté (et mémorise d'où on venait)
function RequireAuth({ children }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}

export default function App() {
  const { user, isAuthenticated, logout } = useAuth();
  const { totalItems } = useCart();

  return (
    <div className="app">
      <header className="header">
        <Link to="/" className="logo">
          <span className="logo-mark">◐</span>
          <span className="logo-text">Maison Ora</span>
        </Link>

        <nav className="nav">
          <NavLink to="/" end className={({ isActive }) => 'nav-link' + (isActive ? ' is-active' : '')}>
            Catalogue
          </NavLink>

          {isAuthenticated ? (
            <>
              <NavLink to="/orders" className={({ isActive }) => 'nav-link' + (isActive ? ' is-active' : '')}>
                Mes commandes
              </NavLink>
              <span className="nav-user">Bonjour, <em>{user.name}</em></span>
              <button type="button" onClick={logout} className="nav-link nav-link--btn">
                Déconnexion
              </button>
            </>
          ) : (
            <NavLink to="/login" className={({ isActive }) => 'nav-link' + (isActive ? ' is-active' : '')}>
              Connexion
            </NavLink>
          )}

          <NavLink to="/cart" className={({ isActive }) => 'nav-link nav-link--cart' + (isActive ? ' is-active' : '')}>
            Panier <sup className="cart-count">{totalItems}</sup>
          </NavLink>
        </nav>
      </header>

      <main className="main">
        <Routes>
          <Route path="/" element={<Catalog />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={
            <RequireAuth><Checkout /></RequireAuth>
          } />
          <Route path="/orders" element={
            <RequireAuth><Orders /></RequireAuth>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <footer className="footer">
        <div className="footer-row">
          <span>© 2026 Maison Ora</span>
        </div>
      </footer>
    </div>
  );
}
