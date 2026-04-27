import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Cart() {
  const { items, updateQuantity, removeItem, totalPrice, clear } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  function goToCheckout() {
    if (!isAuthenticated) {
      // On renvoie vers /login en mémorisant qu'on veut ensuite aller en /checkout
      navigate('/login', { state: { from: { pathname: '/checkout' } } });
    } else {
      navigate('/checkout');
    }
  }

  if (items.length === 0) {
    return (
      <section className="cart-page">
        <span className="eyebrow">Panier</span>
        <h1 className="display display--md">Votre panier est <em>vide.</em></h1>
        <p className="lede">Découvrez la collection et ajoutez quelques pièces.</p>
        <Link to="/" className="link-back">← Voir le catalogue</Link>
      </section>
    );
  }

  return (
    <section className="cart-page">
      <span className="eyebrow">Panier</span>
      <h1 className="display display--md">Votre <em>sélection.</em></h1>

      <div className="cart-grid">
        <ul className="cart-lines">
          {items.map((item) => (
            <li key={item.productId} className="cart-line">
              <div className={`cart-thumb visual--${item.productId}`}>
                <span className="visual-index">{String(item.productId).padStart(2, '0')}</span>
              </div>

              <div className="cart-info">
                <Link to={`/products/${item.productId}`} className="cart-name">
                  {item.name}
                </Link>
                <span className="cart-unit">{item.price.toFixed(2)} € / pièce</span>
              </div>

              <div className="cart-qty">
                <button
                  type="button"
                  className="qty-btn"
                  onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                  aria-label="Diminuer la quantité"
                >−</button>
                <span className="qty-value">{item.quantity}</span>
                <button
                  type="button"
                  className="qty-btn"
                  onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                  aria-label="Augmenter la quantité"
                >+</button>
              </div>

              <div className="cart-line-total">
                {(item.price * item.quantity).toFixed(2)} €
              </div>

              <button
                type="button"
                className="cart-remove"
                onClick={() => removeItem(item.productId)}
                aria-label="Retirer du panier"
              >×</button>
            </li>
          ))}
        </ul>

        <aside className="cart-summary">
          <h2 className="summary-title">Récapitulatif</h2>
          <div className="summary-row">
            <span>Sous-total</span>
            <span className="summary-price">{totalPrice.toFixed(2)} €</span>
          </div>
          <div className="summary-row summary-row--muted">
            <span>Livraison</span>
            <span>Offerte</span>
          </div>
          <div className="summary-row summary-row--total">
            <span>Total</span>
            <span className="summary-price summary-price--big">{totalPrice.toFixed(2)} €</span>
          </div>

          <button type="button" className="btn-primary btn-primary--full" onClick={goToCheckout}>
            Passer la commande
            {!isAuthenticated && (
              <em className="btn-note">Vous allez être invité à vous connecter</em>
            )}
          </button>

          <button type="button" className="btn-ghost" onClick={clear}>
            Vider le panier
          </button>
        </aside>
      </div>
    </section>
  );
}
